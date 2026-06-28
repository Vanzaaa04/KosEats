const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Menghapus data lama dan memasukkan akun bersih...');

  // Clean existing data
  await prisma.locationTracking.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.appeal.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.message.deleteMany();
  await prisma.order.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.nutrition.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.store.deleteMany();
  await prisma.courierProfile.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // ====== CREATE ADMIN ======
  await prisma.user.create({
    data: {
      name: 'Admin KosEats',
      email: 'admin@koseats.id',
      passwordHash,
      role: 'ADMIN',
      phone: '08123456789'
    }
  });
  console.log('✅ Akun Admin berhasil dibuat (admin@koseats.id)');

  // ====== CREATE BUYERS ======
  await Promise.all([
    prisma.user.create({
      data: { name: 'Irgi Nabil', email: 'irgi@mahasiswa.id', passwordHash, role: 'BUYER', phone: '08111111111', address: 'Kos Putra Jl. Tirto Taruno No. 12, Malang', latitude: -7.9426, longitude: 112.6133 }
    }),
    prisma.user.create({
      data: { name: 'Ariel Ardiansyah', email: 'ariel@mahasiswa.id', passwordHash, role: 'BUYER', phone: '08222222222', address: 'Kos Melati Jl. Tlogomas No. 45, Malang', latitude: -7.9445, longitude: 112.6098 }
    })
  ]);
  console.log('✅ Akun Pembeli berhasil dibuat (irgi@mahasiswa.id, ariel@mahasiswa.id)');

  // ====== CREATE SELLERS + STORES ======
  const seller1 = await prisma.user.create({
    data: { name: 'Bu Tini', email: 'butini@mitra.id', passwordHash, role: 'SELLER', phone: '08666666666', address: 'Gang Masjid, Tlogomas, Malang', latitude: -7.9430, longitude: 112.6120 }
  });
  await prisma.store.create({
    data: { userId: seller1.id, name: 'Dapur Bu Tini', description: 'Masakan rumahan Jawa khas ibu.', address: 'Gang Masjid RT 03, Tlogomas, Malang', photoUrl: '/images/stores/dapur-bu-tini.jpg', latitude: -7.9430, longitude: 112.6120, openTime: '07:00', closeTime: '20:00', isOpen: true, status: 'APPROVED' }
  });

  const seller2 = await prisma.user.create({
    data: { name: 'Bu Asih', email: 'buasih@mitra.id', passwordHash, role: 'SELLER', phone: '08777777777', address: 'Jl. Tirto Taruno No. 5, Malang', latitude: -7.9422, longitude: 112.6140 }
  });
  await prisma.store.create({
    data: { userId: seller2.id, name: 'Warung Asih Homemade', description: 'Spesialis rendang dan opor ayam.', address: 'Jl. Tirto Taruno No. 5, Malang', photoUrl: '/images/stores/warung-asih.jpg', latitude: -7.9422, longitude: 112.6140, openTime: '08:00', closeTime: '21:00', isOpen: true, status: 'APPROVED' }
  });

  console.log('✅ Akun Penjual beserta Tokonya berhasil dibuat (butini@mitra.id, buasih@mitra.id)');
  
  console.log('\n=============================================');
  console.log('🎉 SUKSES! Password SEMUA akun di atas adalah: password123');
  console.log('=============================================');
}

main()
  .catch(console.error)
  .finally(async () => { await prisma.$disconnect(); });
