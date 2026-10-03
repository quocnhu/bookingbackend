import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Before reset:');
  const before = {
    paymentPeriodLine: await prisma.paymentPeriodLine.count(),
    paymentPeriod: await prisma.paymentPeriod.count(),
    settlement: await prisma.settlement.count(),
    tourReport: await prisma.tourReport.count(),
    booking: await prisma.booking.count(),
    assignment: await prisma.assignment.count(),
    rawData: await prisma.rawData.count(),
  };
  console.log('  ', JSON.stringify(before, null, 2));

  console.log('\n🔄 Clearing verification queue + booking + assignment (dependency order)...');

  // 1. Payment periods & lines (FK -> Assignment)
  console.log('Deleting PaymentPeriodLine...');
  await prisma.paymentPeriodLine.deleteMany({});
  console.log('Deleting PaymentPeriod...');
  await prisma.paymentPeriod.deleteMany({});

  // 2. Settlements (self-ref reversals first, FK -> Assignment/Booking)
  console.log('Clearing Settlement reversals...');
  await prisma.settlement.updateMany({
    where: { reversesId: { not: null } },
    data: { reversesId: null },
  });
  console.log('Deleting Settlement...');
  await prisma.settlement.deleteMany({});

  // 3. Verification queue = TourReport (FK -> Assignment)
  console.log('Deleting TourReport (verification queue)...');
  await prisma.tourReport.deleteMany({});

  // 4. Detach bookings from assignments (FK Booking.assignmentId + movedFromBusId)
  console.log('Detaching bookings from assignments...');
  await prisma.booking.updateMany({
    where: { OR: [{ assignmentId: { not: null } }, { movedFromBusId: { not: null } }] },
    data: { assignmentId: null, movedFromBusId: null, paxSequence: 0 },
  });

  // 5. Assignments
  console.log('Deleting Assignment...');
  await prisma.assignment.deleteMany({});

  // 6. Bookings
  console.log('Deleting Booking...');
  await prisma.booking.deleteMany({});

  // 7. RawData (booking source, 1-1 with Booking)
  console.log('Deleting RawData...');
  await prisma.rawData.deleteMany({});

  // 8. Assignment/booking-related notifications only (keep leave/general)
  console.log('Deleting assignment-related Notifications...');
  await prisma.notification.deleteMany({
    where: {
      type: {
        in: [
          'ASSIGNED',
          'TRANSFERRED',
          'CANCELED',
          'REPORT_VERIFIED',
          'REPORT_REJECTED',
          'MONEY_REJECTED',
          'MONEY_VERIFIED',
        ],
      },
    },
  });

  // 9. Clean uploads folders for these domains (same pattern as reset-bookings-assignments.ts)
  const fs = await import('fs');
  const path = await import('path');
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsRoot)) {
    const dirs = ['assignments', 'bookings', 'evidence'];
    for (const dir of dirs) {
      const fullPath = path.join(uploadsRoot, dir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`Removed uploads/${dir}`);
      }
    }
  }

  // 10. Drain BullMQ Redis queues (assign / booking-manual / parsing) — best effort
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const { default: IORedis } = await import('ioredis');
    const redis = new IORedis(redisUrl, { maxRetriesPerRequest: 1 });
    const keys: string[] = [];
    for (const pattern of ['bull:assign:*', 'bull:booking-manual:*', 'bull:parsing:*']) {
      let cursor = '0';
      do {
        const [next, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
        cursor = next;
        keys.push(...found);
      } while (cursor !== '0');
    }
    if (keys.length) {
      await redis.del(...keys);
      console.log(`Drained ${keys.length} Redis queue keys`);
    } else {
      console.log('No Redis queue keys to drain');
    }
    redis.disconnect();
  } catch (e) {
    console.log('Skipped Redis drain (redis not reachable):', (e as Error).message);
  }

  const after = {
    paymentPeriodLine: await prisma.paymentPeriodLine.count(),
    paymentPeriod: await prisma.paymentPeriod.count(),
    settlement: await prisma.settlement.count(),
    tourReport: await prisma.tourReport.count(),
    booking: await prisma.booking.count(),
    assignment: await prisma.assignment.count(),
    rawData: await prisma.rawData.count(),
  };
  console.log('\n✅ After reset:', JSON.stringify(after, null, 2));
  console.log('\n🟢 Ready. Preserved: users, tours, vehicles, providers, coords, roles, company profile.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
