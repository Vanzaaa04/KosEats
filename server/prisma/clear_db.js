const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Menghapus seluruh data KosEats...');
  
  // Hapus dari yang paling bergantung (child) ke induk (parent)
  await prisma.review.deleteMany();
  await prisma.appeal.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.store.deleteMany();
  
  // Hapus User kecuali ADMIN
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: { not: 'ADMIN' }
    }
  });

  console.log(`✅ ${deletedUsers.count} User dihapus. Hanya Admin yang tersisa.`);
  console.log('✨ Database berhasil dikosongkan!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
