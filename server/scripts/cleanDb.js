const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function cleanDb() {
  console.log("Memulai pembersihan database...");
  
  try {
    // 1. Hapus data berelasi (dari anak ke induk)
    console.log("Menghapus data Message...");
    await prisma.message.deleteMany({});
    
    console.log("Menghapus data Favorite...");
    await prisma.favorite.deleteMany({});
    
    console.log("Menghapus data LocationTracking...");
    await prisma.locationTracking.deleteMany({});
    
    console.log("Menghapus data Notification...");
    await prisma.notification.deleteMany({});
    
    console.log("Menghapus data Appeal...");
    await prisma.appeal.deleteMany({});
    
    console.log("Menghapus data Review...");
    await prisma.review.deleteMany({});
    
    console.log("Menghapus data Order Item...");
    await prisma.orderItem.deleteMany({});
    
    console.log("Menghapus data Order...");
    await prisma.order.deleteMany({});
    
    console.log("Menghapus data Discount...");
    await prisma.discount.deleteMany({});
    
    console.log("Menghapus data Nutrition...");
    await prisma.nutrition.deleteMany({});
    
    console.log("Menghapus data Menu...");
    await prisma.menu.deleteMany({});
    
    console.log("Menghapus data Transaksi Dompet...");
    await prisma.walletTransaction.deleteMany({});
    
    console.log("Menghapus data Profil Kurir...");
    await prisma.courierProfile.deleteMany({});
    
    console.log("Menghapus data Toko...");
    await prisma.store.deleteMany({});
    
    // 2. Hapus semua user KECUALI admin yang diminta
    const adminEmail = 'arielardiansyah050316@gmail.com';
    console.log(`Menghapus data User (kecuali admin: ${adminEmail})...`);
    
    await prisma.user.deleteMany({
      where: {
        email: {
          not: adminEmail
        }
      }
    });

    // 3. Pastikan admin ada, jika belum buat baru, jika sudah update passwordnya
    console.log("Memeriksa keberadaan akun admin utama...");
    const adminPassword = '12345678';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log("Admin sudah ada, memperbarui password & role...");
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          passwordHash: passwordHash,
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log("Akun admin diperbarui!");
    } else {
      console.log("Admin belum ada, membuat akun admin baru...");
      await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: adminEmail,
          passwordHash: passwordHash,
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log("Akun admin berhasil dibuat!");
    }

    console.log("Pembersihan database berhasil diselesaikan!");
    
  } catch (error) {
    console.error("Gagal membersihkan database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDb();
