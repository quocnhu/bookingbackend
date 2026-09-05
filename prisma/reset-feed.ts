import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Before reset:');
  const before = {
    rawData: await prisma.rawData.count(),
    booking: await prisma.booking.count(),
    assignment: await prisma.assignment.count(),
  };
  console.log('  ', JSON.stringify(before));

  console.log('\n🔄 Clearing rawData, booking, assignment (dependency order)...');

  // Lớp 2 quyết toán theo assignment
  await prisma.settlement.deleteMany();
  await prisma.tourReport.deleteMany();

  // Booking trước (RawData có relation 1-1 sang Booking; RawData.booking giữ FK rawDataId ở Booking)
  await prisma.booking.deleteMany();
  await prisma.rawData.deleteMany();
  await prisma.assignment.deleteMany();

  const after = {
    rawData: await prisma.rawData.count(),
    booking: await prisma.booking.count(),
    assignment: await prisma.assignment.count(),
  };
  console.log('✅ After reset:', JSON.stringify(after));

  const totals = await Promise.all([
    prisma.booking.count({ where: { assignmentId: null } }),
    prisma.booking.count({ where: { assignmentId: { not: null } } }),
  ]);
  console.log(
    `\n📋 Bookings unassigned: ${totals[0]}, assigned: ${totals[1]}`,
  );
  console.log('\n🟢 Ready to re-feed. Import raw data / run auto-assign again.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
