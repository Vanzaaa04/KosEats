const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/chat/:orderId - Get all messages for an order
router.get('/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Pastikan order milik user yang login (Buyer/Seller/Courier)
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
    });
    
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    
    const messages = await prisma.message.findMany({
      where: { orderId: parseInt(orderId) },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, role: true, photoUrl: true }
        }
      }
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// POST /api/chat - Send a new message (HTTP fallback / DB save)
router.post('/', authenticate, async (req, res) => {
  try {
    const { orderId, receiverId, content, photoUrl } = req.body;
    const senderId = req.user.id; // From authenticate middleware

    if (!orderId || !receiverId) {
      return res.status(400).json({ success: false, message: 'orderId and receiverId are required' });
    }

    const message = await prisma.message.create({
      data: {
        orderId: parseInt(orderId),
        senderId: parseInt(senderId),
        receiverId: parseInt(receiverId),
        content,
        photoUrl
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true, photoUrl: true }
        }
      }
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
