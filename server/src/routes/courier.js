const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

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
    const { status } = req.body;
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }
    if (order.courierId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Ini bukan orderan Anda.' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

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
