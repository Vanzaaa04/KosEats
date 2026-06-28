const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const os = require('os');

// Konfigurasi multer untuk upload file
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan.'));
    }
  }
});

// POST /api/kyc/ocr-ktp — Baca teks KTP menggunakan Gemini Vision AI
router.post('/ocr-ktp', upload.single('ktp'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File KTP tidak ditemukan.' });
    }

    const { inputName } = req.body;
    if (!inputName) {
      return res.status(400).json({ success: false, message: 'Nama input tidak ditemukan.' });
    }

    // Baca file gambar dan convert ke base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    // Inisialisasi Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Kirim gambar KTP ke Gemini Vision AI
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      },
      {
        text: `Kamu adalah AI pemindai KTP Indonesia. Analisis foto KTP ini dan berikan hasilnya dalam format JSON saja (tanpa markdown, tanpa backtick).

Format output yang WAJIB:
{"nama": "NAMA LENGKAP", "nik": "NOMOR NIK", "tempat_lahir": "KOTA", "tanggal_lahir": "DD-MM-YYYY", "alamat": "ALAMAT LENGKAP", "raw_text": "seluruh teks yang terbaca"}

Jika ada bagian yang tidak terbaca, isi dengan string kosong "".
PENTING: Output HANYA JSON murni, tidak ada teks lain.`
      }
    ]);

    const responseText = result.response.text().trim();
    
    // Parse JSON dari Gemini
    let ktpData;
    try {
      // Bersihkan jika ada backtick markdown
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      ktpData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[GEMINI] Gagal parse JSON:', responseText);
      ktpData = { nama: '', raw_text: responseText };
    }

    // Cocokkan nama input dengan nama di KTP
    const ktpName = (ktpData.nama || '').toLowerCase().replace(/[^a-z ]/g, '');
    const userInputName = inputName.toLowerCase().replace(/[^a-z ]/g, '');
    
    const ktpWords = ktpName.split(' ').filter(w => w.length >= 3);
    const inputWords = userInputName.split(' ').filter(w => w.length >= 3);
    
    let matchCount = 0;
    for (const word of inputWords) {
      if (ktpWords.some(kw => kw.includes(word) || word.includes(kw))) {
        matchCount++;
      }
    }
    
    const isMatch = inputWords.length > 0 && matchCount >= Math.ceil(inputWords.length / 2);

    // Hapus file temporary
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        ktpData,
        inputName: inputName,
        ktpName: ktpData.nama || 'Tidak terbaca',
        isMatch,
        matchCount,
        totalWords: inputWords.length
      }
    });

  } catch (error) {
    console.error('[GEMINI ERROR]', error);
    // Hapus file jika ada error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Gagal memproses KTP. ' + (error.message || ''),
    });
  }
});

module.exports = router;
