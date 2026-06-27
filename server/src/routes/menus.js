const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/menus — Create menu (seller only)
router.post('/', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    if (!req.user.store || req.user.store.status !== 'APPROVED') {
      return res.status(403).json({ success: false, message: 'Toko belum disetujui admin.' });
    }

    const { name, description, photoUrl, price, dailyStock, category, nutrition } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ success: false, message: 'Nama, harga, dan kategori wajib diisi.' });
    }

    const menu = await prisma.menu.create({
      data: {
        storeId: req.user.store.id,
        name,
        description: description || null,
        photoUrl: photoUrl || null,
        price: parseInt(price),
        dailyStock: dailyStock ? parseInt(dailyStock) : 0,
        category,
        nutrition: nutrition ? {
          create: {
            calories: nutrition.calories ? parseInt(nutrition.calories) : null,
            proteinG: nutrition.proteinG ? parseFloat(nutrition.proteinG) : null,
            carbsG: nutrition.carbsG ? parseFloat(nutrition.carbsG) : null,
            fatG: nutrition.fatG ? parseFloat(nutrition.fatG) : null,
            ingredients: nutrition.ingredients || null
          }
        } : undefined
      },
      include: { nutrition: true }
    });

    res.status(201).json({ success: true, message: 'Menu berhasil ditambahkan!', data: menu });
  } catch (error) {
    next(error);
  }
});

// GET /api/menus/my — List all menus for current seller (no filter isOpen/APPROVED)
router.get('/my', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    if (!req.user.store) {
      return res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
    }

    const menus = await prisma.menu.findMany({
      where: { storeId: req.user.store.id, isDeleted: false },
      include: { nutrition: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: menus });
  } catch (error) {
    next(error);
  }
});

