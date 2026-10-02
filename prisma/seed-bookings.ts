import 'dotenv/config';
import { PrismaClient, RoleType, TourType, GuideType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Hotels (Da Nang / Hoi An area) ─────────────────────────────────────
const HOTELS = [
  { name: 'Fusion Maia', address: 'Vo Nguyen Giap Street, Son Tra', lat: 16.062, lng: 108.244 },
  { name: 'Danang Golden Bay', address: 'Ho Nghinh Street, My An', lat: 16.077, lng: 108.223 },
  { name: 'TMS Hotel', address: 'Hung Vuong, Hai Chau', lat: 16.073, lng: 108.228 },
  { name: 'Pulchra Resort', address: 'Truong Sa, Hoa Hai', lat: 16.018, lng: 108.263 },
  { name: 'Palm Garden Resort', address: 'Cua Dai, Hoi An', lat: 15.907, lng: 108.348 },
  { name: 'A La Carte', address: 'Ho Nghinh, My An', lat: 16.062, lng: 108.241 },
  { name: 'Aria Grand Hotel', address: 'Le Thanh Ton, Hai Chau', lat: 16.072, lng: 108.231 },
  { name: 'Sea & Sun Hotel', address: 'Bach Dang Street', lat: 16.068, lng: 108.238 },
  { name: 'InterContinental', address: 'Son Tra Peninsula', lat: 16.01, lng: 108.256 },
  { name: 'Hoi An Riverside', address: 'An Hoi, Hoi An', lat: 15.879, lng: 108.333 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────
/** Create a UTC date to avoid timezone drift when Prisma stores/retrieves. */
const day = (offset: number, hour = 7): Date => {
  const now = new Date();
  const utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, 0, 0, 0);
  return new Date(utc);
};

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

let bookingSeq = 0;
const ref = (prefix: string) => `${prefix}-${String(++bookingSeq).padStart(4, '0')}`;

// ─── Plan: 4 days × 5 bookings (3 group + 2 private per day) ───────────
// Group tours: TOUR-0002 (Ha Long Bay), TOUR-0003 (Ninh Binh), TOUR-0005 (Ba Na Hills)
// Private tours: TOUR-0001 (Hanoi City), TOUR-0004 (Hoi An)
const GROUP_TOUR_CODES = ['TOUR-0002', 'TOUR-0003', 'TOUR-0005'];
const PRIVATE_TOUR_CODES = ['TOUR-0001', 'TOUR-0004'];

const CHANNELS = ['TRIPADVISOR', 'AIRBNB', 'BOOKING_COM', 'WEBSITE', 'MANUAL'] as const;

interface BookingInput {
  ref: string;
  customer: string;
  hotelIdx: number;
  pax: number;
  channel: (typeof CHANNELS)[number];
  tourType: TourType;
  tourCode: string;
}

// Generate random bookings for each day
function generateDayPlan(dayOffset: number): BookingInput[] {
  const names = [
    'Emma Watson', 'John Carter', 'Sophia Lee', 'Liam Smith', 'Olivia Brown',
    'Noah Wilson', 'James Martin', 'Mia Johnson', 'Lucas Davis', 'Ava Miller',
    'Ethan Brown', 'Isabella Wilson', 'Mason Taylor', 'Charlotte White', 'Logan Harris',
    'Amelia Clark', 'Benjamin Lewis', 'Harper Walker', 'Alexander Hall', 'Evelyn Young',
    'Daniel Kim', 'Alice Nguyen', 'Peter Parker', 'Chloe Martin', 'David Chen',
    'Sarah Mitchell', 'Michael Torres', 'Laura Bennett', 'Chris Anderson', 'Natalie Wright',
  ];

  const bookings: BookingInput[] = [];

  // 3 group tours per day — vary pax to test bus filling (12-pax cap)
  const paxOptions = [
    [4, 6, 3],       // small day: 4+6=10 (1 bus), 3 (separate bus)
    [8, 5, 2],       // medium: 8+5=13 > 12 → 2 buses for these
    [7, 6, 4],       // 7+6=13 > 12 → 2 buses; 4 fits in bus with 7 → bus1=11
    [10, 3, 2],      // 10+3=13 > 12 → 2 buses
    [9, 4, 1],       // 9+4=13 > 12 → 2 buses
  ];
  const pax = rand(paxOptions);

  for (let i = 0; i < 3; i++) {
    bookings.push({
      ref: ref('GR'),
      customer: rand(names),
      hotelIdx: bookingSeq % HOTELS.length,
      pax: pax[i],
      channel: rand([...CHANNELS]),
      tourType: TourType.GROUP_TOUR,
      tourCode: GROUP_TOUR_CODES[i % GROUP_TOUR_CODES.length],
    });
  }

  // 2 private tours per day
  const privatePax = [[2, 3], [1, 4], [2, 2], [3, 1]][dayOffset % 4];
  for (let i = 0; i < 2; i++) {
    bookings.push({
      ref: ref('PV'),
      customer: rand(names),
      hotelIdx: (bookingSeq + 3) % HOTELS.length,
      pax: privatePax[i],
      channel: rand([...CHANNELS]),
      tourType: TourType.PRIVATE_TOUR,
      tourCode: PRIVATE_TOUR_CODES[i % PRIVATE_TOUR_CODES.length],
    });
  }

  return bookings;
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Clearing old booking & assignment data...');

  // Delete in dependency order
  await prisma.tourReport.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.assignment.deleteMany();
  console.log('✅ Cleared bookings, assignments, tour reports');

  // ─── Ensure providers, vehicles, drivers, guides exist ──────────────
  const company = await prisma.transportationProvider.upsert({
    where: { id: 'seed-company' },
    update: { name: 'Company Fleet', isCompany: true },
    create: { id: 'seed-company', name: 'Company Fleet', isCompany: true },
  });
  const external = await prisma.transportationProvider.upsert({
    where: { id: 'seed-external' },
    update: { name: 'An Phu Transport' },
    create: { id: 'seed-external', name: 'An Phu Transport' },
  });

  // Vehicles (8 total — enough to fill 4 days)
  const vehicles = [
    { id: 'seed-v1', plate: '43A-12345', cap: 12, providerId: company.id },
    { id: 'seed-v2', plate: '51A-67890', cap: 12, providerId: company.id },
    { id: 'seed-v3', plate: '29B-11111', cap: 12, providerId: external.id },
    { id: 'seed-v4', plate: '29B-22222', cap: 12, providerId: external.id },
  ];
  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: { plateNumber: v.plate, capacity: v.cap, providerId: v.providerId },
      create: { id: v.id, plateNumber: v.plate, capacity: v.cap, providerId: v.providerId },
    });
  }

  // Drivers & Guides
  const pwd = await bcrypt.hash('demo123', 10);
  const crewData = [
    { id: 'seed-driver-1', name: 'Nguyen Van Tai', email: 'tai.driver@seed.local', role: RoleType.DRIVER, providerId: null },
    { id: 'seed-driver-2', name: 'Le Van Son', email: 'son.driver@seed.local', role: RoleType.DRIVER, providerId: external.id },
    { id: 'seed-driver-3', name: 'Tran Quoc Binh', email: 'binh.driver@seed.local', role: RoleType.DRIVER, providerId: null },
    { id: 'seed-guide-1', name: 'Tran Thi Huong', email: 'huong.guide@seed.local', role: RoleType.TOUR_GUIDE, providerId: null },
    { id: 'seed-guide-2', name: 'Pham Van Anh', email: 'anh.guide@seed.local', role: RoleType.TOUR_GUIDE, providerId: null },
    { id: 'seed-guide-3', name: 'Do Thi Mai', email: 'mai.guide@seed.local', role: RoleType.TOUR_GUIDE, providerId: null },
  ];
  for (const c of crewData) {
    await prisma.user.upsert({
      where: { id: c.id },
      update: { name: c.name, providerId: c.providerId },
      create: {
        id: c.id, name: c.name, email: c.email, passwordHash: pwd,
        role: c.role, userType: 'crew', providerId: c.providerId, isActive: true,
      },
    });
  }
  // Driver profiles
  const drivers = crewData.filter((c) => c.role === RoleType.DRIVER);
  await prisma.driverProfile.deleteMany({ where: { userId: { in: drivers.map((d) => d.id) } } });
  await prisma.driverProfile.createMany({
    data: drivers.map((d, i) => ({ userId: d.id, licenseNumber: `DL-${String(i + 1).padStart(3, '0')}`, rating: 5 - i * 0.2 })),
  });
  // Guide profiles
  const guides = crewData.filter((c) => c.role === RoleType.TOUR_GUIDE);
  await prisma.guideProfile.deleteMany({ where: { userId: { in: guides.map((g) => g.id) } } });
  await prisma.guideProfile.createMany({
    data: guides.map((g, i) => ({
      userId: g.id,
      rating: 5 - i * 0.1,
      type: i % 2 === 0 ? GuideType.OFFICIAL : GuideType.FREELANCE,
    })),
  });

  // ─── Create bookings ─────────────────────────────────────────────────
  const TOTAL_DAYS = Number(process.env.SEED_DAYS ?? 10);
  const allBookings: BookingInput[] = [];
  for (let d = 0; d < TOTAL_DAYS; d++) {
    allBookings.push(...generateDayPlan(d));
  }

  console.log(`\n📋 Creating ${allBookings.length} bookings (${TOTAL_DAYS} days × 5)...`);

  const tourCache = new Map<string, any>();
  const getTour = async (code: string) => {
    if (tourCache.has(code)) return tourCache.get(code);
    const t = await prisma.tour.findUnique({ where: { code } });
    if (!t) throw new Error(`Tour ${code} not found — run 'npm run seed' first`);
    tourCache.set(code, t);
    return t;
  };

  const createdBookingIds: string[] = [];
  const BOOKINGS_PER_DAY = 5;
  for (let i = 0; i < allBookings.length; i++) {
    const b = allBookings[i];
    const tour = await getTour(b.tourCode);
    const hotel = HOTELS[b.hotelIdx];
    const dayOffset = Math.floor(i / BOOKINGS_PER_DAY);
    const created = await prisma.booking.create({
      data: {
        bookingRef: b.ref,
        source: b.channel.toLowerCase().replace(/_/g, ''),
        confirmationCode: b.ref,
        channel: b.channel as any,
        status: 'PENDING',
        tourId: tour.id,
        tourName: tour.name,
        tourType: b.tourType,
        startingDate: day(dayOffset),
        customerName: b.customer,
        hotelName: hotel.name,
        address: hotel.address,
        latitude: hotel.lat,
        longitude: hotel.lng,
        phone: `+84 900 ${String(bookingSeq).padStart(4, '0')}`,
        mail: `${b.customer.toLowerCase().replace(/\s+/g, '.')}@mail.com`,
        totalPax: b.pax,
        paxDetail: `${b.pax} guest${b.pax > 1 ? 's' : ''}`,
        payment: 'PENDING',
        createdWho: b.channel === 'MANUAL' ? 'Seed Admin' : 'Pub-Sub System',
      },
    });
    createdBookingIds.push(created.id);
  }

  console.log(`✅ Created ${createdBookingIds.length} bookings`);

  // ─── Create a bus per booking (manual, origin=MANUAL) ────────────────
  // Engine auto-assign đã bị gỡ — seed giờ tạo 1 bus riêng cho từng booking
  // giống thao tác tay trên Dispatch Board.
  console.log('\n🔧 Creating manual buses...');

  let assigned = 0;
  for (const bid of createdBookingIds) {
    const bk = await prisma.booking.findUnique({
      where: { id: bid },
      include: { tour: true },
    });
    if (!bk) continue;

    const label = bk.tourType === 'PRIVATE_TOUR' ? 'Priv' : 'Group';
    const count = await prisma.assignment.count({
      where: { code: { startsWith: `${label} Bus -` } },
    });

    const dayStart = new Date(bk.startingDate as Date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(
      dayStart.getTime() + Math.max(1, (bk.tour?.durationDays ?? 1) - 1) * 86400000,
    );

    const bus = await prisma.assignment.create({
      data: {
        code: `${label} Bus - ${count + 1}`,
        startDate: dayStart,
        endDate: dayEnd,
        status: 'PENDING',
        tourType: bk.tourType as any,
        tourName: bk.tourName ?? bk.tour?.name ?? undefined,
        durationDays: bk.tour?.durationDays ?? 1,
        createdWho: 'Seed',
        origin: 'MANUAL',
      },
    });
    await prisma.booking.update({
      where: { id: bk.id },
      data: { assignmentId: bus.id, paxSequence: 1 },
    });
    assigned++;
  }

  console.log(`✅ Created ${assigned} manual buses`);

  // ─── Print results ───────────────────────────────────────────────────
  const buses = await prisma.assignment.findMany({
    include: {
      bookings: { orderBy: { paxSequence: 'asc' } },
      vehicle: true,
      driver: { select: { name: true } },
      guide: { select: { name: true } },
    },
    orderBy: [{ startDate: 'asc' }, { sequenceIndex: 'asc' }],
  });

  console.log('\n==================== DISPATCH BOARD ====================');
  let totalPax = 0;
  for (const bus of buses) {
    const pax = bus.bookings.reduce((s, b) => s + (b.totalPax ?? 0), 0);
    totalPax += pax;
    const dateStr = bus.startDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit' });
    console.log(
      `\n🚌 [${bus.code}] ${bus.tourType} · ${dateStr} · ${bus.status} · ${pax}/${bus.vehicle?.capacity ?? 12} pax`,
    );
    console.log(
      `   Driver: ${bus.driver?.name ?? '—'}  |  Guide: ${bus.guide?.name ?? '—'}  |  Vehicle: ${bus.vehicle?.plateNumber ?? '—'}`,
    );
    for (const b of bus.bookings) {
      console.log(`   #${b.paxSequence} ${b.bookingRef} · ${b.customerName} · ${b.hotelName ?? '—'} · ${b.totalPax} pax`);
    }
  }
  console.log(`\n📊 Total: ${buses.length} buses, ${createdBookingIds.length} bookings, ${totalPax} pax`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
