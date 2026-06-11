const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      role: 'ADMIN',
    },
    create: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Admin upserted (created or already exists).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