// PUT /api/menus/:id — Update menu (seller only)
router.put('/:id', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const { name, description, photoUrl, price, dailyStock, category, nutrition } = req.body;
    const menuId = parseInt(req.params.id);

    const existingMenu = await prisma.menu.findUnique({ where: { id: menuId } });
    if (!existingMenu || existingMenu.storeId !== req.user.store?.id) {
      return res.status(403).json({ success: false, message: 'Menu tidak ditemukan atau bukan milik Anda.' });
    }

    const updatedMenu = await prisma.menu.update({
      where: { id: menuId },
      data: {
        name,
        description: description || null,
        photoUrl: photoUrl || null,
        price: parseInt(price),
        dailyStock: dailyStock ? parseInt(dailyStock) : 0,
        category,
        nutrition: nutrition ? {
          upsert: {
            create: {
              calories: nutrition.calories ? parseInt(nutrition.calories) : null,
              proteinG: nutrition.proteinG ? parseFloat(nutrition.proteinG) : null,
              carbsG: nutrition.carbsG ? parseFloat(nutrition.carbsG) : null,
              fatG: nutrition.fatG ? parseFloat(nutrition.fatG) : null,
              ingredients: nutrition.ingredients || null
            },
            update: {
              calories: nutrition.calories ? parseInt(nutrition.calories) : null,
              proteinG: nutrition.proteinG ? parseFloat(nutrition.proteinG) : null,
              carbsG: nutrition.carbsG ? parseFloat(nutrition.carbsG) : null,
              fatG: nutrition.fatG ? parseFloat(nutrition.fatG) : null,
              ingredients: nutrition.ingredients || null
            }
          }
        } : {
          delete: existingMenu.nutrition ? true : false
        }
      },
      include: { nutrition: true }
    });

    res.json({ success: true, message: 'Menu berhasil diupdate!', data: updatedMenu });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/menus/:id — Delete menu (soft delete or hard delete)
router.delete('/:id', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const menuId = parseInt(req.params.id);
    const existingMenu = await prisma.menu.findUnique({ where: { id: menuId } });
    if (!existingMenu || existingMenu.storeId !== req.user.store?.id) {
      return res.status(403).json({ success: false, message: 'Menu tidak ditemukan atau bukan milik Anda.' });
    }

    // Since we have orderItems linking to it, we might want to just set isAvailable = false or hard delete if possible.
    // For simplicity, we'll try to hard delete. If it fails due to foreign key, we can catch and soft delete.
    try {
      await prisma.menu.delete({ where: { id: menuId } });
      res.json({ success: true, message: 'Menu berhasil dihapus!' });
    } catch (e) {
      // Soft delete fallback
      await prisma.menu.update({
        where: { id: menuId },
        data: { isDeleted: true, isAvailable: false, dailyStock: 0 }
      });
      res.json({ success: true, message: 'Menu disembunyikan dan dihapus dari daftar Anda (karena ada riwayat pesanan yang terkait).' });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/menus/seller/dashboard — Real dashboard data for seller
router.get('/seller/dashboard', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    if (!req.user.store) {
      return res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
    }

    const storeId = req.user.store.id;

    // Pendapatan bulan ini (total - platformFee = bersih)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthOrders = await prisma.order.findMany({
      where: {
        storeId,
        paymentStatus: 'PAID',
        createdAt: { gte: startOfMonth }
      },
      select: { total: true, platformFee: true, status: true, createdAt: true }
    });

    const totalRevenue = monthOrders.reduce((sum, o) => sum + (o.total - o.platformFee), 0);
    const completedOrders = monthOrders.filter(o => o.status === 'DELIVERED').length;
    
    // Pesanan hari ini
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders = await prisma.order.count({
      where: { storeId, createdAt: { gte: startOfDay } }
    });

    // Pending orders
    const pendingOrders = await prisma.order.count({
      where: { storeId, status: { in: ['PENDING', 'CONFIRMED', 'COOKING'] } }
    });

    // Rating rata-rata
    const ratingResult = await prisma.review.aggregate({
      where: { storeId },
      _avg: { rating: true },
      _count: true
    });
    const avgRating = ratingResult._avg.rating ? parseFloat(ratingResult._avg.rating.toFixed(1)) : 0;

    // Menu terlaris
    const topMenus = await prisma.orderItem.groupBy({
      by: ['menuId'],
      where: { order: { storeId, paymentStatus: 'PAID' } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const topMenuDetails = await Promise.all(
      topMenus.map(async (item) => {
        const menu = await prisma.menu.findUnique({ where: { id: item.menuId }, select: { name: true } });
        return { name: menu?.name || 'Menu dihapus', totalSold: item._sum.quantity };
      })
    );

    res.json({
      success: true,
      data: {
        totalRevenue,
        completedOrders,
        avgRating,
        totalReviews: ratingResult._count,
        todayOrders,
        pendingOrders,
        topMenus: topMenuDetails
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/menus/seller/finance — Saldo & Komisi data
router.get('/seller/finance', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    if (!req.user.store) {
      return res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
    }

    const storeId = req.user.store.id;

    // Semua order yang sudah PAID
    const paidOrders = await prisma.order.findMany({
      where: { storeId, paymentStatus: 'PAID' },
      select: {
        id: true, total: true, platformFee: true, status: true, createdAt: true,
        buyer: { select: { name: true } },
        items: { select: { quantity: true, subtotal: true, menu: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalGross = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const totalCommission = paidOrders.reduce((sum, o) => sum + o.platformFee, 0);
    const totalNet = totalGross - totalCommission;

    // Per bulan breakdown
    const monthlyBreakdown = {};
    paidOrders.forEach(o => {
      const key = o.createdAt.toISOString().slice(0, 7); // "2026-06"
      if (!monthlyBreakdown[key]) {
        monthlyBreakdown[key] = { month: key, gross: 0, commission: 0, net: 0, orders: 0 };
      }
      monthlyBreakdown[key].gross += o.total;
      monthlyBreakdown[key].commission += o.platformFee;
      monthlyBreakdown[key].net += (o.total - o.platformFee);
      monthlyBreakdown[key].orders++;
    });

    res.json({
      success: true,
      data: {
        totalGross,
        totalCommission,
        totalNet,
        totalOrders: paidOrders.length,
        recentOrders: paidOrders.slice(0, 20),
        monthlyBreakdown: Object.values(monthlyBreakdown)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/menus — List all available menus (public)
router.get('/', async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, hasNutrition, lat, lng } = req.query;

    const where = {
      isAvailable: true,
      store: { status: 'APPROVED', isOpen: true }
    };

    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (minPrice) where.price = { ...where.price, gte: parseInt(minPrice) };
    if (maxPrice) where.price = { ...where.price, lte: parseInt(maxPrice) };
    if (hasNutrition === 'true') where.nutrition = { isNot: null };

    const menus = await prisma.menu.findMany({
      where,
      include: {
        nutrition: true,
        store: {
          select: {
            id: true, name: true, latitude: true, longitude: true,
            isOpen: true, openTime: true, closeTime: true,
            reviews: { select: { rating: true } }
          }
        },
        discounts: {
          where: {
            isActive: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add computed fields
    const menusWithMeta = menus.map(menu => {
      const reviews = menu.store.reviews || [];
      const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

      // Active discount (first valid one)
      const activeDiscount = menu.discounts.find(d =>
        d.isActive && d.quotaUsed < d.quotaTotal && d.type === 'FOOD'
      );

      return {
        ...menu,
        hasNutritionInfo: !!menu.nutrition,
        storeRating: avgRating ? parseFloat(avgRating) : null,
        activeDiscount: activeDiscount ? {
          id: activeDiscount.id,
          amount: activeDiscount.amount,
          source: activeDiscount.source,
          quotaRemaining: activeDiscount.quotaTotal - activeDiscount.quotaUsed
        } : null,
        finalPrice: activeDiscount
          ? Math.max(0, menu.price - activeDiscount.amount)
          : menu.price,
        discounts: undefined
      };
    });

    res.json({ success: true, data: menusWithMeta });
  } catch (error) {
    next(error);
  }
});

// GET /api/menus/:id — Get menu detail
router.get('/:id', async (req, res, next) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        nutrition: true,
        store: {
          include: {
            user: { select: { name: true, phone: true } },
            reviews: {
              include: { buyer: { select: { name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        },
        discounts: { where: { isActive: true } }
      }
    });

    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu tidak ditemukan.' });
    }

    res.json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
});

// PUT /api/menus/:id — Update menu (seller only, own menu)
router.put('/:id', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const menu = await prisma.menu.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!menu || menu.storeId !== req.user.store?.id) {
      return res.status(403).json({ success: false, message: 'Menu tidak ditemukan atau bukan milik Anda.' });
    }

    const { name, description, photoUrl, price, dailyStock, category, isAvailable, nutrition } = req.body;

    const updated = await prisma.menu.update({
      where: { id: menu.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(price !== undefined && { price: parseInt(price) }),
        ...(dailyStock !== undefined && { dailyStock: parseInt(dailyStock) }),
        ...(category && { category }),
        ...(isAvailable !== undefined && { isAvailable })
      },
      include: { nutrition: true }
    });

    // Update or create nutrition if provided
    if (nutrition) {
      await prisma.nutrition.upsert({
        where: { menuId: menu.id },
        create: {
          menuId: menu.id,
          calories: nutrition.calories ? parseInt(nutrition.calories) : null,
          proteinG: nutrition.proteinG ? parseFloat(nutrition.proteinG) : null,
          carbsG: nutrition.carbsG ? parseFloat(nutrition.carbsG) : null,
          fatG: nutrition.fatG ? parseFloat(nutrition.fatG) : null,
          ingredients: nutrition.ingredients || null
        },
        update: {
          ...(nutrition.calories !== undefined && { calories: nutrition.calories ? parseInt(nutrition.calories) : null }),
          ...(nutrition.proteinG !== undefined && { proteinG: nutrition.proteinG ? parseFloat(nutrition.proteinG) : null }),
          ...(nutrition.carbsG !== undefined && { carbsG: nutrition.carbsG ? parseFloat(nutrition.carbsG) : null }),
          ...(nutrition.fatG !== undefined && { fatG: nutrition.fatG ? parseFloat(nutrition.fatG) : null }),
          ...(nutrition.ingredients !== undefined && { ingredients: nutrition.ingredients || null })
        }
      });
    }

    const result = await prisma.menu.findUnique({
      where: { id: menu.id },
      include: { nutrition: true }
    });

    res.json({ success: true, message: 'Menu berhasil diperbarui.', data: result });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/menus/:id — Delete menu (seller)
router.delete('/:id', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const menu = await prisma.menu.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!menu || menu.storeId !== req.user.store?.id) {
      return res.status(403).json({ success: false, message: 'Menu tidak ditemukan atau bukan milik Anda.' });
    }

    await prisma.menu.delete({ where: { id: menu.id } });
    res.json({ success: true, message: 'Menu berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/menus/store/my — Get seller's own menus
router.get('/store/my', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    if (!req.user.store) {
      return res.status(404).json({ success: false, message: 'Anda belum memiliki toko.' });
    }

    const menus = await prisma.menu.findMany({
      where: { storeId: req.user.store.id },
      include: { nutrition: true, discounts: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: menus });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
