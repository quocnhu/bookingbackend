import 'dotenv/config';
import {
  PrismaClient,
  RoleType,
  TourType,
  GuideType,
  LeaveStatus,
  AssignmentStatus,
  BookingStatus,
  AssignmentOrigin,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { distanceFromRoot } from '../src/geo/distance';

const prisma = new PrismaClient();

/** Số khách tối đa mỗi xe (BUS_MAX_PAX theo bookingflow.md). */
const BUS_MAX_PAX = 12;

/** Khoảng ngày feed: quá khứ 3 ngày → tương lai 27 ngày (diversify private/group). */
const DAYS_BACK = 3;
const DAYS_FWD = 27;

const NAMES = [
  'Emma Watson',
  'John Carter',
  'Sophia Lee',
  'Liam Smith',
  'Olivia Brown',
  'Noah Wilson',
  'James Martin',
  'Mia Johnson',
  'Lucas Davis',
  'Ava Miller',
  'Ethan Brown',
  'Isabella Wilson',
  'Mason Taylor',
  'Charlotte White',
  'Logan Harris',
  'Amelia Clark',
  'Benjamin Lewis',
  'Harper Walker',
  'Alexander Hall',
  'Evelyn Young',
  'Daniel Kim',
  'Alice Nguyen',
  'Peter Parker',
  'Chloe Martin',
  'David Chen',
  'Sarah Mitchell',
  'Michael Torres',
  'Laura Bennett',
  'Chris Anderson',
  'Natalie Wright',
  'Kevin Tran',
  'Rachel Green',
  'Jack Daniels',
  'Mona Lisa',
  'Scott Free',
];

const GROUP_TOUR_CODES = ['TOUR-0002', 'TOUR-0003', 'TOUR-0005', 'TOUR-0006'];
const PRIVATE_TOUR_CODES = ['TOUR-0001', 'TOUR-0004'];

const CHANNELS = [
  'TRIPADVISOR',
  'AIRBNB',
  'BOOKING_COM',
  'WEBSITE',
  'MANUAL',
] as const;

const day = (offset: number, hour = 7): Date => {
  const now = new Date();
  const utc = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offset,
    hour,
    0,
    0,
    0,
  );
  return new Date(utc);
};

const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Pax random kiểu thực tế: nhóm 2-6 người (3, 2, 4, 5...), xen 1 người lẻ.
 *  Tổng pax không bao giờ vượt BUS_MAX_PAX (12). */
function splitPax(count: number): number[] {
  const sizes = [2, 3, 4, 5, 2, 3, 6, 4, 2, 3, 1, 4, 5, 2];
  const target = count + Math.floor(Math.random() * (BUS_MAX_PAX - count + 1));
  const arr = Array<number>(count).fill(1);
  let budget = target - count;
  let i = 0;
  while (budget > 0) {
    const add = Math.min(sizes[i % sizes.length], budget);
    arr[i % count] += add;
    budget -= add;
    i++;
  }
  return arr;
}

