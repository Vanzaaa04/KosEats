const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { createTopUpInvoice } = require('../lib/xendit');

const router = express.Router();

// GET /api/wallet — Get balance and transaction history
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { walletBalance: true }
    });

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        balance: user.walletBalance,
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/wallet/topup — Request top-up via Xendit
router.post('/topup', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 10000) {
      return res.status(400).json({ success: false, message: 'Minimal top-up adalah Rp 10.000' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const externalId = `KE-TOPUP-${user.id}-${Date.now()}`;

    // Create pending transaction in db
    await prisma.walletTransaction.create({
      data: {
        userId: user.id,
        amount: parseFloat(amount),
        type: 'TOP_UP',
        description: 'Top-Up Saldo KosEats',
        status: 'PENDING',
        externalId: externalId
      }
    });

    // Create Xendit Invoice
    const invoice = await createTopUpInvoice({
      externalId,
      amount,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone || '0800000000'
      }
    });

    res.json({
      success: true,
      message: 'Permintaan Top-Up berhasil dibuat',
      data: {
        invoiceUrl: invoice.invoice_url,
        invoiceId: invoice.id
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/wallet/manual-topup — Top-Up Manual Admin
router.post('/manual-topup', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Data tidak lengkap atau tidak valid' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: parseInt(userId) },
        data: { walletBalance: { increment: parseFloat(amount) } }
      }),
      prisma.walletTransaction.create({
        data: {
          userId: parseInt(userId),
          amount: parseFloat(amount),
          type: 'TOP_UP',
          description: 'Top-Up Manual Admin (Setor Tunai)',
          status: 'PAID'
        }
      })
    ]);

    res.json({ success: true, message: `Berhasil Top-Up saldo ${targetUser.name} sebesar Rp ${parseFloat(amount).toLocaleString('id-ID')}` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
