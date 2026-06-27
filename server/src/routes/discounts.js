const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/discounts — Create discount (seller for own menu, or admin for platform)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { type, menuId, amount, quotaTotal } = req.body;

    if (!type || !amount || !quotaTotal) {
      return res.status(400).json({ success: false, message: 'Tipe, jumlah, dan kuota wajib diisi.' });
    }

    let source;
    if (req.user.role === 'ADMIN') {
      source = 'ADMIN';
    } else if (req.user.role === 'SELLER') {
      source = 'SELLER';
      // Seller can only create FOOD discounts for their own menus
      if (type !== 'FOOD') {
        return res.status(403).json({ success: false, message: 'Penjual hanya bisa membuat diskon makanan.' });
      }
      if (!menuId) {
        return res.status(400).json({ success: false, message: 'Pilih menu yang ingin didiskon.' });
      }
      const menu = await prisma.menu.findUnique({ where: { id: parseInt(menuId) } });
      if (!menu || menu.storeId !== req.user.store?.id) {
        return res.status(403).json({ success: false, message: 'Menu bukan milik Anda.' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const discount = await prisma.discount.create({
      data: {
        createdById: req.user.id,
        source,
        type,
        menuId: menuId ? parseInt(menuId) : null,
        amount: parseInt(amount),
        quotaTotal: parseInt(quotaTotal)
      }
    });

    res.status(201).json({ success: true, message: 'Diskon berhasil dibuat!', data: discount });
  } catch (error) {
    next(error);
  }
});

// GET /api/discounts/my — Get seller's discounts
router.get('/my', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const discounts = await prisma.discount.findMany({
      where: { createdById: req.user.id, source: 'SELLER' },
      include: { menu: { select: { id: true, name: true, price: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: discounts });
  } catch (error) {
    next(error);
  }
});

// GET /api/discounts/platform — Get admin's platform discounts
router.get('/platform', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const discounts = await prisma.discount.findMany({
      where: { source: 'ADMIN' },
      include: {
        menu: { select: { id: true, name: true, price: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: discounts });
  } catch (error) {
    next(error);
  }
});

// PUT /api/discounts/:id/toggle — Toggle discount active/inactive
router.put('/:id/toggle', authenticate, async (req, res, next) => {
  try {
    const discount = await prisma.discount.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!discount) {
      return res.status(404).json({ success: false, message: 'Diskon tidak ditemukan.' });
    }

    // Only creator or admin can toggle
    if (discount.createdById !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const updated = await prisma.discount.update({
      where: { id: discount.id },
      data: { isActive: !discount.isActive }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/discounts/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const discount = await prisma.discount.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!discount || (discount.createdById !== req.user.id && req.user.role !== 'ADMIN')) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    await prisma.discount.delete({ where: { id: discount.id } });
    res.json({ success: true, message: 'Diskon berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
