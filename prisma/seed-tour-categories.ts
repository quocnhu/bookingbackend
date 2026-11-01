import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { applyTourCategories } from './tour-categories';

const prisma = new PrismaClient();

async function main() {
  const result = await applyTourCategories(prisma);
  console.log(
    `Seeded ${result.categories} tour categories and assigned ${result.assigned} tours.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
