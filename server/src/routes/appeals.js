const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/appeals — Buyer creates an appeal (banding)
router.post('/', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const { orderId, reason, photoUrl, description } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ success: false, message: 'Order ID dan alasan wajib diisi.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { appeal: true, store: true }
    });

    if (!order || order.buyerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'Banding hanya bisa diajukan setelah pesanan diterima.' });
    }

    if (order.appeal) {
      return res.status(400).json({ success: false, message: 'Banding untuk pesanan ini sudah pernah diajukan.' });
    }

    const appeal = await prisma.appeal.create({
      data: {
        orderId: order.id,
        buyerId: req.user.id,
        reason,
        photoUrl: photoUrl || null,
        description: description || null,
        status: 'WAITING_SELLER'
      }
    });

    // Notify seller
    await prisma.notification.create({
      data: {
        userId: order.store.userId,
        title: 'Banding Masuk ⚠️',
        message: `${req.user.name} mengajukan banding untuk pesanan #${order.id}: "${reason}"`,
        type: 'APPEAL'
      }
    });

    // (Socket.io removed - UI now updates via Supabase DB listen)

    res.status(201).json({ success: true, message: 'Banding berhasil diajukan.', data: appeal });
  } catch (error) {
    next(error);
  }
});

// PUT /api/appeals/:id/seller-respond — Seller responds to appeal
router.put('/:id/seller-respond', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const { accept } = req.body;
    const appeal = await prisma.appeal.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { order: true }
    });

    if (!appeal || appeal.order.storeId !== req.user.store?.id) {
      return res.status(403).json({ success: false, message: 'Banding tidak ditemukan.' });
    }

    if (appeal.status !== 'WAITING_SELLER') {
      return res.status(400).json({ success: false, message: 'Banding sudah direspon sebelumnya.' });
    }

    if (accept) {
      // Seller accepts → refund
      await prisma.$transaction([
        prisma.appeal.update({
          where: { id: appeal.id },
          data: { status: 'ACCEPTED' }
        }),
        prisma.order.update({
          where: { id: appeal.orderId },
          data: { paymentStatus: 'REFUNDED' }
        }),
        prisma.notification.create({
          data: {
            userId: appeal.buyerId,
            title: 'Banding Diterima ✅',
            message: `Penjual menyetujui banding Anda untuk pesanan #${appeal.orderId}. Refund akan diproses.`,
            type: 'APPEAL'
          }
        })
      ]);
    } else {
      // Seller rejects
      await prisma.$transaction([
        prisma.appeal.update({
          where: { id: appeal.id },
          data: { status: 'REJECTED_SELLER' }
        }),
        prisma.notification.create({
          data: {
            userId: appeal.buyerId,
            title: 'Banding Ditolak Penjual ❌',
            message: `Penjual menolak banding Anda untuk pesanan #${appeal.orderId}. Anda bisa menghubungi admin.`,
            type: 'APPEAL'
          }
        })
      ]);
    }

    // (Socket.io removed - UI now updates via Supabase DB listen)

    res.json({ success: true, message: accept ? 'Banding diterima, refund diproses.' : 'Banding ditolak.' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/appeals/:id/escalate — Buyer escalates to admin
router.put('/:id/escalate', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const appeal = await prisma.appeal.findUnique({ where: { id: parseInt(req.params.id) } });

    if (!appeal || appeal.buyerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Banding tidak ditemukan.' });
    }

    if (appeal.status !== 'REJECTED_SELLER') {
      return res.status(400).json({ success: false, message: 'Hanya banding yang ditolak penjual yang bisa dieskalasi.' });
    }

    await prisma.appeal.update({
      where: { id: appeal.id },
      data: { status: 'WAITING_ADMIN' }
    });

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    await prisma.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        title: 'Eskalasi Banding ke Admin 🛡️',
        message: `Pembeli ${req.user.name} mengeskalasi banding pesanan #${appeal.orderId}.`,
        type: 'APPEAL'
      }))
    });

    res.json({ success: true, message: 'Banding dieskalasi ke admin.' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/appeals/:id/admin-decide — Admin final decision
router.put('/:id/admin-decide', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { approve, adminNote } = req.body;
    const appeal = await prisma.appeal.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { order: { include: { store: true } } }
    });

    if (!appeal || appeal.status !== 'WAITING_ADMIN') {
      return res.status(400).json({ success: false, message: 'Banding tidak valid.' });
    }

    if (approve) {
      // Admin approves → seller WAJIB refund
      await prisma.$transaction([
        prisma.appeal.update({
          where: { id: appeal.id },
          data: { status: 'ADMIN_APPROVED', adminNote: adminNote || null }
        }),
        prisma.order.update({
          where: { id: appeal.orderId },
          data: { paymentStatus: 'REFUNDED' }
        }),
        // Notify buyer
        prisma.notification.create({
          data: {
            userId: appeal.buyerId,
            title: 'Admin Menyetujui Banding ✅',
            message: `Banding Anda untuk pesanan #${appeal.orderId} disetujui admin. Refund akan diproses.`,
            type: 'APPEAL'
          }
        }),
        // Notify seller (WAJIB refund)
        prisma.notification.create({
          data: {
            userId: appeal.order.store.userId,
            title: 'Admin Memutuskan Refund ⚠️',
            message: `Admin menyetujui banding pembeli untuk pesanan #${appeal.orderId}. Refund WAJIB diproses.`,
            type: 'APPEAL'
          }
        })
      ]);
    } else {
      // Admin rejects → final
      await prisma.$transaction([
        prisma.appeal.update({
          where: { id: appeal.id },
          data: { status: 'ADMIN_REJECTED', adminNote: adminNote || null }
        }),
        prisma.notification.create({
          data: {
            userId: appeal.buyerId,
            title: 'Banding Ditolak (Final) ❌',
            message: `Admin menolak banding Anda untuk pesanan #${appeal.orderId}. Keputusan ini bersifat final.${adminNote ? ' Catatan: ' + adminNote : ''}`,
            type: 'APPEAL'
          }
        })
      ]);
    }

    res.json({ success: true, message: approve ? 'Banding disetujui, penjual wajib refund.' : 'Banding ditolak (final).' });
  } catch (error) {
    next(error);
  }
});

// GET /api/appeals/my — Buyer's appeals
router.get('/my', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const appeals = await prisma.appeal.findMany({
      where: { buyerId: req.user.id },
      include: { order: { include: { store: { select: { name: true } }, items: { include: { menu: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: appeals });
  } catch (error) {
    next(error);
  }
});

// GET /api/appeals/store — Seller's incoming appeals
router.get('/store', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const appeals = await prisma.appeal.findMany({
      where: { order: { storeId: req.user.store?.id } },
      include: {
        order: { include: { items: { include: { menu: true } } } },
        buyer: { select: { name: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: appeals });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
