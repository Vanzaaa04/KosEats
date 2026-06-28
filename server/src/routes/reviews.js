const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews — Create review (buyer, after order delivered)
router.post('/', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const { orderId, rating, comment, courierRating } = req.body;

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
        courierRating: courierRating ? parseInt(courierRating) : null,
        comment: comment || null
      },
      include: { buyer: { select: { name: true, photoUrl: true } } }
    });

    // 1. Hitung ulang rata-rata Bintang
    const ratingResult = await prisma.review.aggregate({
      where: { storeId: order.storeId },
      _avg: { rating: true },
      _count: true
    });
    
    const newAvgRating = ratingResult._avg.rating ? parseFloat(ratingResult._avg.rating.toFixed(1)) : 0;
    const newTotalReviews = ratingResult._count;

    // 2. Perbarui tabel Store
    const store = await prisma.store.update({ 
      where: { id: order.storeId },
      data: {
        avgRating: newAvgRating,
        totalReviews: newTotalReviews
      }
    });

    // 3. Notify seller via DB
    await prisma.notification.create({
      data: {
        userId: store.userId,
        title: `Ulasan Baru ⭐ ${rating}/5`,
        message: `${req.user.name} memberi ulasan: "${comment || 'Tanpa komentar'}"`,
        type: 'ORDER'
      }
    });

    // 3.5 Update Courier Rating if applicable
    if (order.courierId && courierRating) {
      const courierReviewResult = await prisma.review.aggregate({
        where: { order: { courierId: order.courierId }, courierRating: { not: null } },
        _avg: { courierRating: true },
        _count: true
      });
      const newCourierAvg = courierReviewResult._avg.courierRating ? parseFloat(courierReviewResult._avg.courierRating.toFixed(1)) : 0;
      
      await prisma.courierProfile.update({
        where: { userId: order.courierId },
        data: {
          avgRating: newCourierAvg,
          totalReviews: courierReviewResult._count
        }
      });
    }

    // 4. (Socket.io removed - UI now updates via Supabase DB listen)

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
