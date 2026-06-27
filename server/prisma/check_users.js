const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
  console.table(users);
  console.log('Total:', users.length, 'akun');
  
  const stores = await p.store.findMany({
    select: { id: true, name: true, status: true, userId: true }
  });
  if (stores.length > 0) {
    console.log('\nToko terdaftar:');
    console.table(stores);
  }
}

main().finally(() => p.$disconnect());
