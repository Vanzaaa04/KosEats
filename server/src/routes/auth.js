const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, address, latitude, longitude, role, storeName, storeDescription } = req.body;

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

    if (!phone || !/^\d+$/.test(phone) || phone.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Nomor HP harus berupa angka dan minimal 8 digit.'
      });
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({
        success: false,
        message: 'Harap gunakan email @gmail.com demi keamanan.'
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

    // Validation for Seller
    if (role === 'SELLER' && !storeName) {
      return res.status(400).json({
        success: false,
        message: 'Nama Toko wajib diisi untuk pendaftaran Mitra Penjual.'
      });
    }

    // Determine role (default BUYER)
    const validRoles = ['BUYER', 'SELLER', 'COURIER', 'ADMIN'];
    const userRole = validRoles.includes(role) ? role : 'BUYER';

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
            userId: newUser.id,
            name: storeName,
            description: storeDescription || null,
            address: address || 'Alamat Toko Belum Diatur',
            latitude: latitude ? parseFloat(latitude) : -6.200000,
            longitude: longitude ? parseFloat(longitude) : 106.816666,
            openTime: '08:00',
            closeTime: '20:00',
            status: 'PENDING'
          }
        });
      } else if (userRole === 'COURIER') {
        await tx.courierProfile.create({
          data: {
            userId: newUser.id,
            vehicleType: req.body.vehicleType || 'MOTORCYCLE',
            vehicleBrand: req.body.vehicleBrand || 'Honda',
            vehicleColor: req.body.vehicleColor || 'Hitam',
            vehiclePlate: req.body.vehiclePlate || 'B 1234 XXX',
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
        message: 'Akun berhasil dibuat. Yuk mulai pesan makanan rumahan terjangkau!',
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
      include: { store: true, courierProfile: true }
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
            isOpen: user.store.isOpen,
            avgRating: user.store.avgRating
          } : null,
          courierProfile: user.courierProfile ? {
            status: user.courierProfile.status,
            isOnline: user.courierProfile.isOnline,
            vehicleType: user.courierProfile.vehicleType,
            vehiclePlate: user.courierProfile.vehiclePlate
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
        isOpen: user.store.isOpen,
        avgRating: user.store.avgRating
      } : null,
      courierProfile: user.courierProfile ? {
        status: user.courierProfile.status,
        isOnline: user.courierProfile.isOnline,
        vehicleType: user.courierProfile.vehicleType,
        vehiclePlate: user.courierProfile.vehiclePlate
      } : null
    }
  });
});

// POST /api/auth/upgrade/seller — Upgrade to SELLER
router.post('/upgrade/seller', authenticate, async (req, res, next) => {
  try {
    const { name, description, ktpUrl } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama toko wajib diisi' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { store: true } });
    if (user.role === 'SELLER' || user.store) {
      return res.status(400).json({ success: false, message: 'Anda sudah menjadi penjual atau sedang dalam proses pendaftaran.' });
    }

    // Default address & lat/lng for store based on user profile if any, else dummy
    const address = user.address || 'Alamat Toko Default';
    const latitude = user.latitude || -6.200000;
    const longitude = user.longitude || 106.816666;

    await prisma.$transaction(async (tx) => {
      await tx.store.create({
        data: {
          userId: user.id,
          name,
          description,
          address,
          latitude,
          longitude,
          status: 'PENDING',
          openTime: '08:00',
          closeTime: '22:00',
          ktpUrl
        }
      });
    });

    res.json({ success: true, message: 'Berhasil mendaftar. Menunggu persetujuan admin.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/upgrade/courier — Upgrade to COURIER
router.post('/upgrade/courier', authenticate, async (req, res, next) => {
  try {
    const { vehicleType, vehicleBrand, vehicleColor, vehiclePlate, ktpUrl } = req.body;
    if (!vehicleType || !vehicleBrand || !vehicleColor || !vehiclePlate) {
      return res.status(400).json({ success: false, message: 'Semua data kendaraan wajib diisi' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { courierProfile: true } });
    if (user.role === 'COURIER' || user.courierProfile) {
      return res.status(400).json({ success: false, message: 'Anda sudah mendaftar sebagai kurir.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.courierProfile.create({
        data: {
          userId: user.id,
          vehicleType,
          vehicleBrand,
          vehicleColor,
          vehiclePlate,
          ktpUrl,
          status: 'PENDING'
        }
      });
    });

    res.json({ success: true, message: 'Berhasil mendaftar. Menunggu persetujuan admin.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
