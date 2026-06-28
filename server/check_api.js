const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const revenueResult = await prisma.order.aggregate({
    where: { paymentStatus: 'PAID' },
    _sum: { platformFee: true, total: true },
    _count: true
  });

  const totalRevenue = revenueResult._sum.platformFee || 0;
  const totalGMV = revenueResult._sum.total || 0;
  const totalTransactions = revenueResult._count;

  const totalUsers = await prisma.user.count({ 
    where: { role: { in: ['BUYER', 'SELLER'] } } 
  });
  const pendingSellers = await prisma.store.count({ where: { status: 'PENDING' } });

  console.log(JSON.stringify({
    totalRevenue, totalGMV, totalTransactions, totalUsers, pendingSellers
  }));
}

main().finally(() => prisma.$disconnect());
