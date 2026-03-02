import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create superadmin
  const passwordHash = await bcrypt.hash('superadmin-change-me-immediately', 12);
  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@fatedworld.com' },
    update: {},
    create: {
      username: 'fatedadmin',
      email: 'admin@fatedworld.com',
      displayName: 'Fated Admin',
      passwordHash,
      role: UserRole.superadmin,
      emailVerified: true,
    },
  });

  await prisma.tokenWallet.upsert({
    where: { userId: superadmin.id },
    update: {},
    create: { userId: superadmin.id },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: superadmin.id },
    update: {},
    create: { userId: superadmin.id },
  });

  console.log(`Created superadmin: ${superadmin.email}`);
  console.log('IMPORTANT: Change the superadmin password immediately after first login!');
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
