const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews — Create review (buyer, after order delivered)
router.post('/', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const { orderId, rating, comment } = req.body;

    if (!orderId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Order ID dan rating (1-5) wajib diisi.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { review: true }
    });

    if (!order || order.buyerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'Hanya bisa memberi ulasan setelah pesanan diterima.' });
    }

    if (order.review) {
      return res.status(400).json({ success: false, message: 'Anda sudah memberi ulasan untuk pesanan ini.' });
    }

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        buyerId: req.user.id,
        storeId: order.storeId,
        rating: parseInt(rating),
        comment: comment || null
      },
      include: { buyer: { select: { name: true, photoUrl: true } } }
    });

    // Notify seller
    const store = await prisma.store.findUnique({ where: { id: order.storeId } });
    await prisma.notification.create({
      data: {
        userId: store.userId,
        title: `Ulasan Baru ⭐ ${rating}/5`,
        message: `${req.user.name} memberi ulasan: "${comment || 'Tanpa komentar'}"`,
        type: 'ORDER'
      }
    });

    res.status(201).json({ success: true, message: 'Ulasan berhasil dikirim!', data: review });
  } catch (error) {
    next(error);
  }
});

// GET /api/reviews/store/:storeId — Get reviews for a store
router.get('/store/:storeId', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { storeId: parseInt(req.params.storeId) },
      include: { buyer: { select: { name: true, photoUrl: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    // Distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => { distribution[r.rating]++; });

    res.json({
      success: true,
      data: {
        reviews,
        avgRating: avgRating ? parseFloat(avgRating) : null,
        totalReviews: reviews.length,
        distribution
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
