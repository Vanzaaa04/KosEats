const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const os = require('os');

// Setup Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to tmp for Vercel support
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    // Make unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (Only Images)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Max 5MB
  },
  fileFilter: fileFilter
});

// POST /api/upload — Upload single image
router.post('/', authenticate, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
    }

    // Return the URL path
    const fileUrl = `/public/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Gambar berhasil diunggah',
      data: { url: fileUrl }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
