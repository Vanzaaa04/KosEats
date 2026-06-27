const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
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

const app = express();
const server = http.createServer(app);

// Socket.io for real-time (GPS tracking + notifications)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Buyer or Seller joins an order room
  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined order_${orderId}`);
  });

  // Seller sends live location
  socket.on('send_location', (data) => {
    const { orderId, lat, lng } = data;
    // Broadcast to the buyer in the same order room
    socket.to(`order_${orderId}`).emit('update_location', { lat, lng });
  });

  // Chat message event
  socket.on('send_message', (data) => {
    // Broadcast to the other person in the room
    socket.to(`order_${data.orderId}`).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
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

const kycRoutes = require('./routes/kyc');
app.use('/api/kyc', kycRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KosEats API is running 🍚' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join room based on user ID for targeted notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });

  // GPS tracking: courier/seller sends location updates
  socket.on('location_update', (data) => {
    const { orderId, latitude, longitude } = data;
    // Broadcast to buyer watching this order
    io.to(`order_${orderId}`).emit('location_changed', {
      orderId,
      latitude,
      longitude,
      timestamp: new Date()
    });
  });

  // Join order room for tracking
  socket.on('track_order', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Tracking order ${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

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
server.listen(PORT, () => {
  console.log(`🍚 KosEats API running on port ${PORT}`);
  console.log(`📡 WebSocket ready for GPS tracking & notifications`);
});
