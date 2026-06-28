const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const buyersCount = await prisma.user.count({ where: { role: 'BUYER', isActive: true } });
  const sellersCount = await prisma.store.count({ where: { status: 'APPROVED' } });
  
  console.log('Buyers:', buyersCount);
  console.log('Sellers:', sellersCount);
}

main().finally(() => prisma.$disconnect());
