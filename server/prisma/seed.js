const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding KosEats database...');

  // Clean existing data
  await prisma.locationTracking.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.appeal.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.nutrition.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // ====== CREATE ADMIN ======
  const admin = await prisma.user.create({
    data: {
      name: 'Admin KosEats',
      email: 'admin@koseats.id',
      passwordHash,
      role: 'ADMIN',
      phone: '08123456789'
    }
  });
  console.log('✅ Admin created');

  // ====== CREATE BUYERS ======
  const buyers = await Promise.all([
    prisma.user.create({
      data: { name: 'Irgi Nabil', email: 'irgi@mahasiswa.id', passwordHash, role: 'BUYER', phone: '08111111111', address: 'Kos Putra Jl. Tirto Taruno No. 12, Malang', latitude: -7.9426, longitude: 112.6133 }
    }),
    prisma.user.create({
      data: { name: 'Ariel Ardiansyah', email: 'ariel@mahasiswa.id', passwordHash, role: 'BUYER', phone: '08222222222', address: 'Kos Melati Jl. Tlogomas No. 45, Malang', latitude: -7.9445, longitude: 112.6098 }
    }),
    prisma.user.create({
      data: { name: 'Faris Ramadhan', email: 'faris@mahasiswa.id', passwordHash, role: 'BUYER', phone: '08333333333', address: 'Kos Mawar Jl. Sumbersari No. 8, Malang', latitude: -7.9418, longitude: 112.6150 }
    }),
    prisma.user.create({
      data: { name: 'Sinta Dewi', email: 'sinta@mahasiswa.id', passwordHash, role: 'BUYER', phone: '08444444444', address: 'Kos Putri Sakura Jl. Bendungan Sutami, Malang', latitude: -7.9390, longitude: 112.6125 }
    }),
    prisma.user.create({
      data: { name: 'Budi Santoso', email: 'budi@mahasiswa.id', passwordHash, role: 'BUYER', phone: '08555555555', address: 'Kos Griya Jl. Candi Panggung, Malang', latitude: -7.9455, longitude: 112.6088 }
    }),
    prisma.user.create({
      data: { name: 'Bang Jago Ojol', email: 'kurir@koseats.com', passwordHash, role: 'COURIER', phone: '08555555555', address: 'Pangkalan ITS', latitude: -7.9400, longitude: 112.6100 }
    })
  ]);
  console.log('✅ 5 Buyers and 1 Courier created');

  // ====== CREATE SELLERS + STORES ======
  const seller1 = await prisma.user.create({
    data: { name: 'Bu Tini', email: 'butini@mitra.id', passwordHash, role: 'SELLER', phone: '08666666666', address: 'Gang Masjid, Tlogomas, Malang', latitude: -7.9430, longitude: 112.6120 }
  });
  const store1 = await prisma.store.create({
    data: { userId: seller1.id, name: 'Dapur Bu Tini', description: 'Masakan rumahan Jawa khas ibu, setiap hari menu berbeda. Dijamin seperti masakan di rumah sendiri!', address: 'Gang Masjid RT 03, Tlogomas, Malang', photoUrl: '/images/stores/dapur-bu-tini.jpg', latitude: -7.9430, longitude: 112.6120, openTime: '07:00', closeTime: '20:00', isOpen: true, status: 'APPROVED' }
  });

  const seller2 = await prisma.user.create({
    data: { name: 'Bu Asih', email: 'buasih@mitra.id', passwordHash, role: 'SELLER', phone: '08777777777', address: 'Jl. Tirto Taruno No. 5, Malang', latitude: -7.9422, longitude: 112.6140 }
  });
  const store2 = await prisma.store.create({
    data: { userId: seller2.id, name: 'Warung Asih Homemade', description: 'Spesialis rendang dan opor ayam. Bumbu resep turun-temurun dari Padang.', address: 'Jl. Tirto Taruno No. 5, Malang', photoUrl: '/images/stores/warung-asih.jpg', latitude: -7.9422, longitude: 112.6140, openTime: '08:00', closeTime: '21:00', isOpen: true, status: 'APPROVED' }
  });

  const seller3 = await prisma.user.create({
    data: { name: 'Pak Darto', email: 'pakdarto@mitra.id', passwordHash, role: 'SELLER', phone: '08888888888', address: 'Jl. Sumbersari Gang 4, Malang', latitude: -7.9415, longitude: 112.6155 }
  });
  const store3 = await prisma.store.create({
    data: { userId: seller3.id, name: 'Gorengan Pak Darto', description: 'Gorengan renyah setiap sore! Tahu isi, bakwan, risol, tempe mendoan. Panas-panas langsung dari wajan.', address: 'Jl. Sumbersari Gang 4, Malang', photoUrl: '/images/stores/gorengan-darto.jpg', latitude: -7.9415, longitude: 112.6155, openTime: '14:00', closeTime: '19:00', isOpen: true, status: 'APPROVED' }
  });

  console.log('✅ 3 Sellers + Stores created');

  // ====== CREATE MENUS WITH NUTRITION ======
  // Store 1: Dapur Bu Tini
  const menu1 = await prisma.menu.create({
    data: {
      storeId: store1.id, name: 'Nasi Ayam Geprek Sambal Bawang', description: 'Ayam goreng tepung digeprek dengan sambal bawang pedas manis. Disajikan dengan nasi putih hangat dan lalapan.', photoUrl: '/images/menus/ayam-geprek.jpg', price: 15000, dailyStock: 30, category: 'NASI_LAUK',
      nutrition: { create: { calories: 450, proteinG: 25.0, carbsG: 55.0, fatG: 15.0, ingredients: 'Ayam, tepung terigu, bawang putih, cabai rawit, bawang merah, nasi putih' } }
    }
  });
  const menu2 = await prisma.menu.create({
    data: {
      storeId: store1.id, name: 'Nasi Pecel Komplit', description: 'Nasi pecel dengan bumbu kacang khas Jawa Timur, dilengkapi tempe goreng, tahu, dan sayur bayam.', photoUrl: '/images/menus/nasi-pecel.jpg', price: 12000, dailyStock: 25, category: 'NASI_LAUK',
      nutrition: { create: { calories: 380, proteinG: 18.0, carbsG: 48.0, fatG: 12.0, ingredients: 'Nasi, kacang tanah, bayam, kacang panjang, tempe, tahu, cabai' } }
    }
  });
  const menu3 = await prisma.menu.create({
    data: { storeId: store1.id, name: 'Sayur Lodeh', description: 'Sayur lodeh santan gurih ala rumahan. Isinya labu siam, tahu, tempe, dan kacang panjang.', photoUrl: '/images/menus/sayur-lodeh.jpg', price: 8000, dailyStock: 20, category: 'SAYUR' }
  });
  const menu4 = await prisma.menu.create({
    data: { storeId: store1.id, name: 'Tempe Orek Kering', description: 'Tempe orek manis gurih, cocok buat teman nasi.', photoUrl: '/images/menus/tempe-orek.jpg', price: 5000, dailyStock: 30, category: 'LAUK' }
  });
  const menu5 = await prisma.menu.create({
    data: {
      storeId: store1.id, name: 'Paket Hemat Bu Tini', description: 'Nasi + ayam goreng + sayur + tempe orek + es teh. Hemat dan kenyang!', photoUrl: '/images/menus/paket-hemat.jpg', price: 18000, dailyStock: 15, category: 'PAKET',
      nutrition: { create: { calories: 620, proteinG: 30.0, carbsG: 72.0, fatG: 22.0, ingredients: 'Nasi, ayam, sayur asem, tempe orek, teh manis' } }
    }
  });

  // Store 2: Warung Asih
  const menu6 = await prisma.menu.create({
    data: {
      storeId: store2.id, name: 'Nasi Rendang Sapi', description: 'Rendang sapi empuk dengan bumbu rempah khas Minang. Dimasak berjam-jam sampai meresap.', photoUrl: '/images/menus/nasi-rendang.jpg', price: 20000, dailyStock: 20, category: 'NASI_LAUK',
      nutrition: { create: { calories: 520, proteinG: 28.0, carbsG: 50.0, fatG: 22.0, ingredients: 'Daging sapi, santan, serai, lengkuas, kunyit, cabai, nasi putih' } }
    }
  });
  const menu7 = await prisma.menu.create({
    data: {
      storeId: store2.id, name: 'Opor Ayam Kuah Kuning', description: 'Opor ayam kampung kuah santan kuning. Cocok dimakan pake lontong atau nasi.', photoUrl: '/images/menus/opor-ayam.jpg', price: 18000, dailyStock: 15, category: 'NASI_LAUK',
      nutrition: { create: { calories: 480, proteinG: 26.0, carbsG: 45.0, fatG: 20.0, ingredients: 'Ayam kampung, santan, kunyit, ketumbar, kemiri, daun salam' } }
    }
  });
  const menu8 = await prisma.menu.create({
    data: { storeId: store2.id, name: 'Telur Balado', description: 'Telur rebus dengan sambal balado merah yang pedas manis.', photoUrl: '/images/menus/telur-balado.jpg', price: 7000, dailyStock: 25, category: 'LAUK' }
  });
  const menu9 = await prisma.menu.create({
    data: { storeId: store2.id, name: 'Es Teh Manis', description: 'Teh manis segar dingin, pake gula asli bukan pemanis buatan.', photoUrl: '/images/menus/es-teh.jpg', price: 3000, dailyStock: 50, category: 'MINUMAN' }
  });
  const menu10 = await prisma.menu.create({
    data: { storeId: store2.id, name: 'Sop Ayam Kampung', description: 'Sop ayam kampung bening dengan wortel, kentang, dan buncis. Segar dan sehat!', photoUrl: '/images/menus/sop-ayam.jpg', price: 15000, dailyStock: 12, category: 'SAYUR',
      nutrition: { create: { calories: 280, proteinG: 22.0, carbsG: 20.0, fatG: 8.0, ingredients: 'Ayam kampung, wortel, kentang, buncis, seledri, bawang putih' } }
    }
  });

  // Store 3: Gorengan Pak Darto
  const menu11 = await prisma.menu.create({
    data: { storeId: store3.id, name: 'Tahu Isi Sayur (5 pcs)', description: 'Tahu isi wortel dan bihun, digoreng krispi.', photoUrl: '/images/menus/tahu-isi.jpg', price: 5000, dailyStock: 40, category: 'CEMILAN' }
  });
  const menu12 = await prisma.menu.create({
    data: { storeId: store3.id, name: 'Bakwan Sayur (5 pcs)', description: 'Bakwan wortel dan kol, garing di luar lembut di dalam.', photoUrl: '/images/menus/bakwan.jpg', price: 5000, dailyStock: 40, category: 'CEMILAN' }
  });
  const menu13 = await prisma.menu.create({
    data: { storeId: store3.id, name: 'Risol Mayo Ayam (3 pcs)', description: 'Risol isi ayam suwir dan mayo. Cemilan favorit anak kos!', photoUrl: '/images/menus/risol.jpg', price: 8000, dailyStock: 30, category: 'CEMILAN' }
  });
  const menu14 = await prisma.menu.create({
    data: { storeId: store3.id, name: 'Tempe Mendoan (5 pcs)', description: 'Tempe mendoan tipis garing, sambal kecap.', photoUrl: '/images/menus/mendoan.jpg', price: 5000, dailyStock: 35, category: 'CEMILAN' }
  });
  const menu15 = await prisma.menu.create({
    data: { storeId: store3.id, name: 'Es Jeruk Segar', description: 'Jeruk peras segar dengan es batu.', photoUrl: '/images/menus/es-jeruk.jpg', price: 4000, dailyStock: 30, category: 'MINUMAN' }
  });

  console.log('✅ 15 Menus created (6 with nutrition info)');

  // ====== CREATE SAMPLE ORDERS ======
  const order1 = await prisma.order.create({
    data: {
      buyerId: buyers[0].id, storeId: store1.id, deliveryMethod: 'SELLER_DELIVERY',
      subtotal: 15000, deliveryFee: 2000, total: 17000,
      platformFee: 1800, sellerIncome: 13200,
      status: 'DELIVERED', paymentStatus: 'PAID',
      midtransOrderId: 'KE-SEED-001',
      items: { create: [{ menuId: menu1.id, quantity: 1, price: 15000 }] }
    }
  });
  const order2 = await prisma.order.create({
    data: {
      buyerId: buyers[1].id, storeId: store2.id, deliveryMethod: 'PICKUP',
      subtotal: 20000, deliveryFee: 0, total: 20000,
      platformFee: 2400, sellerIncome: 17600,
      status: 'DELIVERED', paymentStatus: 'PAID',
      midtransOrderId: 'KE-SEED-002',
      items: { create: [{ menuId: menu6.id, quantity: 1, price: 20000 }] }
    }
  });
  const order3 = await prisma.order.create({
    data: {
      buyerId: buyers[2].id, storeId: store1.id, deliveryMethod: 'SELLER_DELIVERY',
      subtotal: 30000, deliveryFee: 2000, total: 32000,
      platformFee: 3600, sellerIncome: 26400,
      status: 'DELIVERED', paymentStatus: 'PAID',
      midtransOrderId: 'KE-SEED-003',
      items: { create: [
        { menuId: menu2.id, quantity: 1, price: 12000 },
        { menuId: menu5.id, quantity: 1, price: 18000 }
      ]}
    }
  });
  const order4 = await prisma.order.create({
    data: {
      buyerId: buyers[3].id, storeId: store3.id, deliveryMethod: 'PICKUP',
      subtotal: 18000, deliveryFee: 0, total: 18000,
      platformFee: 2160, sellerIncome: 15840,
      status: 'DELIVERED', paymentStatus: 'PAID',
      midtransOrderId: 'KE-SEED-004',
      items: { create: [
        { menuId: menu11.id, quantity: 1, price: 5000 },
        { menuId: menu13.id, quantity: 1, price: 8000 },
        { menuId: menu14.id, quantity: 1, price: 5000 }
      ]}
    }
  });
  const order5 = await prisma.order.create({
    data: {
      buyerId: buyers[4].id, storeId: store2.id, deliveryMethod: 'SELLER_DELIVERY',
      subtotal: 38000, deliveryFee: 2000, total: 40000,
      platformFee: 4560, sellerIncome: 33440,
      status: 'COOKING', paymentStatus: 'PAID',
      midtransOrderId: 'KE-SEED-005',
      items: { create: [
        { menuId: menu7.id, quantity: 1, price: 18000 },
        { menuId: menu6.id, quantity: 1, price: 20000 }
      ]}
    }
  });

  console.log('✅ 5 Sample orders created');

  // ====== CREATE REVIEWS ======
  await prisma.review.createMany({
    data: [
      { orderId: order1.id, buyerId: buyers[0].id, storeId: store1.id, rating: 5, comment: 'Ayam gepreknya mantap banget! Sambal bawangnya nagih. Kaya masakan ibu di rumah 🥰' },
      { orderId: order2.id, buyerId: buyers[1].id, storeId: store2.id, rating: 5, comment: 'Rendang Bu Asih ga ada lawan! Empuk, bumbunya meresap. Worth it banget Rp 20rb.' },
      { orderId: order3.id, buyerId: buyers[2].id, storeId: store1.id, rating: 4, comment: 'Nasi pecelnya enak, porsi banyak. Cuma tadi agak lama nunggu karena rame.' },
      { orderId: order4.id, buyerId: buyers[3].id, storeId: store3.id, rating: 5, comment: 'Gorengannya garing sempurna! Risol mayo nya juara. Wajib coba sih guys!' }
    ]
  });
  console.log('✅ 4 Reviews created');

  // ====== CREATE SAMPLE DISCOUNTS ======
  await prisma.discount.create({
    data: { createdById: seller1.id, source: 'SELLER', type: 'FOOD', menuId: menu1.id, amount: 3000, quotaTotal: 10, quotaUsed: 2 }
  });
  await prisma.discount.create({
    data: { createdById: admin.id, source: 'ADMIN', type: 'DELIVERY', amount: 2000, quotaTotal: 50, quotaUsed: 5 }
  });
  await prisma.discount.create({
    data: { createdById: admin.id, source: 'ADMIN', type: 'FOOD', menuId: menu6.id, amount: 5000, quotaTotal: 20, quotaUsed: 3 }
  });
  console.log('✅ 3 Discounts created');

  // ====== CREATE NOTIFICATIONS ======
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, title: 'Platform Berjalan! 🚀', message: 'KosEats sudah aktif. Selamat mengelola platform!', type: 'SYSTEM' },
      { userId: buyers[0].id, title: 'Selamat Datang! 🍚', message: 'Halo Irgi! Yuk pesan makanan rumahan pertamamu.', type: 'SYSTEM' },
      { userId: seller1.id, title: 'Toko Disetujui! 🎉', message: 'Dapur Bu Tini sudah disetujui. Mulai tambahkan menu!', type: 'SYSTEM' }
    ]
  });
  console.log('✅ Notifications created');

  console.log('\n🍚 KosEats seeding complete!');
  console.log('\n📧 Login credentials (password: password123):');
  console.log('   Admin:  admin@koseats.id');
  console.log('   Buyer:  irgi@mahasiswa.id / ariel@mahasiswa.id / faris@mahasiswa.id');
  console.log('   Seller: butini@mitra.id / buasih@mitra.id / pakdarto@mitra.id');
}

main()
  .catch(console.error)
  .finally(async () => { await prisma.$disconnect(); });
