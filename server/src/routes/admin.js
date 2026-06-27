const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { createSubAccount } = require('../lib/xendit');

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// GET /api/admin/dashboard — Dashboard overview + analytics
router.get('/dashboard', async (req, res, next) => {
  try {
    // Total platform revenue (sum of platformFee from paid orders)
    const revenueResult = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { platformFee: true, total: true },
      _count: true
    });

    const totalRevenue = revenueResult._sum.platformFee || 0;
    const totalGMV = revenueResult._sum.total || 0;
    const totalTransactions = revenueResult._count;

    // User counts
    const totalBuyers = await prisma.user.count({ where: { role: 'BUYER', isActive: true } });
    const totalSellers = await prisma.store.count({ where: { status: 'APPROVED' } });
    const pendingSellers = await prisma.store.count({ where: { status: 'PENDING' } });

    // Average rating
    const ratingResult = await prisma.review.aggregate({ _avg: { rating: true }, _count: true });
    const avgRating = ratingResult._avg.rating ? parseFloat(ratingResult._avg.rating.toFixed(1)) : 0;

    // Pending appeals
    const pendingAppeals = await prisma.appeal.count({ where: { status: 'WAITING_ADMIN' } });

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalGMV,
        totalTransactions,
        totalBuyers,
        totalSellers,
        pendingSellers,
        avgRating,
        totalReviews: ratingResult._count,
        pendingAppeals
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/analytics/revenue — Revenue trend
router.get('/analytics/revenue', async (req, res, next) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: since }
      },
      select: { platformFee: true, total: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const grouped = {};
    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, revenue: 0, gmv: 0, count: 0 };
      }
      grouped[dateKey].revenue += order.platformFee;
      grouped[dateKey].gmv += order.total;
      grouped[dateKey].count++;
    });

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/analytics/top-menus — Top 5 menu terlaris
router.get('/analytics/top-menus', async (req, res, next) => {
  try {
    const topMenus = await prisma.orderItem.groupBy({
      by: ['menuId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const menusWithDetails = await Promise.all(
      topMenus.map(async (item) => {
        const menu = await prisma.menu.findUnique({
          where: { id: item.menuId },
          include: { store: { select: { name: true } } }
        });
        return {
          menuId: item.menuId,
          name: menu?.name || 'Deleted menu',
          storeName: menu?.store?.name || '-',
          totalSold: item._sum.quantity
        };
      })
    );

    res.json({ success: true, data: menusWithDetails });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/analytics/peak-hours — Jam peak order
router.get('/analytics/peak-hours', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { paymentStatus: 'PAID' },
      select: { createdAt: true }
    });

    const hourCounts = new Array(24).fill(0);
    orders.forEach(order => {
      const hour = order.createdAt.getHours();
      hourCounts[hour]++;
    });

    const data = hourCounts.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/analytics/user-growth — User growth over time
router.get('/analytics/user-growth', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { role: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const grouped = {};
    users.forEach(user => {
      const dateKey = user.createdAt.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, buyers: 0, sellers: 0 };
      }
      if (user.role === 'BUYER') grouped[dateKey].buyers++;
      if (user.role === 'SELLER') grouped[dateKey].sellers++;
    });

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/analytics/rating-distribution — Rating distribution
router.get('/analytics/rating-distribution', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({ select: { rating: true } });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => { distribution[r.rating]++; });

    const total = reviews.length;
    const data = Object.entries(distribution).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));

    res.json({ success: true, data, total });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/transactions — All transactions
router.get('/transactions', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        include: {
          buyer: { select: { name: true, email: true } },
          store: { select: { name: true } },
          items: { include: { menu: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.order.count()
    ]);

    res.json({ success: true, data: orders, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/sellers — All sellers
router.get('/sellers', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const stores = await prisma.store.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true, isActive: true } },
        _count: { select: { orders: true, menus: true, reviews: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: stores });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/sellers/:id/approve — Approve/reject seller
router.put('/sellers/:id/approve', async (req, res, next) => {
  try {
    const { approve } = req.body;
    const store = await prisma.store.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: true }
    });

    if (!store) {
      return res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
    }

    let xenditSubAccountId = store.xenditSubAccountId;

    // Create Xendit Sub-Account if approved and doesn't have one yet
    if (approve && !xenditSubAccountId) {
      try {
        const xenditRes = await createSubAccount(store.user.email, store.name);
        xenditSubAccountId = xenditRes.id;
      } catch (err) {
        console.error("Failed to create Xendit sub-account:", err);
        return res.status(500).json({ success: false, message: 'Gagal mengintegrasikan pembayaran Xendit. Coba lagi.' });
      }
    }

    await prisma.store.update({
      where: { id: store.id },
      data: { 
        status: approve ? 'APPROVED' : 'REJECTED',
        ...(xenditSubAccountId && { xenditSubAccountId })
      }
    });

    await prisma.notification.create({
      data: {
        userId: store.userId,
        title: approve ? 'Toko Disetujui! 🎉' : 'Pendaftaran Toko Ditolak',
        message: approve
          ? `Toko "${store.name}" sudah disetujui. Mulai tambahkan menu dan buka toko!`
          : `Toko "${store.name}" tidak disetujui. Hubungi admin untuk info lebih lanjut.`,
        type: 'SYSTEM'
      }
    });

    res.json({ success: true, message: approve ? 'Toko disetujui!' : 'Toko ditolak.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/buyers — All buyers
router.get('/buyers', async (req, res, next) => {
  try {
    const buyers = await prisma.user.findMany({
      where: { role: 'BUYER' },
      select: {
        id: true, name: true, email: true, phone: true,
        isActive: true, createdAt: true,
        _count: { select: { orders: true, reviews: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: buyers });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/toggle — Activate/deactivate user
router.put('/users/:id/toggle', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: !user.isActive }
    });

    res.json({ success: true, message: user.isActive ? 'User dinonaktifkan.' : 'User diaktifkan kembali.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/appeals — All appeals waiting for admin
router.get('/appeals', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const appeals = await prisma.appeal.findMany({
      where,
      include: {
        buyer: { select: { name: true, phone: true } },
        order: {
          include: {
            store: { select: { name: true, user: { select: { name: true, phone: true } } } },
            items: { include: { menu: { select: { name: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: appeals });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/reviews/:id — Delete review (moderation)
router.delete('/reviews/:id', async (req, res, next) => {
  try {
    await prisma.review.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Ulasan berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/menus/:id — Delete menu (moderation)
router.delete('/menus/:id', async (req, res, next) => {
  try {
    await prisma.menu.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Menu berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/finance — Financial recap
router.get('/finance', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    // Revenue
    const revenue = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID', createdAt: { gte: since } },
      _sum: { platformFee: true, total: true, sellerIncome: true, discountAmount: true }
    });

    // Discount costs paid by admin
    const adminDiscountCost = await prisma.order.aggregate({
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: since },
        discount: { source: 'ADMIN' }
      },
      _sum: { discountAmount: true }
    });

    res.json({
      success: true,
      data: {
        totalRevenue: revenue._sum.platformFee || 0,
        totalGMV: revenue._sum.total || 0,
        totalSellerPayout: revenue._sum.sellerIncome || 0,
        totalDiscountCost: revenue._sum.discountAmount || 0,
        adminDiscountCost: adminDiscountCost._sum.discountAmount || 0,
        netRevenue: (revenue._sum.platformFee || 0) - (adminDiscountCost._sum.discountAmount || 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
