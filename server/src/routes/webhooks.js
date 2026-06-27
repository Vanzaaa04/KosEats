const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

// Xendit Webhook Token Verification (Opsional tapi disarankan)
const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN;

// POST /api/webhooks/xendit — Menerima notifikasi dari Xendit (Invoice Paid)
router.post('/xendit', async (req, res, next) => {
  try {
    // 1. Verifikasi Token Webhook Xendit
    // (Jika diatur di dashboard Xendit, token akan dikirim di header 'x-callback-token')
    const callbackToken = req.headers['x-callback-token'];
    
    if (XENDIT_WEBHOOK_TOKEN && callbackToken !== XENDIT_WEBHOOK_TOKEN) {
      console.warn("Invalid Xendit webhook token received.");
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }

    const { id, status, external_id } = req.body;

    console.log(`🔔 Xendit Webhook Received: Invoice ${id}, Status: ${status}`);

    // 2. Hanya proses jika tagihan sudah DIBAYAR (PAID atau SETTLED)
    if (status === 'PAID' || status === 'SETTLED') {
      
      // 3. Cari pesanan berdasarkan xenditInvoiceId atau externalId
      const order = await prisma.order.findUnique({
        where: { xenditInvoiceId: id }
      });

      if (!order) {
        console.warn(`Order with Xendit Invoice ID ${id} not found.`);
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // 4. Update status pembayaran dan pesanan
      if (order.paymentStatus !== 'PAID') {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED'
          }
        });

        console.log(`✅ Order #${order.id} payment verified successfully via webhook.`);

        // 5. Notifikasi ke Pembeli dan Penjual
        await prisma.notification.createMany({
          data: [
            {
              userId: order.buyerId,
              title: 'Pembayaran Berhasil! 🎉',
              message: `Hore! Pembayaran untuk pesanan #${order.id} berhasil. Makanan segera disiapkan.`,
              type: 'ORDER'
            },
            {
              userId: order.storeId,
              title: 'Pesanan Telah Dibayar! 💰',
              message: `Pesanan #${order.id} telah dibayar. Silakan mulai memasak!`,
              type: 'ORDER'
            }
          ]
        });

        // Emit socket events
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${order.buyerId}`).emit('payment_success', { orderId: order.id });
          io.to(`user_${order.storeId}`).emit('order_paid', { orderId: order.id });
        }
      }
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