async function main() {
  console.log('🔄 Clearing bookings, assignments, reports...');
  await prisma.tourReport.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.assignment.deleteMany();
  console.log('✅ Cleared');

  // ─── Hotels & coords từ bảng Coordinate (KHÔNG hardcode) ──────────────
  const coords = await prisma.coordinate.findMany({
    where: { latitude: { gte: -90, lte: 90 } },
    orderBy: { hotelName: 'asc' },
  });
  if (coords.length < 10) {
    console.error(
      'Coordinate table quá ít dữ liệu — chạy `npm run seed:coordinates` trước.',
    );
    process.exit(1);
  }
  const hotels = shuffle(coords);
  console.log(`📋 Using ${hotels.length} hotels/coords from Coordinate table`);
  let hotelCursor = 0;
  const nextHotel = () => hotels[hotelCursor++ % hotels.length];

  // ─── Providers & vehicles (diversify) ────────────────────────────────
  const providers = [
    { id: 'seed-company', name: 'Company Fleet' },
    { id: 'seed-external', name: 'An Phu Transport' },
    { id: 'seed-provider-3', name: 'Phuong Trang Travel' },
  ];
  const providerRows: { id: string }[] = [];
  for (const p of providers) {
    providerRows.push(
      await prisma.transportationProvider.upsert({
        where: { id: p.id },
        update: { name: p.name },
        create: { id: p.id, name: p.name },
      }),
    );
  }

  const VEHICLE_LIST = [
    { id: 'seed-v1', plate: '43A-12345', providerId: providers[0].id },
    { id: 'seed-v2', plate: '43A-54321', providerId: providers[0].id },
    { id: 'seed-v3', plate: '43B-77777', providerId: providers[0].id },
    { id: 'seed-v4', plate: '51A-67890', providerId: providers[1].id },
    { id: 'seed-v5', plate: '29B-11111', providerId: providers[1].id },
    { id: 'seed-v6', plate: '29B-22222', providerId: providers[1].id },
    { id: 'seed-v7', plate: '92A-33333', providerId: providers[2].id },
    { id: 'seed-v8', plate: '92C-44444', providerId: providers[2].id },
    { id: 'seed-v9', plate: '92B-55555', providerId: providers[2].id },
  ];
  for (const v of VEHICLE_LIST) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: { plateNumber: v.plate, capacity: 12, providerId: v.providerId },
      create: {
        id: v.id,
        plateNumber: v.plate,
        capacity: 12,
        brand: 'Thaco',
        providerId: v.providerId,
      },
    });
  }

  const pwd = await bcrypt.hash('demo123', 10);
  // ─── Crew: 6 drivers (2/provider) + 6 guides ─────────────────────────
  const crewDefs = [
    { id: 'seed-driver-1', name: 'Nguyen Van Tai', role: RoleType.DRIVER, providerId: providers[0].id },
    { id: 'seed-driver-2', name: 'Le Van Son', role: RoleType.DRIVER, providerId: providers[0].id },
    { id: 'seed-driver-3', name: 'Tran Quoc Binh', role: RoleType.DRIVER, providerId: providers[1].id },
    { id: 'seed-driver-4', name: 'Hoang Minh', role: RoleType.DRIVER, providerId: providers[1].id },
    { id: 'seed-driver-5', name: 'Vu Van Long', role: RoleType.DRIVER, providerId: providers[2].id },
    { id: 'seed-driver-6', name: 'Phan Dinh Phuc', role: RoleType.DRIVER, providerId: providers[2].id },
    { id: 'seed-guide-1', name: 'Tran Thi Huong', role: RoleType.TOUR_GUIDE, providerId: null },
    { id: 'seed-guide-2', name: 'Pham Van Anh', role: RoleType.TOUR_GUIDE, providerId: null },
    { id: 'seed-guide-3', name: 'Do Thi Mai', role: RoleType.TOUR_GUIDE, providerId: null },
    { id: 'seed-guide-4', name: 'Nguyen Thi Lan', role: RoleType.TOUR_GUIDE, providerId: null },
    { id: 'seed-guide-5', name: 'Bui Ngoc Ha', role: RoleType.TOUR_GUIDE, providerId: null },
    { id: 'seed-guide-6', name: 'Vu Thi Quynh', role: RoleType.TOUR_GUIDE, providerId: null },
  ];
  for (const c of crewDefs) {
    await prisma.user.upsert({
      where: { id: c.id },
      update: { name: c.name, providerId: c.providerId },
      create: {
        id: c.id,
        name: c.name,
        email: `${c.id}@seed.local`.replace('seed-', ''),
        passwordHash: pwd,
        role: c.role,
        userType: 'crew',
        providerId: c.providerId,
        isActive: true,
      },
    });
  }
  const drivers = crewDefs.filter((c) => c.role === RoleType.DRIVER);
  await prisma.driverProfile.deleteMany({
    where: { userId: { in: drivers.map((d) => d.id) } },
  });
  await prisma.driverProfile.createMany({
    data: drivers.map((d, i) => ({
      userId: d.id,
      licenseNumber: `DL-${String(i + 1).padStart(3, '0')}`,
      rating: Math.round((4 + Math.random() * 1) * 10) / 10,
    })),
  });
  const guides = crewDefs.filter((c) => c.role === RoleType.TOUR_GUIDE);
  await prisma.guideProfile.deleteMany({
    where: { userId: { in: guides.map((g) => g.id) } },
  });
  await prisma.guideProfile.createMany({
    data: guides.map((g, i) => ({
      userId: g.id,
      type: i % 2 === 0 ? GuideType.OFFICIAL : GuideType.FREELANCE,
      languages: i % 2 === 0 ? ['en'] : ['en', 'fr'],
      rating: Math.round((4 + Math.random() * 1) * 10) / 10,
    })),
  });

  // ─── Crew day-offs (UserLeave) — hiện màu đỏ trên Crew Availability ──
  await prisma.userLeave.deleteMany({
    where: { userId: { in: crewDefs.map((c) => c.id) } },
  });
  const leaveReasons = [
    'Personal matters',
    'Sick leave',
    'Family trip',
    'Health check-up',
  ];
  for (const c of crewDefs) {
    const nBlocks = 1 + Math.floor(Math.random() * 2); // 1..2 block
    const used = new Set<number>();
    for (let b = 0; b < nBlocks; b++) {
      const startOff = 1 + Math.floor(Math.random() * (DAYS_FWD - 3)); // trong +1..+24
      if (used.has(startOff)) continue;
      used.add(startOff);
      const len = 1 + Math.floor(Math.random() * 4); // 1..4 ngày
      const isApproved = Math.random() < 0.8;
      await prisma.userLeave.create({
        data: {
          userId: c.id,
          startDate: day(startOff, 0),
          endDate: day(startOff + len - 1, 0),
          reason: leaveReasons[Math.floor(Math.random() * leaveReasons.length)],
          status: isApproved ? LeaveStatus.APPROVED : LeaveStatus.PENDING,
        },
      });
    }
  }
  const leaveMapRaw = await prisma.userLeave.findMany({
    where: {
      userId: { in: crewDefs.map((c) => c.id) },
      status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
    },
    select: { userId: true, startDate: true, endDate: true },
  });
  const onLeave = (userId: string, d: Date): boolean =>
    leaveMapRaw.some(
      (l) =>
        l.userId === userId &&
        d.getTime() >= l.startDate.getTime() &&
        d.getTime() <= l.endDate.getTime(),
    );

  // Người kế toán + admin — verifier/finalizer cho Completed tours.
  const accounting = await prisma.user.upsert({
    where: { id: 'seed-accounting' },
    update: {},
    create: {
      id: 'seed-accounting',
      name: 'Accounting Room',
      email: 'accounting@seed.local',
      passwordHash: pwd,
      role: RoleType.OFFICE,
      userType: 'office',
      isActive: true,
    },
  });

  // ─── Tour cache ──────────────────────────────────────────────────────
  const tourCache = new Map<string, any>();
  const getTour = async (code: string) => {
    if (tourCache.has(code)) return tourCache.get(code);
    const t = await prisma.tour.findUnique({ where: { code } });
    if (!t) throw new Error(`Tour ${code} not found — run 'npm run seed' first`);
    tourCache.set(code, t);
    return t;
  };

  /** Sắp xếp bookings trong bus theo khoảng cách tăng dần tới root rồi ghi paxSequence. */
  async function geoSort(assignmentId: string) {
    const bookings = await prisma.booking.findMany({
      where: { assignmentId },
      select: { id: true, latitude: true, longitude: true },
    });
    const ordered = [...bookings].sort(
      (a, b) =>
        distanceFromRoot(a.latitude, a.longitude) -
        distanceFromRoot(b.latitude, b.longitude),
    );
    await prisma.$transaction(
      ordered.map((b, i) =>
        prisma.booking.update({
          where: { id: b.id },
          data: { paxSequence: i + 1 },
        }),
      ),
    );
  }

  interface BusInput {
    code: string;
    tourType: TourType;
    tour: any;
    date: Date;
    hotelCount: number;
    status: AssignmentStatus;
    vehicleId?: string | null;
    driverId?: string | null;
    guideId?: string | null;
    bookings: BookingInput[];
    finalized?: boolean;
  }

  interface BookingInput {
    ref: string;
    customer: string;
    hotel: (typeof hotels)[number];
    pax: number;
    channel: (typeof CHANNELS)[number];
    tourType: TourType;
    tourCode: string;
  }

  let seq = 0;
  const ref = (prefix: string) => `${prefix}-${String(++seq).padStart(4, '0')}`;

  interface CrewChoice {
    driverId?: string | null;
    guideId?: string | null;
    vehicleId?: string;
  }

  /** Chọn crew + xe khả dụng trong ngày (crew không nghỉ phép), xoay vòng để ai cũng có việc. */
  function pickCrew(date: Date, spin: number): CrewChoice {
    const freeDrivers = drivers.filter((d) => !onLeave(d.id, date));
    const freeGuides = guides.filter((g) => !onLeave(g.id, date));
    const driver = freeDrivers.length ? freeDrivers[spin % freeDrivers.length] : null;
    const guide = freeGuides.length ? freeGuides[spin % freeGuides.length] : null;
    const vehicle = VEHICLE_LIST[spin % VEHICLE_LIST.length];
    return {
      driverId: driver?.id ?? null,
      guideId: guide?.id ?? null,
      vehicleId: vehicle.id,
    };
  }

  /** Tạo bus group: tổng pax ≤ 12, mỗi booking có pax nhóm ngẫu nhiên (3,2,4,...). */
  async function createGroupBus(
    busNo: number,
    tourCode: string,
    date: Date,
    status: AssignmentStatus,
  ) {
    const tour = await getTour(tourCode);
    const nBookings = 4 + Math.floor(Math.random() * 5); // 4..8 booking
    const paxList = splitPax(nBookings);
    const bookings: BookingInput[] = paxList.map((pax) => ({
      ref: ref('GR'),
      customer: NAMES[Math.floor(Math.random() * NAMES.length)],
      hotel: nextHotel(),
      pax,
      channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
      tourType: TourType.GROUP_TOUR,
      tourCode,
    }));
    const crew = pickCrew(date, +tourCode.replace(/\D/g, '') + busNo);

    return {
      code: `Group Bus - ${busNo}`,
      tourType: TourType.GROUP_TOUR as TourType,
      tour,
      date,
      hotelCount: nBookings,
      status,
      vehicleId: crew.vehicleId,
      driverId: crew.driverId,
      guideId: crew.guideId,
      bookings,
      finalized: status === AssignmentStatus.COMPLETED,
    } as BusInput;
  }

  /** Tạo bus private: 1-3 booking, tổng pax ≤ 12. */
  async function createPrivateBus(
    busNo: number,
    tourCode: string,
    date: Date,
    status: AssignmentStatus,
  ) {
    const tour = await getTour(tourCode);
    const nBookings = 1 + Math.floor(Math.random() * 3); // 1..3 booking
    const paxList = splitPax(nBookings);
    const bookings: BookingInput[] = paxList.map((pax) => ({
      ref: ref('PV'),
      customer: NAMES[Math.floor(Math.random() * NAMES.length)],
      hotel: nextHotel(),
      pax,
      channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
      tourType: TourType.PRIVATE_TOUR,
      tourCode,
    }));
    const crew = pickCrew(date, +(tourCode.replace(/\D/g, '') + '3') + busNo * 2);

    return {
      code: `Priv Bus - ${busNo}`,
      tourType: TourType.PRIVATE_TOUR as TourType,
      tour,
      date,
      hotelCount: nBookings,
      status,
      vehicleId: crew.vehicleId,
      driverId: crew.driverId,
      guideId: crew.guideId,
      bookings,
      finalized: status === AssignmentStatus.COMPLETED,
    } as BusInput;
  }

  // ─── Kế hoạch feed: range ngày -3..+27, mỗi ngày 2-4 xe (group + private) ──
  const busPlan: BusInput[] = [];
  for (let off = -DAYS_BACK; off <= DAYS_FWD; off++) {
    const status =
      off < 0
        ? AssignmentStatus.COMPLETED
        : off === 0
          ? Math.random() < 0.5
            ? AssignmentStatus.PENDING
            : AssignmentStatus.DISPATCHED
          : AssignmentStatus.PENDING;

    // 2..3 group tours/ngày — luân phiên tour cho đa dạng
    const gCount = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let g = 0; g < gCount; g++) {
      const code =
        GROUP_TOUR_CODES[
          (((off + g) % GROUP_TOUR_CODES.length) + GROUP_TOUR_CODES.length) %
            GROUP_TOUR_CODES.length
        ];
      busPlan.push(
        await createGroupBus(busPlan.length + 1, code, day(off, 7), status),
      );
    }
    // 1..2 private tours/ngày
    const pCount = 1 + (Math.random() < 0.5 ? 1 : 0);
    for (let p = 0; p < pCount; p++) {
      const code =
        PRIVATE_TOUR_CODES[
          (((off + p) % PRIVATE_TOUR_CODES.length) + PRIVATE_TOUR_CODES.length) %
            PRIVATE_TOUR_CODES.length
        ];
      busPlan.push(
        await createPrivateBus(busPlan.length + 1, code, day(off, 9), status),
      );
    }
  }

  // ─── Create assignments + bookings + geo-sort + lifecycle ─────────────
  console.log(
    `\n🚌 Creating ${busPlan.length} buses (${busPlan.reduce((s, b) => s + b.bookings.length, 0)} bookings)...`,
  );

  for (const bus of busPlan) {
    const dayStart = new Date(bus.date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(
      dayStart.getTime() + Math.max(1, (bus.tour.durationDays ?? 1) - 1) * 86400000,
    );

    const assignment = await prisma.assignment.create({
      data: {
        code: bus.code,
        startDate: dayStart,
        endDate: dayEnd,
        status: bus.status,
        tourType: bus.tourType,
        tourName: bus.tour.name,
        durationDays: bus.tour.durationDays ?? 1,
        createdWho: 'Seed',
        origin: AssignmentOrigin.MANUAL,
        vehicleId: bus.vehicleId,
        driverId: bus.driverId,
        guideId: bus.guideId,
      },
    });

    for (const b of bus.bookings) {
      await prisma.booking.create({
        data: {
          bookingRef: b.ref,
          source: b.channel.toLowerCase().replace(/_/g, ''),
          confirmationCode: b.ref,
          channel: b.channel as any,
          status: BookingStatus.ASSIGNED,
          tourId: bus.tour.id,
          tourName: bus.tour.name,
          tourType: b.tourType,
          startingDate: dayStart,
          customerName: b.customer,
          hotelName: b.hotel.hotelName,
          address: b.hotel.address,
          latitude: b.hotel.latitude,
          longitude: b.hotel.longitude,
          phone: `+84 900 ${String(Math.floor(1000 + Math.random() * 9000))}`,
          mail: `${b.customer.toLowerCase().replace(/\s+/g, '.')}@mail.com`,
          totalPax: b.pax,
          paxDetail: `${b.pax} guest${b.pax > 1 ? 's' : ''}`,
          payment: 'PAID',
          assignmentId: assignment.id,
          createdWho: b.channel === 'MANUAL' ? 'Seed Admin' : 'Pub-Sub System',
        },
      });
    }

    await geoSort(assignment.id);
    const totalPax = bus.bookings.reduce((s, b) => s + b.pax, 0);
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { totalPax },
    });

    // Completed tour lifecycle (chỉ cho quá khứ): tour report đã được xác minh
    if (bus.finalized) {
      await prisma.tourReport.create({
        data: {
          assignmentId: assignment.id,
          submittedById: bus.guideId,
          submittedByName: guides.find((g) => g.id === bus.guideId)?.name ?? null,
          actualPax: totalPax,
          distanceKm: 40 + Math.random() * 60,
          status: 'VERIFIED',
          verifiedById: accounting.id,
          verifiedByName: accounting.name,
          verifiedAt: dayStart,
          finalizedById: accounting.id,
          finalizedByName: accounting.name,
          finalizedAt: dayStart,
        },
      });
    }
  }

  // ─── Print results ────────────────────────────────────────────────────
  const stats = await prisma.assignment.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const paxStat = await prisma.assignment.aggregate({
    _sum: { totalPax: true },
  });
  const leaveStat = await prisma.userLeave.count({
    where: { userId: { in: crewDefs.map((c) => c.id) } },
  });
  console.log(
    `\n📊 Assignments: ${stats.map((s) => `${s.status}: ${s._count._all}`).join(', ')}`,
  );
  console.log(`📊 Bookings total pax: ${paxStat._sum.totalPax}`);
  console.log(`📅 Crew day-offs seeded: ${leaveStat}`);
  console.log(`✅ Done. Dispatch board: day -${DAYS_BACK} → +${DAYS_FWD}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());