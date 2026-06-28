const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// PUT /api/courier/status - Toggle isOnline status
router.put('/status', authenticate, authorize('COURIER'), async (req, res, next) => {
  try {
    const { isOnline } = req.body;
    const profile = await prisma.courierProfile.update({
      where: { userId: req.user.id },
      data: { isOnline: Boolean(isOnline) }
    });
    res.json({ success: true, message: 'Status diubah', data: profile });
  } catch (error) {
    next(error);
  }
});

// GET /api/courier/stats - Get driver dashboard stats
router.get('/stats', authenticate, authorize('COURIER'), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedOrders = await prisma.order.findMany({
      where: {
        courierId: req.user.id,
        status: 'DELIVERED',
        updatedAt: { gte: today }
      }
    });

    const todayIncome = completedOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

    const profile = await prisma.courierProfile.findUnique({
      where: { userId: req.user.id }
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { walletBalance: true }
    });

    res.json({
      success: true,
      data: {
        todayIncome,
        completedTrips: completedOrders.length,
        avgRating: profile?.avgRating || 0,
        walletBalance: user?.walletBalance || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/courier/orders/available - Get orders waiting for courier
router.get('/orders/available', authenticate, authorize('COURIER'), async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        deliveryMethod: 'COURIER',
        status: 'WAITING_COURIER',
        courierId: null
      },
      include: {
        buyer: { select: { name: true, phone: true, address: true, latitude: true, longitude: true } },
        store: { select: { name: true, address: true, latitude: true, longitude: true } },
        items: { include: { menu: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

// GET /api/courier/orders/my - Get courier's active/past orders
router.get('/orders/my', authenticate, authorize('COURIER'), async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { courierId: req.user.id },
      include: {
        buyer: { select: { name: true, phone: true, address: true, latitude: true, longitude: true } },
        store: { select: { name: true, address: true, latitude: true, longitude: true } },
        items: { include: { menu: { select: { name: true } } } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

// PUT /api/courier/orders/:id/accept - Accept a delivery job
router.put('/orders/:id/accept', authenticate, authorize('COURIER'), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }
    if (order.status !== 'WAITING_COURIER' || order.courierId !== null) {
      return res.status(400).json({ success: false, message: 'Pesanan sudah diambil oleh kurir lain.' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { courierId: req.user.id }
    });

    res.json({ success: true, message: 'Berhasil menerima orderan!', data: updatedOrder });
  } catch (error) {
    next(error);
  }
});

// PUT /api/courier/orders/:id/status - Update order status (Mulai antar / Selesai)
router.put('/orders/:id/status', authenticate, authorize('COURIER'), async (req, res, next) => {
  try {
    const { status, proofOfDeliveryUrl } = req.body;
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { store: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }
    if (order.courierId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Ini bukan orderan Anda.' });
    }

    if (status === 'DELIVERED' && !proofOfDeliveryUrl) {
      return res.status(400).json({ success: false, message: 'Bukti Pengantaran (Foto) wajib diunggah untuk menyelesaikan pesanan.' });
    }

    let updatedOrder;

    if (status === 'DELIVERING' && order.status !== 'DELIVERING') {
      if (order.paymentMethod === 'COD') {
        const courierUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        const MAX_DEBT = -150000;
        if (courierUser.walletBalance - order.subtotal < MAX_DEBT) {
          const deficit = Math.abs((courierUser.walletBalance - order.subtotal) - MAX_DEBT);
          return res.status(400).json({ success: false, message: `Batas kasbon Anda (Rp -150.000) terlampaui. Saldo saat ini: Rp ${courierUser.walletBalance.toLocaleString('id-ID')}. Anda butuh Rp ${deficit.toLocaleString('id-ID')} lagi. Harap Top-Up / Lunasi Kasbon.` });
        }
        
        const sellerIncome = order.subtotal - order.platformFee;
        
        const txResult = await prisma.$transaction([
          prisma.user.update({
            where: { id: req.user.id },
            data: { walletBalance: { decrement: order.subtotal } }
          }),
          prisma.walletTransaction.create({
            data: {
              userId: req.user.id,
              amount: -order.subtotal,
              type: 'COMMISSION_DEDUCTION',
              status: 'PAID',
              description: `Talangan COD pesanan #${order.id}`
            }
          }),
          prisma.user.update({
            where: { id: order.store.userId },
            data: { walletBalance: { increment: sellerIncome } }
          }),
          prisma.walletTransaction.create({
            data: {
              userId: order.store.userId,
              amount: sellerIncome,
              type: 'COMMISSION_RECEIVED',
              status: 'PAID',
              description: `Penjualan COD pesanan #${order.id}`
            }
          }),
          prisma.order.update({
            where: { id: orderId },
            data: { status }
          })
        ]);
        updatedOrder = txResult[4];
      } else {
        updatedOrder = await prisma.order.update({ where: { id: orderId }, data: { status } });
      }
    } else if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      if (order.paymentMethod === 'COD') {
        const platformCourierFee = Math.round(order.deliveryFee * 0.1);
        const txResult = await prisma.$transaction([
          prisma.user.update({
            where: { id: req.user.id },
            data: { walletBalance: { decrement: platformCourierFee } }
          }),
          prisma.walletTransaction.create({
            data: {
              userId: req.user.id,
              amount: -platformCourierFee,
              type: 'COMMISSION_DEDUCTION',
              status: 'PAID',
              description: `Komisi aplikasi (COD) pesanan #${order.id}`
            }
          }),
          prisma.order.update({
            where: { id: orderId },
            data: { status, proofOfDeliveryUrl }
          })
        ]);
        updatedOrder = txResult[2];
      } else {
        const netDeliveryFee = Math.round(order.deliveryFee * 0.9);
        const txResult = await prisma.$transaction([
          prisma.user.update({
            where: { id: req.user.id },
            data: { walletBalance: { increment: netDeliveryFee } }
          }),
          prisma.walletTransaction.create({
            data: {
              userId: req.user.id,
              amount: netDeliveryFee,
              type: 'COMMISSION_RECEIVED',
              status: 'PAID',
              description: `Pendapatan ongkir pesanan #${order.id}`
            }
          }),
          prisma.order.update({
            where: { id: orderId },
            data: { status, proofOfDeliveryUrl }
          })
        ]);
        updatedOrder = txResult[2];
      }
    } else {
      updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { 
          status,
          ...(proofOfDeliveryUrl && { proofOfDeliveryUrl })
        }
      });
    }

    // Notify buyer
    if (status === 'DELIVERING') {
      await prisma.notification.create({
        data: {
          userId: order.buyerId,
          title: 'Kurir Menuju Lokasimu 🏍️',
          message: `Kurir sedang mengantar pesananmu dari KosEats. Cek Live GPS!`,
          type: 'ORDER'
        }
      });
    }

    res.json({ success: true, message: 'Status pengantaran diupdate.', data: updatedOrder });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
