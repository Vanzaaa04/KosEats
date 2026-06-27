const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/profile — Update own profile
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, phone, address, latitude, longitude, photoUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
        ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
        ...(photoUrl !== undefined && { photoUrl })
      }
    });

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        phone: updated.phone,
        address: updated.address,
        latitude: updated.latitude,
        longitude: updated.longitude,
        photoUrl: updated.photoUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/profile — Soft delete account
router.delete('/profile', authenticate, async (req, res, next) => {
  try {
    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: req.user.id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Akun berhasil dihapus (dinonaktifkan).'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/password — Change password
router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Validate old password
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Password lama salah.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash }
    });

    res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (error) {
    next(error);
  }
});

// ================= FAVORITES =================

// GET /api/users/favorites — Get all favorite stores
router.get('/favorites', authenticate, async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { buyerId: req.user.id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            description: true,
            photoUrl: true,
            isOpen: true,
            status: true
          }
        }
      }
    });
    res.json({ success: true, data: favorites });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/favorites — Add a store to favorites
router.post('/favorites', authenticate, async (req, res, next) => {
  try {
    const { storeId } = req.body;
    if (!storeId) return res.status(400).json({ success: false, message: 'storeId diperlukan.' });

    const existing = await prisma.favorite.findUnique({
      where: { buyerId_storeId: { buyerId: req.user.id, storeId: parseInt(storeId) } }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Toko ini sudah ada di favorit.' });
    }

    const favorite = await prisma.favorite.create({
      data: {
        buyerId: req.user.id,
        storeId: parseInt(storeId)
      }
    });

    res.status(201).json({ success: true, message: 'Berhasil ditambahkan ke favorit.', data: favorite });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/favorites/:storeId — Remove a store from favorites
router.delete('/favorites/:storeId', authenticate, async (req, res, next) => {
  try {
    const { storeId } = req.params;

    await prisma.favorite.delete({
      where: { buyerId_storeId: { buyerId: req.user.id, storeId: parseInt(storeId) } }
    });

    res.json({ success: true, message: 'Berhasil dihapus dari favorit.' });
  } catch (error) {
    // If not found, prisma throws an error, we catch it or ignore
    next(error);
  }
});

module.exports = router;
