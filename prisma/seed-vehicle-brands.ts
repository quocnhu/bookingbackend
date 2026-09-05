import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BRAND_BY_SEAT: Record<number, string> = {
  7: 'Thaco',
  12: 'Toyota',
  16: 'Hyundai',
  29: 'Samco',
  45: 'Thaco',
};

async function main() {
  const vehicles = await prisma.vehicle.findMany({ select: { id: true, capacity: true } });
  let updated = 0;
  for (const v of vehicles) {
    const brand = BRAND_BY_SEAT[v.capacity ?? 12];
    if (!brand) continue;
    await prisma.vehicle.update({
      where: { id: v.id },
      data: { brand },
    });
    updated++;
  }
  console.log(`✅ Assigned brand to ${updated} vehicles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
