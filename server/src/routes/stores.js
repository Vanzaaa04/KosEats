const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/stores — Create store (buyer upgrading to seller)
router.post('/', authenticate, async (req, res, next) => {
  try {
    // Check if user already has a store
    const existingStore = await prisma.store.findUnique({ where: { userId: req.user.id } });
    if (existingStore) {
      return res.status(400).json({ success: false, message: 'Anda sudah memiliki toko.' });
    }

    const { name, description, address, photoUrl, latitude, longitude, openTime, closeTime, deliveryRadiusKm } = req.body;

    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Nama toko, alamat, dan koordinat wajib diisi.' });
    }

    const store = await prisma.store.create({
      data: {
        userId: req.user.id,
        name,
        description: description || null,
        address,
        photoUrl: photoUrl || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        openTime: openTime || '08:00',
        closeTime: closeTime || '20:00',
        deliveryRadiusKm: deliveryRadiusKm ? parseFloat(deliveryRadiusKm) : 1.0,
        status: 'PENDING'
      }
    });

    // Upgrade user role to SELLER
    if (req.user.role === 'BUYER') {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { role: 'SELLER' }
      });
    }

    // Notify admin
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    await prisma.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        title: 'Pendaftaran Mitra Baru 🏪',
        message: `${req.user.name} mendaftarkan toko "${name}". Silakan review dan approve.`,
        type: 'SYSTEM'
      }))
    });

    res.status(201).json({
      success: true,
      message: 'Toko berhasil didaftarkan! Menunggu persetujuan admin.',
      data: store
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stores — List stores (for buyers, only approved & open)
router.get('/', async (req, res, next) => {
  try {
    const { lat, lng, category, search } = req.query;

    const where = {
      status: 'APPROVED',
      isOpen: true
    };

    const stores = await prisma.store.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true } },
        menus: {
          where: { isAvailable: true, isDeleted: false },
          include: { nutrition: true, discounts: { where: { isActive: true } } },
          orderBy: { createdAt: 'desc' }
        },
        reviews: { select: { rating: true } },
        _count: { select: { orders: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average rating and distance for each store
    const storesWithMeta = stores.map(store => {
      const avgRating = store.reviews.length > 0
        ? (store.reviews.reduce((sum, r) => sum + r.rating, 0) / store.reviews.length).toFixed(1)
        : null;

      let distance = null;
      if (lat && lng) {
        distance = calculateDistance(
          parseFloat(lat), parseFloat(lng),
          store.latitude, store.longitude
        );
      }

      return {
        ...store,
        avgRating: avgRating ? parseFloat(avgRating) : null,
        reviewCount: store.reviews.length,
        distance,
        reviews: undefined // don't expose individual reviews in list
      };
    });

    // Sort by distance if coordinates provided
    if (lat && lng) {
      storesWithMeta.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }

    res.json({ success: true, data: storesWithMeta });
  } catch (error) {
    next(error);
  }
});

// GET /api/stores/:id — Get store detail
router.get('/:id', async (req, res, next) => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { name: true, phone: true } },
        menus: {
          where: { isAvailable: true, isDeleted: false },
          include: {
            nutrition: true,
            discounts: { where: { isActive: true } }
          }
        },
        reviews: {
          include: { buyer: { select: { name: true, photoUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        _count: { select: { orders: true, reviews: true } }
      }
    });

    if (!store) {
      return res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
    }

    const avgRating = store.reviews.length > 0
      ? (store.reviews.reduce((sum, r) => sum + r.rating, 0) / store.reviews.length).toFixed(1)
      : null;

    res.json({
      success: true,
      data: { ...store, avgRating: avgRating ? parseFloat(avgRating) : null }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/stores/my — Update own store settings (seller)
router.put('/my', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    if (!req.user.store) {
      return res.status(404).json({ success: false, message: 'Anda belum memiliki toko.' });
    }

    const { name, description, address, photoUrl, latitude, longitude, openTime, closeTime, deliveryRadiusKm, isOpen, gopayNumber, danaNumber } = req.body;

    if (gopayNumber && !gopayNumber.startsWith('08')) return res.status(400).json({ success: false, message: 'Nomor GoPay harus diawali dengan 08' });
    if (danaNumber && !danaNumber.startsWith('08')) return res.status(400).json({ success: false, message: 'Nomor DANA harus diawali dengan 08' });

    const updated = await prisma.store.update({
      where: { id: req.user.store.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(address && { address }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
        ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
        ...(openTime && { openTime }),
        ...(closeTime && { closeTime }),
        ...(deliveryRadiusKm !== undefined && { deliveryRadiusKm: parseFloat(deliveryRadiusKm) }),
        ...(isOpen !== undefined && { isOpen }),
        ...(gopayNumber !== undefined && { gopayNumber }),
        ...(danaNumber !== undefined && { danaNumber })
      }
    });

    res.json({ success: true, message: 'Pengaturan toko berhasil diperbarui.', data: updated });
  } catch (error) {
    next(error);
  }
});

// Helper: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1000) / 1000; // in km, rounded to meters
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = router;
