const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { createSubAccount } = require('../lib/xendit');
const ExcelJS = require('exceljs');

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

    // User counts (All users except ADMIN)
    const totalUsers = await prisma.user.count({ 
      where: { role: { not: 'ADMIN' } } 
    });
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
        totalUsers,
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

// GET /api/admin/couriers — All couriers
router.get('/couriers', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const couriers = await prisma.courierProfile.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true, isActive: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: couriers });
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
        console.error("Failed to create Xendit sub-account, bypassing for development:", err);
        xenditSubAccountId = "dummy_xendit_id_" + Date.now(); // Bypass xendit error in development
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

// PUT /api/admin/couriers/:id/approve — Approve/reject courier
router.put('/couriers/:id/approve', async (req, res, next) => {
  try {
    const { approve } = req.body;
    const courier = await prisma.courierProfile.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: true }
    });

    if (!courier) {
      return res.status(404).json({ success: false, message: 'Kurir tidak ditemukan.' });
    }

    await prisma.courierProfile.update({
      where: { id: courier.id },
      data: { status: approve ? 'APPROVED' : 'REJECTED' }
    });

    await prisma.notification.create({
      data: {
        userId: courier.userId,
        title: approve ? 'Pendaftaran Kurir Disetujui! 🛵' : 'Pendaftaran Kurir Ditolak',
        message: approve
          ? `Selamat! Akun driver Anda (Plat: ${courier.vehiclePlate}) sudah aktif. Segera on-kan radar dan cari rezeki.`
          : `Mohon maaf, pendaftaran driver Anda tidak memenuhi syarat.`,
        type: 'SYSTEM'
      }
    });

    res.json({ success: true, message: approve ? 'Kurir disetujui!' : 'Kurir ditolak.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/buyers — All users (buyers, sellers, couriers)
router.get('/buyers', async (req, res, next) => {
  try {
    const buyers = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      select: {
        id: true, name: true, email: true, phone: true,
        isActive: true, createdAt: true, role: true,
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

// GET /api/admin/export/excel — Export Full Excel Report
router.get('/export/excel', async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KosEats Admin';
    workbook.lastModifiedBy = 'KosEats Admin';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ==========================================
    // SHEET 1: RINGKASAN EKSEKUTIF
    // ==========================================
    const summarySheet = workbook.addWorksheet('Ringkasan Eksekutif');
    
    // Fetch stats (similar to dashboard)
    const revenueResult = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { platformFee: true, total: true },
      _count: true
    });
    const totalUsers = await prisma.user.count({ where: { role: { not: 'ADMIN' } } });
    const pendingSellers = await prisma.store.count({ where: { status: 'PENDING' } });
    const ratingResult = await prisma.review.aggregate({ _avg: { rating: true }, _count: true });
    const pendingAppeals = await prisma.appeal.count({ where: { status: 'WAITING_ADMIN' } });
    
    summarySheet.columns = [
      { header: 'Kategori Metrik', key: 'metric', width: 40 },
      { header: 'Nilai', key: 'value', width: 30 }
    ];
    
    // Style header
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004E98' } };

    summarySheet.addRow({ metric: 'Total GMV (Rp)', value: revenueResult._sum.total || 0 });
    summarySheet.addRow({ metric: 'Total Pendapatan Komisi (Rp)', value: revenueResult._sum.platformFee || 0 });
    summarySheet.addRow({ metric: 'Volume Transaksi Selesai', value: revenueResult._count });
    summarySheet.addRow({ metric: 'Total Pengguna', value: totalUsers });
    summarySheet.addRow({ metric: 'Toko Menunggu Persetujuan', value: pendingSellers });
    summarySheet.addRow({ metric: 'Rata-rata Rating', value: ratingResult._avg.rating ? parseFloat(ratingResult._avg.rating.toFixed(1)) : 0 });
    summarySheet.addRow({ metric: 'Sengketa Aktif', value: pendingAppeals });

    // Format currency for rows 2 and 3
    summarySheet.getCell('B2').numFmt = '"Rp"#,##0;[Red]\-"Rp"#,##0';
    summarySheet.getCell('B3').numFmt = '"Rp"#,##0;[Red]\-"Rp"#,##0';

    // ==========================================
    // SHEET 2: TOP MENU TERLARIS
    // ==========================================
    const topMenuSheet = workbook.addWorksheet('Top Menu Terlaris');
    topMenuSheet.columns = [
      { header: 'Peringkat', key: 'rank', width: 10 },
      { header: 'Nama Menu', key: 'menuName', width: 30 },
      { header: 'Nama Warung', key: 'storeName', width: 30 },
      { header: 'Total Porsi Terjual', key: 'totalSold', width: 20 }
    ];

    topMenuSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    topMenuSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE67E22' } };

    const topMenus = await prisma.orderItem.groupBy({
      by: ['menuId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 20
    });

    let rank = 1;
    for (const item of topMenus) {
      const menu = await prisma.menu.findUnique({
        where: { id: item.menuId },
        include: { store: { select: { name: true } } }
      });
      if (menu) {
        topMenuSheet.addRow({
          rank: rank++,
          menuName: menu.name,
          storeName: menu.store.name,
          totalSold: item._sum.quantity
        });
      }
    }

    // ==========================================
    // SHEET 3: DATA MENTAH TRANSAKSI
    // ==========================================
    const txSheet = workbook.addWorksheet('Raw Data Transaksi');
    txSheet.columns = [
      { header: 'ID Pesanan', key: 'orderId', width: 15 },
      { header: 'Tanggal Waktu', key: 'date', width: 20 },
      { header: 'Nama Pembeli', key: 'buyerName', width: 25 },
      { header: 'Nama Toko', key: 'storeName', width: 25 },
      { header: 'Metode Bayar', key: 'paymentMethod', width: 15 },
      { header: 'Total Nilai (GMV)', key: 'total', width: 20 },
      { header: 'Komisi Platform', key: 'fee', width: 20 },
      { header: 'Status Pembayaran', key: 'status', width: 20 }
    ];

    txSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    txSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };

    const transactions = await prisma.order.findMany({
      where: { paymentStatus: 'PAID' },
      include: {
        buyer: { select: { name: true } },
        store: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit to last 1000 for safety
    });

    transactions.forEach(tx => {
      const row = txSheet.addRow({
        orderId: tx.id,
        date: tx.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        buyerName: tx.buyer.name,
        storeName: tx.store.name,
        paymentMethod: tx.paymentMethod || 'UNKNOWN',
        total: tx.total,
        fee: tx.platformFee,
        status: tx.paymentStatus
      });
      row.getCell('total').numFmt = '"Rp"#,##0;[Red]\-"Rp"#,##0';
      row.getCell('fee').numFmt = '"Rp"#,##0;[Red]\-"Rp"#,##0';
    });

    // Write to buffer and send
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Laporan_Eksekutif_KosEats_${new Date().toISOString().split('T')[0]}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
