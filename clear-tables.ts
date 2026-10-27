import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing RawData, Booking, Assignment tables...');
  // Use TRUNCATE with CASCADE to handle foreign keys
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "RawData", "Booking", "Assignment" RESTART IDENTITY CASCADE;
  `);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
