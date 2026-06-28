const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { createInvoice } = require('../lib/xendit');

const router = express.Router();

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// POST /api/orders — Create order (buyer)
router.post('/', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const { storeId, items, deliveryMethod, paymentMethod, discountId, notes } = req.body;

    if (!storeId || !items || items.length === 0 || !deliveryMethod || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Data pesanan tidak lengkap.' });
    }

    // Validate store
    const store = await prisma.store.findUnique({ 
      where: { id: parseInt(storeId) },
      include: { user: true }
    });
    if (!store || store.status !== 'APPROVED' || !store.isOpen) {
      return res.status(400).json({ success: false, message: 'Toko tidak tersedia.' });
    }

    // Validate & calculate items
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const menu = await prisma.menu.findUnique({ where: { id: parseInt(item.menuId) } });
      if (!menu || menu.storeId !== store.id || !menu.isAvailable) {
        return res.status(400).json({ success: false, message: `Menu "${item.menuId}" tidak tersedia.` });
      }
      if (menu.dailyStock > 0 && menu.dailyStock < item.quantity) {
        return res.status(400).json({ success: false, message: `Stok "${menu.name}" tidak cukup.` });
      }
      const itemTotal = menu.price * parseInt(item.quantity);
      subtotal += itemTotal;
      orderItems.push({ menuId: menu.id, quantity: parseInt(item.quantity), price: menu.price, name: menu.name });
    }

    if (deliveryMethod !== 'PICKUP' && (!req.user.latitude || !req.user.longitude)) {
      return res.status(400).json({ success: false, message: 'Lokasi Anda belum diatur. Silakan atur lokasi pengiriman terlebih dahulu.' });
    }

    // Calculate distance
    const distanceKm = calculateDistance(req.user.latitude, req.user.longitude, store.latitude, store.longitude);
    if (deliveryMethod !== 'PICKUP' && distanceKm > 10) {
      return res.status(400).json({ success: false, message: `Jarak pengiriman terlalu jauh (${distanceKm.toFixed(1)} km). Maksimal jarak yang diizinkan adalah 10 km.` });
    }

    // Calculate delivery fee
    let deliveryFee = 0;
    if (deliveryMethod === 'SELLER_DELIVERY') {
      deliveryFee = 2000;
      if (distanceKm > 1) deliveryFee += Math.ceil(distanceKm - 1) * 1000;
    } else if (deliveryMethod === 'COURIER') {
      deliveryFee = 5000;
      if (distanceKm > 1) deliveryFee += Math.ceil(distanceKm - 1) * 1500;
    }
    // PICKUP = 0

    // Apply discount
    let discountAmount = 0;
    let appliedDiscount = null;
    if (discountId) {
      const discount = await prisma.discount.findUnique({ where: { id: parseInt(discountId) } });
      if (discount && discount.isActive && discount.quotaUsed < discount.quotaTotal) {
        if (discount.type === 'FOOD') {
          discountAmount = Math.min(discount.amount, subtotal);
        } else if (discount.type === 'DELIVERY') {
          discountAmount = Math.min(discount.amount, deliveryFee);
        }
        appliedDiscount = discount;
      }
    }

    const total = subtotal + deliveryFee - discountAmount;
    const platformFee = Math.round(subtotal * 0.12); // 12% komisi
    const sellerIncome = subtotal - platformFee;

    // COD Wallet Balance Check
    if (paymentMethod === 'COD' && deliveryMethod === 'SELLER_DELIVERY') {
      if (store.user.walletBalance < platformFee) {
        return res.status(400).json({ success: false, message: 'Fitur COD untuk restoran ini sedang dinonaktifkan sementara (Saldo Penjual tidak mencukupi).' });
      }
    }

    const midtransOrderId = `KE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          buyerId: req.user.id,
          storeId: store.id,
          discountId: appliedDiscount?.id || null,
          deliveryMethod,
          paymentMethod,
          subtotal,
          deliveryFee,
          discountAmount,
          total,
          platformFee,
          sellerIncome,
          notes: notes || null,
          items: {
            create: orderItems.map(i => ({ menuId: i.menuId, quantity: i.quantity, price: i.price }))
          }
        },
        include: { items: { include: { menu: true } }, store: true }
      });

      // Update discount quota
      if (appliedDiscount) {
        await tx.discount.update({
          where: { id: appliedDiscount.id },
          data: { quotaUsed: { increment: 1 } }
        });
      }

      // Decrease menu stock
      for (const item of orderItems) {
        const menu = await tx.menu.findUnique({ where: { id: item.menuId } });
        if (menu.dailyStock > 0) {
          await tx.menu.update({
            where: { id: item.menuId },
            data: { dailyStock: { decrement: item.quantity } }
          });
        }
      }

      // Notify seller
      await tx.notification.create({
        data: {
          userId: store.userId,
          title: 'Pesanan Baru! 🔔',
          message: `${req.user.name} memesan ${orderItems.length} menu. Total: Rp ${total.toLocaleString('id-ID')}`,
          type: 'ORDER'
        }
      });

      return newOrder;
    });

    // KosEats V2 - Sistem Mandiri, tidak menggunakan Xendit.
    let paymentUrl = '';
    
    // Jika payment method == TRANSFER_MANUAL, cukup berikan respons sukses 
    // dengan info bahwa pesanan berhasil dibuat (tagihan dibayar manual ke rekening penjual)
    if (paymentMethod === 'TRANSFER_MANUAL') {
       // Kita tidak butuh link payment, cukup kembalikan sukses
       console.log('Order Transfer Manual created:', order.id);
    }

    // (Socket.io removed - UI now updates via Supabase DB listen)

    res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat! Mengalihkan ke pembayaran...',
      data: {
        ...order,
        paymentUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/my — Get buyer's orders
router.get('/my', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { buyerId: req.user.id };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { menu: true } },
        store: { select: { id: true, userId: true, name: true, photoUrl: true, address: true, latitude: true, longitude: true, gopayNumber: true, danaNumber: true } },
        courier: { select: { id: true, name: true, phone: true, photoUrl: true, courierProfile: { select: { vehicleType: true, vehicleBrand: true, vehicleColor: true, vehiclePlate: true } } } },
        review: true,
        appeal: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/store — Get seller's incoming orders
router.get('/store', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    if (!req.user.store) {
      return res.status(404).json({ success: false, message: 'Anda belum memiliki toko.' });
    }

    const { status } = req.query;
    const where = { storeId: req.user.store.id };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { menu: true } },
        buyer: { select: { id: true, name: true, phone: true, address: true, latitude: true, longitude: true } },
        appeal: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/status — Update order status (seller)
router.put('/:id/status', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const { status, proofOfDeliveryUrl } = req.body;
    const orderId = parseInt(req.params.id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true }
    });

    if (!order || order.storeId !== req.user.store?.id) {
      return res.status(403).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    // Validate status flow
    const validTransitions = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['COOKING'],
      COOKING: ['DELIVERING', 'WAITING_COURIER', 'READY_FOR_PICKUP'],
      WAITING_COURIER: ['DELIVERING'], // Ini diproses oleh route courier sebenarnya, tapi biar aman
      READY_FOR_PICKUP: ['DELIVERED'],
      DELIVERING: ['DELIVERED']
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Tidak bisa mengubah status dari ${order.status} ke ${status}.`
      });
    }

    if (status === 'DELIVERED' && order.deliveryMethod === 'SELLER_DELIVERY' && !proofOfDeliveryUrl) {
      return res.status(400).json({ success: false, message: 'Bukti Pengantaran (Foto) wajib diunggah untuk menyelesaikan pesanan.' });
    }

    const isCODPaid = status === 'DELIVERED' && order.paymentMethod === 'COD';
    
    let updated;

    if (status === 'DELIVERED' && order.deliveryMethod === 'SELLER_DELIVERY' && (order.paymentMethod === 'COD' || order.paymentMethod === 'TRANSFER_MANUAL')) {
      const sellerUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      const MAX_DEBT = -150000;
      if (sellerUser.walletBalance - order.platformFee < MAX_DEBT) {
        const deficit = Math.abs((sellerUser.walletBalance - order.platformFee) - MAX_DEBT);
        return res.status(400).json({ success: false, message: `Batas kasbon (Rp -150.000) terlampaui. Saldo saat ini: Rp ${sellerUser.walletBalance.toLocaleString('id-ID')}. Anda butuh Rp ${deficit.toLocaleString('id-ID')} lagi. Harap Lunasi Kasbon.` });
      }

      const txResult = await prisma.$transaction([
        prisma.user.update({
          where: { id: req.user.id },
          data: { walletBalance: { decrement: order.platformFee } }
        }),
        prisma.walletTransaction.create({
          data: {
            userId: req.user.id,
            amount: -order.platformFee,
            type: 'COMMISSION_DEDUCTION',
            status: 'PAID',
            description: `Komisi aplikasi (${order.paymentMethod}) pesanan #${order.id}`
          }
        }),
        prisma.order.update({
          where: { id: orderId },
          data: {
            status,
            paymentStatus: 'PAID',
            ...(proofOfDeliveryUrl && { proofOfDeliveryUrl })
          }
        })
      ]);
      updated = txResult[2];
    } else {
      let newPaymentStatus = undefined;
      if (status === 'CANCELLED') newPaymentStatus = 'REFUNDED';
      else if (isCODPaid) newPaymentStatus = 'PAID';
      else if (order.paymentMethod === 'TRANSFER_MANUAL' && status === 'CONFIRMED') newPaymentStatus = 'PAID';

      updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(newPaymentStatus && { paymentStatus: newPaymentStatus }),
          ...(proofOfDeliveryUrl && { proofOfDeliveryUrl })
        }
      });
    }

    // Notify buyer
    const statusMessages = {
      CONFIRMED: 'Pesananmu dikonfirmasi! Penjual sedang menyiapkan.',
      COOKING: 'Makananmu sedang dimasak 🍳',
      READY_FOR_PICKUP: 'Makananmu sudah siap! Silakan ambil di kamar penjual. 🏃',
      DELIVERING: 'Pesanan sedang diantar ke kosmu! 🛵',
      DELIVERED: 'Pesanan sudah sampai/diambil! Selamat makan 🍚',
      CANCELLED: 'Pesanan dibatalkan oleh penjual.'
    };

    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        title: `Pesanan #${orderId}`,
        message: statusMessages[status] || `Status diperbarui: ${status}`,
        type: 'ORDER'
      }
    });

    // (Socket.io removed - UI now updates via Supabase DB listen)

    res.json({ success: true, message: 'Status pesanan berhasil diperbarui.', data: updated });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/cancel — Buyer cancels order
