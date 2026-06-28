const express = require('express');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Supabase Storage belum dikonfigurasi di server.' });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = req.file.fieldname + '-' + uniqueSuffix + path.extname(req.file.originalname);
    
    const { data, error } = await supabase.storage.from('koseats').upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('koseats').getPublicUrl(fileName);

    res.json({
      success: true,
      message: 'Gambar berhasil diunggah',
      data: { url: publicUrlData.publicUrl }
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
