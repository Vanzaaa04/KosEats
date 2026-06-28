const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan. Silakan login terlebih dahulu.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { store: true, courierProfile: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan atau sudah dinonaktifkan.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token tidak valid.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token sudah kadaluarsa. Silakan login ulang.' });
    }
    next(error);
  }
};

// Role-based authorization (enhanced to check relations)
const authorize = (...roles) => {
  return (req, res, next) => {
    let hasAccess = false;
    
    // Check direct role
    if (roles.includes(req.user.role)) {
      hasAccess = true;
    }
    
    // Check if acting as SELLER (has a store)
    if (roles.includes('SELLER') && req.user.store && req.user.store.status === 'APPROVED') {
      hasAccess = true;
    }
    
    // Check if acting as COURIER (has a courier profile)
    if (roles.includes('COURIER') && req.user.courierProfile && req.user.courierProfile.status === 'APPROVED') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk melakukan ini.'
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
