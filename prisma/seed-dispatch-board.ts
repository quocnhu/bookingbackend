import 'dotenv/config';
import { PrismaClient, TourType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Dispatch-board seed — stops at booking → assignment (bus).
 * - Multiple bookings per bus (group buses filled from several bookings).
 * - Crew picked per date with multi-day overlap guard: a guide/driver still
 *   running a multi-day tour is NEVER reused on overlapping dates (same rule
 *   as AssignmentsService.assertCrewNoOverlap).
 * - Buses stay PENDING with crew + vehicle assigned. Manual dispatch,
 *   tour reports and accounting are left for later manual testing.
 */

const day = (offset: number): Date => {
  const now = new Date();
  const utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset, 0, 0, 0, 0);
  return new Date(utc);
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const overlaps = (aS: Date, aE: Date, bS: Date, bE: Date) =>
  aS.getTime() <= bE.getTime() && bS.getTime() <= aE.getTime();

interface BusPlan {
  code: string;
  tourCode: string;
  startOffset: number;
  days: number;
  bookings: Array<{ ref: string; customer: string; pax: number; hotel: string }>;
  guideId: string;
  driverId: string;
}

// Deterministic plan: covers 1-day / 2-day / 3-day, multi-booking buses,
// same-date different crew, and multi-day overlap blocking (Bus 4 skips Bus 3
// crew; Bus 7 skips Bus 6 crew).
const PLAN: BusPlan[] = [
  {
    code: 'Seed Bus 01',
    tourCode: 'TOUR-0002',
    startOffset: 1,
    days: 1,
    bookings: [
      { ref: 'SEED-GR-0001', customer: 'Emma Watson', pax: 4, hotel: 'Fusion Maia' },
      { ref: 'SEED-GR-0002', customer: 'John Carter', pax: 3, hotel: 'Danang Golden Bay' },
      { ref: 'SEED-GR-0003', customer: 'Sophia Lee', pax: 2, hotel: 'TMS Hotel' },
    ],
    guideId: 'crew-guide-huong',
    driverId: 'crew-driver-tai',
  },
  {
    code: 'Seed Bus 02',
    tourCode: 'TOUR-0001',
    startOffset: 1,
    days: 1,
    bookings: [
      { ref: 'SEED-PV-0001', customer: 'Liam Smith', pax: 2, hotel: 'A La Carte' },
    ],
    guideId: 'crew-guide-anh',
    driverId: 'crew-driver-son',
  },
  {
    code: 'Seed Bus 03',
    tourCode: 'TOUR-0003',
    startOffset: 2,
    days: 2,
    bookings: [
      { ref: 'SEED-GR-0004', customer: 'Olivia Brown', pax: 5, hotel: 'Pulchra Resort' },
      { ref: 'SEED-GR-0005', customer: 'Noah Wilson', pax: 4, hotel: 'Palm Garden Resort' },
    ],
    guideId: 'crew-guide-mai',
    driverId: 'crew-driver-binh',
  },
  {
    // Overlaps Bus 03 (day 3) → must NOT reuse Mai/Binh.
    code: 'Seed Bus 04',
    tourCode: 'TOUR-0004',
    startOffset: 3,
    days: 1,
    bookings: [
      { ref: 'SEED-PV-0002', customer: 'Mia Johnson', pax: 2, hotel: 'Hoi An Riverside' },
      { ref: 'SEED-PV-0003', customer: 'Lucas Davis', pax: 3, hotel: 'Sea & Sun Hotel' },
    ],
    guideId: 'crew-guide-lan',
    driverId: 'crew-driver-minh',
  },
  {
    code: 'Seed Bus 05',
    tourCode: 'TOUR-0005',
    startOffset: 4,
    days: 2,
    bookings: [
      { ref: 'SEED-GR-0006', customer: 'Ava Miller', pax: 3, hotel: 'InterContinental' },
      { ref: 'SEED-GR-0007', customer: 'Ethan Brown', pax: 3, hotel: 'Aria Grand Hotel' },
      { ref: 'SEED-GR-0008', customer: 'Isabella Wilson', pax: 4, hotel: 'Fusion Maia' },
    ],
    guideId: 'crew-guide-huong',
    driverId: 'crew-driver-tai',
  },
  {
    code: 'Seed Bus 06',
    tourCode: 'TOUR-0006',
    startOffset: 6,
    days: 3,
    bookings: [
      { ref: 'SEED-GR-0009', customer: 'Mason Taylor', pax: 4, hotel: 'Danang Golden Bay' },
      { ref: 'SEED-GR-0010', customer: 'Charlotte White', pax: 4, hotel: 'TMS Hotel' },
      { ref: 'SEED-GR-0011', customer: 'Logan Harris', pax: 3, hotel: 'Pulchra Resort' },
    ],
    guideId: 'crew-guide-anh',
    driverId: 'crew-driver-long',
  },
  {
    // Overlaps Bus 06 (day 7) → must NOT reuse Anh/Long.
    code: 'Seed Bus 07',
    tourCode: 'TOUR-0002',
    startOffset: 7,
    days: 1,
    bookings: [
      { ref: 'SEED-GR-0012', customer: 'Amelia Clark', pax: 6, hotel: 'Palm Garden Resort' },
      { ref: 'SEED-GR-0013', customer: 'Benjamin Lewis', pax: 5, hotel: 'A La Carte' },
    ],
    guideId: 'crew-guide-mai',
    driverId: 'crew-driver-phuc',
  },
];

async function main() {
  // Safety: refuse to run on a DB that still has assignments.
  const existing = await prisma.assignment.count();
  if (existing > 0) {
    throw new Error(
      `Refusing to seed: ${existing} assignment(s) still exist. Run prisma/reset-bookings-assignments.ts first.`,
    );
  }

  const tours = await prisma.tour.findMany();
  const tourByCode = new Map(tours.map((t) => [t.code, t]));
  for (const b of PLAN) {
    if (!tourByCode.has(b.tourCode)) throw new Error(`Tour ${b.tourCode} missing — run 'npm run seed' first`);
  }

  // Validate crew exists.
  const crewIds = [...new Set(PLAN.flatMap((b) => [b.guideId, b.driverId]))];
  const crew = await prisma.user.findMany({ where: { id: { in: crewIds } }, select: { id: true, name: true } });
  if (crew.length !== crewIds.length) {
    throw new Error(`Crew missing: expected ${crewIds.join(', ')}, found ${crew.map((c) => c.id).join(', ')}`);
  }

  // Validate the plan itself has no crew overlap (same rule as the backend guard).
  const ranges: Array<{ s: Date; e: Date; guide: string; driver: string; code: string }> = [];
  for (const b of PLAN) {
    const s = day(b.startOffset);
    const e = addDays(s, b.days - 1);
    for (const r of ranges) {
      if (overlaps(s, e, r.s, r.e)) {
        if (r.guide === b.guideId)
          throw new Error(`Plan overlap: guide ${b.guideId} on ${b.code} overlaps ${r.code}`);
        if (r.driver === b.driverId)
          throw new Error(`Plan overlap: driver ${b.driverId} on ${b.code} overlaps ${r.code}`);
      }
    }
    ranges.push({ s, e, guide: b.guideId, driver: b.driverId, code: b.code });
  }

  // Pick smallest vehicle that fits pax (prefer Company Fleet, like dispatch).
  const vehicles = await prisma.vehicle.findMany({
    include: { provider: { select: { isCompany: true, name: true } } },
    orderBy: { capacity: 'asc' },
  });

  let bookingCount = 0;
  for (const b of PLAN) {
    const tour = tourByCode.get(b.tourCode)!;
    const startDate = day(b.startOffset);
    const endDate = addDays(startDate, b.days - 1);
    const totalPax = b.bookings.reduce((s, x) => s + x.pax, 0);
    const vehicle =
      vehicles.find((v) => (v.capacity ?? 12) >= totalPax && v.provider.isCompany) ??
      vehicles.find((v) => (v.capacity ?? 12) >= totalPax);
    if (!vehicle) throw new Error(`No vehicle fits ${totalPax} pax for ${b.code}`);

    const bus = await prisma.assignment.create({
      data: {
        code: b.code,
        startDate,
        endDate,
        status: 'PENDING',
        tourType: tour.type,
        tourName: tour.name,
        durationDays: b.days,
        createdWho: 'Seed',
        origin: 'MANUAL',
        vehicleId: vehicle.id,
        providerId: vehicle.providerId,
        driverId: b.driverId,
        guideId: b.guideId,
      },
    });

    let seq = 0;
    for (const bk of b.bookings) {
      seq += 1;
      await prisma.booking.create({
        data: {
          bookingRef: bk.ref,
          source: 'manual',
          confirmationCode: bk.ref,
          channel: 'MANUAL',
          status: 'PENDING',
          tourId: tour.id,
          tourName: tour.name,
          tourType: tour.type,
          startingDate: startDate,
          customerName: bk.customer,
          hotelName: bk.hotel,
          address: bk.hotel,
          latitude: 16.06,
          longitude: 108.24,
          phone: '+84 900 0000',
          mail: `${bk.customer.toLowerCase().replace(/\s+/g, '.')}@seed.local`,
          totalPax: bk.pax,
          paxDetail: `${bk.pax} guests`,
          payment: 'PAID',
          createdWho: 'Seed',
          assignmentId: bus.id,
          paxSequence: seq,
        },
      });
      bookingCount += 1;
    }
    const guide = crew.find((c) => c.id === b.guideId)?.name ?? b.guideId;
    const driver = crew.find((c) => c.id === b.driverId)?.name ?? b.driverId;
    console.log(
      `✅ ${b.code} ${tour.code} ${startDate.toISOString().slice(0, 10)}→${endDate.toISOString().slice(0, 10)} ` +
        `${b.bookings.length} booking(s)/${totalPax} pax · Guide ${guide} · Driver ${driver} · ${vehicle.plateNumber}`,
    );
  }

  console.log(`\n✅ Seeded ${PLAN.length} buses, ${bookingCount} bookings (all PENDING, crew assigned, no dispatch yet)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