router.put('/:id/cancel', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const { reason } = req.body;
    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { items: true, store: true }
    });

    if (!order || order.buyerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Pesanan tidak dapat dibatalkan lagi karena sudah diproses.' });
    }

    // Cancel order and restore stock
    const updated = await prisma.$transaction(async (tx) => {
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: { 
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED',
          notes: order.notes ? `${order.notes} [Batal: ${reason || 'Pembeli membatalkan'}]` : `[Batal: ${reason || 'Pembeli membatalkan'}]`
        }
      });

      // Restore stock
      for (const item of order.items) {
        const menu = await tx.menu.findUnique({ where: { id: item.menuId } });
        if (menu && menu.dailyStock !== null && menu.dailyStock >= 0) {
          await tx.menu.update({
            where: { id: item.menuId },
            data: { dailyStock: { increment: item.quantity } }
          });
        }
      }

      return cancelledOrder;
    });

    // Notify Seller
    // (Socket.io removed - UI now updates via Supabase DB listen)

    res.json({ success: true, message: 'Pesanan berhasil dibatalkan.', data: updated });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/received — Buyer confirms receipt
router.put('/:id/received', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order || order.buyerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    if (order.status !== 'DELIVERING') {
      return res.status(400).json({ success: false, message: 'Pesanan belum dalam status pengantaran.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' },
        include: { store: true }
      });

      // DEDUCT WALLET BALANCE FOR COD
      if (o.paymentMethod === 'COD') {
        if (o.deliveryMethod === 'SELLER_DELIVERY') {
          await tx.user.update({
            where: { id: o.store.userId },
            data: { walletBalance: { decrement: o.platformFee } }
          });
          
          await tx.walletTransaction.create({
            data: {
              userId: o.store.userId,
              amount: o.platformFee,
              type: 'COMMISSION_DEDUCTION',
              description: `Potongan komisi COD pesanan #${o.id}`,
              status: 'PAID'
            }
          });
        } else if (o.deliveryMethod === 'COURIER' && o.courierId) {
          const courierCommission = Math.round(o.deliveryFee * 0.10); // 10% dari ongkir
          await tx.user.update({
            where: { id: o.courierId },
            data: { walletBalance: { decrement: courierCommission } }
          });
          
          await tx.walletTransaction.create({
            data: {
              userId: o.courierId,
              amount: courierCommission,
              type: 'COMMISSION_DEDUCTION',
              description: `Potongan komisi pengantaran COD pesanan #${o.id}`,
              status: 'PAID'
            }
          });
        }
      } else if (o.paymentMethod === 'TRANSFER_MANUAL') {
        let totalDeduction = o.platformFee;
        let description = `Potongan komisi aplikasi (Transfer) pesanan #${o.id}`;

        if (o.deliveryMethod === 'COURIER' && o.courierId) {
          totalDeduction += o.deliveryFee;
          description = `Potongan komisi & ongkir (Transfer) pesanan #${o.id}`;
          
          const courierNet = Math.round(o.deliveryFee * 0.90);
          await tx.user.update({
            where: { id: o.courierId },
            data: { walletBalance: { increment: courierNet } }
          });
          await tx.walletTransaction.create({
            data: {
              userId: o.courierId,
              amount: courierNet,
              type: 'COMMISSION_RECEIVED',
              description: `Penerimaan ongkir pesanan #${o.id}`,
              status: 'PAID'
            }
          });
        }

        await tx.user.update({
          where: { id: o.store.userId },
          data: { walletBalance: { decrement: totalDeduction } }
        });
        
        await tx.walletTransaction.create({
          data: {
            userId: o.store.userId,
            amount: totalDeduction,
            type: 'COMMISSION_DEDUCTION',
            description,
            status: 'PAID'
          }
        });
      }

      return o;
    });

    res.json({ success: true, message: 'Pesanan diterima! Selamat makan 🍚', data: updated });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id — Get order detail
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        items: { include: { menu: true } },
        store: { select: { id: true, name: true, photoUrl: true, address: true, latitude: true, longitude: true, user: { select: { phone: true } } } },
        buyer: { select: { id: true, name: true, phone: true, address: true, latitude: true, longitude: true } },
        courier: { select: { id: true, name: true, phone: true, photoUrl: true, courierProfile: { select: { vehicleType: true, vehicleBrand: true, vehicleColor: true, vehiclePlate: true } } } },
        review: true,
        appeal: true,
        locationTracking: { orderBy: { timestamp: 'desc' }, take: 1 },
        discount: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    // Check access
    const isOwner = order.buyerId === req.user.id;
    const isStoreSeller = order.store && req.user.store?.id === order.storeId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isStoreSeller && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/seller-takeover — Seller takes over when no courier is found
