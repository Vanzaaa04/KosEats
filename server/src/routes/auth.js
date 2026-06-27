const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address, latitude, longitude } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan password wajib diisi.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 6 karakter.'
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar. Gunakan email lain atau login.'
      });
    }

    // Only allow BUYER and SELLER registration (ADMIN is created manually)
    const userRole = role === 'SELLER' ? 'SELLER' : 'BUYER';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and store in a transaction to avoid orphaned users on failure
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: userRole,
          phone: phone || null,
          address: address || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null
        }
      });

      if (userRole === 'SELLER') {
        await tx.store.create({
          data: {
            name: `Warung ${name}`,
            description: `Toko milik ${name}`,
            address: address || '',
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            userId: newUser.id,
            openTime: "08:00",
            closeTime: "20:00",
            status: 'PENDING'
          }
        });
      }
      return newUser;
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Selamat datang di KosEats! 🍚',
        message: userRole === 'SELLER'
          ? 'Akun penjual berhasil dibuat. Silakan lengkapi profil toko Anda.'
          : 'Akun berhasil dibuat. Yuk mulai pesan makanan rumahan terjangkau!',
        type: 'SYSTEM'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil!',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi.'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { store: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Hubungi admin.'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah.'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login berhasil!',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          photoUrl: user.photoUrl,
          latitude: user.latitude,
          longitude: user.longitude,
          store: user.store ? {
            id: user.store.id,
            name: user.store.name,
            status: user.store.status,
            isOpen: user.store.isOpen
          } : null
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me — Get current user profile
router.get('/me', authenticate, async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      photoUrl: user.photoUrl,
      latitude: user.latitude,
      longitude: user.longitude,
      isActive: user.isActive,
      store: user.store ? {
        id: user.store.id,
        name: user.store.name,
        status: user.store.status,
        isOpen: user.store.isOpen
      } : null
    }
  });
});

module.exports = router;
