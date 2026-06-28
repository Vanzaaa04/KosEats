const express = require('express');
const cors = require('cors');
// Serverless ready (no socket.io)
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const storeRoutes = require('./routes/stores');
const menuRoutes = require('./routes/menus');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const discountRoutes = require('./routes/discounts');
const appealRoutes = require('./routes/appeals');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const courierRoutes = require('./routes/courier');
const webhookRoutes = require('./routes/webhooks');
const chatRoutes = require('./routes/chat');
const walletRoutes = require('./routes/wallet');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for image uploads)
const path = require('path');
app.use('/public', express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/courier', courierRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wallet', walletRoutes);

const kycRoutes = require('./routes/kyc');
app.use('/api/kyc', kycRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KosEats API is running 🍚' });
});

// Using Supabase Realtime instead of Socket.io

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🍚 KosEats API running on port ${PORT} (Stateless / Serverless Ready)`);
});

// Export app for serverless deployment
module.exports = app;