router.put('/:id/seller-takeover', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const { action } = req.body; // 'SELLER_DELIVERY' or 'PICKUP'
    
    if (!['SELLER_DELIVERY', 'PICKUP'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Aksi tidak valid.' });
    }

    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { store: true }
    });

    if (!order || order.store.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Pesanan tidak ditemukan.' });
    }

    if (order.status !== 'WAITING_COURIER') {
      return res.status(400).json({ success: false, message: 'Pesanan tidak dalam status menunggu kurir.' });
    }

    const courierFee = order.deliveryFee;
    const newFee = action === 'SELLER_DELIVERY' ? 5000 : 0; // Seller delivery is flat 5000, pickup 0
    const refundAmount = courierFee - newFee;
    
    const newTotal = order.subtotal + newFee - order.discountAmount;

    // Execute refund IF payment was XENDIT and there is a refund amount
    if (order.paymentMethod === 'XENDIT' && refundAmount > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: order.buyerId },
          data: { walletBalance: { increment: refundAmount } }
        }),
        prisma.walletTransaction.create({
          data: {
            userId: order.buyerId,
            amount: refundAmount,
            type: 'TOP_UP', // Menambah balance
            status: 'PAID',
            description: `Refund ongkir pesanan #${order.id} (Kurir -> ${action})`
          }
        }),
        prisma.order.update({
          where: { id: orderId },
          data: {
            deliveryMethod: action,
            deliveryFee: newFee,
            total: newTotal,
            status: 'COOKING'
          }
        })
      ]);
    } else {
      // For COD, just update the order (buyer pays less in cash later)
      await prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryMethod: action,
          deliveryFee: newFee,
          total: newTotal,
          status: 'COOKING'
        }
      });
    }

    // Notify Buyer
    const message = action === 'SELLER_DELIVERY' 
      ? `Penjual mengambil alih pengantaran! Sisa ongkir Rp ${refundAmount.toLocaleString('id-ID')} dikembalikan ke Dompetmu.`
      : `Kurir penuh & Penjual sibuk. Mohon Ambil Sendiri (Pick-Up). Ongkir Rp ${refundAmount.toLocaleString('id-ID')} dikembalikan ke Dompetmu.`;

    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        title: action === 'SELLER_DELIVERY' ? 'Hore! Diantar Penjual 🎉' : 'Mohon Pick-Up Pesanan 🛍️',
        message: message,
        type: 'ORDER'
      }
    });

    res.json({ success: true, message: 'Berhasil mengambil alih pesanan.' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/buyer-takeover — Buyer switches to Pick-Up when tired of waiting
router.put('/:id/buyer-takeover', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    
    const order = await prisma.order.findUnique({ 
      where: { id: orderId }
    });

    if (!order || order.buyerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    if (order.status !== 'WAITING_COURIER') {
      return res.status(400).json({ success: false, message: 'Pesanan tidak dalam status menunggu kurir.' });
    }

    const courierFee = order.deliveryFee;
    const newFee = 0; // Pick-up is 0
    const refundAmount = courierFee - newFee;
    const newTotal = order.subtotal + newFee - order.discountAmount;

    // Refund if XENDIT or TRANSFER_MANUAL? 
    // Wait, if it's COD, buyer hasn't paid.
    // If TRANSFER_MANUAL, buyer paid to seller. 
    // If XENDIT, buyer paid to platform.
    
    // For now, if TRANSFER_MANUAL or XENDIT, we can credit walletBalance.
    // Wait, if TRANSFER_MANUAL, seller holds the money. So we deduct from seller and credit buyer? 
    // Yes! Let's do that.
    
    if (refundAmount > 0) {
      if (order.paymentMethod === 'XENDIT') {
        await prisma.$transaction([
          prisma.user.update({ where: { id: order.buyerId }, data: { walletBalance: { increment: refundAmount } } }),
          prisma.walletTransaction.create({ data: { userId: order.buyerId, amount: refundAmount, type: 'TOP_UP', status: 'PAID', description: `Refund Ongkir (Ubah Pick-Up) pesanan #${order.id}` } }),
          prisma.order.update({ where: { id: orderId }, data: { deliveryMethod: 'PICKUP', deliveryFee: newFee, total: newTotal, status: 'READY_FOR_PICKUP' } })
        ]);
      } else if (order.paymentMethod === 'TRANSFER_MANUAL') {
        // Transfer refund from seller to buyer
        await prisma.$transaction([
          prisma.user.update({ where: { id: order.buyerId }, data: { walletBalance: { increment: refundAmount } } }),
          prisma.walletTransaction.create({ data: { userId: order.buyerId, amount: refundAmount, type: 'TOP_UP', status: 'PAID', description: `Refund Ongkir (Ubah Pick-Up) pesanan #${order.id}` } }),
          prisma.user.update({ where: { id: order.storeId }, data: { walletBalance: { decrement: refundAmount } } }),
          prisma.walletTransaction.create({ data: { userId: order.storeId, amount: -refundAmount, type: 'COMMISSION_DEDUCTION', status: 'PAID', description: `Potongan Refund Ongkir (Ubah Pick-Up) pesanan #${order.id}` } }),
          prisma.order.update({ where: { id: orderId }, data: { deliveryMethod: 'PICKUP', deliveryFee: newFee, total: newTotal, status: 'READY_FOR_PICKUP' } })
        ]);
      } else {
        // COD
        await prisma.order.update({ where: { id: orderId }, data: { deliveryMethod: 'PICKUP', deliveryFee: newFee, total: newTotal, status: 'READY_FOR_PICKUP' } });
      }
    } else {
      await prisma.order.update({ where: { id: orderId }, data: { deliveryMethod: 'PICKUP', deliveryFee: newFee, total: newTotal, status: 'READY_FOR_PICKUP' } });
    }

    // (Socket.io removed - UI now updates via Supabase DB listen)

    res.json({ success: true, message: 'Berhasil mengubah ke Pick-Up.' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/transfer-proof (buyer uploads manual transfer proof)
router.put('/:id/transfer-proof', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transferProofUrl } = req.body;

    if (!transferProofUrl) {
      return res.status(400).json({ success: false, message: 'URL Bukti transfer wajib diisi.' });
    }

    const order = await prisma.order.findUnique({ where: { id: parseInt(id) } });
    if (!order || order.buyerId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    if (order.paymentMethod !== 'TRANSFER_MANUAL') {
      return res.status(400).json({ success: false, message: 'Bukan metode transfer manual.' });
    }

    const updated = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { 
        transferProofUrl,
        paymentStatus: 'VERIFYING'
      }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/verify-transfer (seller verifies manual transfer)
router.put('/:id/verify-transfer', authenticate, authorize('SELLER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const order = await prisma.order.findUnique({ where: { id: parseInt(id) }, include: { store: true } });
    if (!order || order.store.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan atau akses ditolak.' });
    }

    if (order.paymentMethod !== 'TRANSFER_MANUAL') {
      return res.status(400).json({ success: false, message: 'Bukan metode transfer manual.' });
    }

    if (order.paymentStatus !== 'VERIFYING') {
      return res.status(400).json({ success: false, message: 'Pesanan tidak dalam status menunggu verifikasi pembayaran.' });
    }

    const newPaymentStatus = isVerified ? 'PAID' : 'FAILED';
    const updated = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { paymentStatus: newPaymentStatus }
    });
    
    if (isVerified) {
       // Opsional: Otomatis ubah status order menjadi CONFIRMED jika PAID
       await prisma.order.update({
         where: { id: parseInt(id) },
         data: { status: 'CONFIRMED' }
       });
       
       // (Socket.io removed - UI now updates via Supabase DB listen)
    }

    res.json({ success: true, message: `Pembayaran berhasil diubah menjadi ${newPaymentStatus}.`, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
