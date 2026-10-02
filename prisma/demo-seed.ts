import * as bcrypt from 'bcrypt';
import {
  PrismaService,
} from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { AssignmentStatus, GuideType, RoleType, TourType } from '@prisma/client';

const prisma = new PrismaService();
const audit = new AuditService(prisma);

// ─── Hotel coordinates (Da Nang / Hoi An) ───────────────────────────────
const HOTELS: Array<{
  name: string;
  address: string;
  lat: number;
  lng: number;
}> = [
  { name: 'Fusion Maia', address: 'Vo Nguyen Giap Street, Son Tra', lat: 16.062, lng: 108.244 },
  { name: 'Danang Golden Bay', address: 'Ho Nghinh Street, My An', lat: 16.077, lng: 108.223 },
  { name: 'TMS Hotel', address: 'Hung Vuong, Hai Chau', lat: 16.073, lng: 108.228 },
  { name: 'Pulchra Resort', address: 'Truong Sa, Hoa Hai', lat: 16.018, lng: 108.263 },
  { name: 'Palm Garden Resort', address: 'Cua Dai, Hoi An', lat: 15.907, lng: 108.348 },
  { name: 'A La Carte', address: 'Ho Nghinh, My An', lat: 16.062, lng: 108.241 },
  { name: 'Emeralda Ninh Binh', address: 'Van Long, Gia Vien', lat: 20.341, lng: 105.891 },
  { name: 'Aria Grand Hotel', address: 'Le Thanh Ton, Hai Chau', lat: 16.072, lng: 108.231 },
  { name: 'Sea & Sun Hotel', address: 'Bach Dang Street', lat: 16.068, lng: 108.238 },
  { name: 'InterContinental', address: 'Son Tra Peninsula', lat: 16.01, lng: 108.256 },
  { name: 'Hoi An Riverside', address: 'An Hoi, Hoi An', lat: 15.879, lng: 108.333 },
  { name: 'Vinpearl Resort', address: 'Co Co, Hoi An', lat: 15.87, lng: 108.42 },
];

const day = (offset: number, hour = 8) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  d.setMinutes(0, 0, 0);
  return d;
};

// [ref, customer, hotelName, totalPax, channel, tourType, hasCoord]
type BookingSeed = [string, string, string, number, string, TourType, boolean];

const PLAN: Array<{ offset: number; bookings: BookingSeed[] }> = [
  {
    offset: 0,
    bookings: [
      ['TA-1001', 'Emma Watson', 'Fusion Maia', 2, 'TRIPADVISOR', 'PRIVATE_TOUR', true],
      ['TA-1002', 'John Carter', 'Danang Golden Bay', 4, 'TRIPADVISOR', 'PRIVATE_TOUR', true],
      ['TA-1004', 'Noah Wilson', 'TMS Hotel', 2, 'TRIPADVISOR', 'PRIVATE_TOUR', true],
      ['WS-2001', 'Liam Smith', 'Pulchra Resort', 12, 'WEBSITE', 'GROUP_TOUR', true],
      ['BK-0002', 'Sophia Tran', 'Palm Garden Resort', 10, 'MANUAL', 'GROUP_TOUR', true],
    ],
  },
  {
    offset: 1,
    bookings: [
      ['TA-1005', 'Olivia Brown', 'A La Carte', 3, 'TRIPADVISOR', 'PRIVATE_TOUR', true],
      ['TA-1006', 'James Lee', 'Hoi An Riverside', 2, 'TRIPADVISOR', 'PRIVATE_TOUR', false],
      ['WS-2002', 'Minh Nguyen', 'Hoi An Riverside', 6, 'WEBSITE', 'GROUP_TOUR', true],
      ['TA-1007', 'Chloe Martin', 'Vinpearl Resort', 5, 'TRIPADVISOR', 'GROUP_TOUR', true],
      ['BK-0003', 'Peter Parker', 'Emeralda Ninh Binh', 20, 'MANUAL', 'GROUP_TOUR', true],
      ['BK-0004', 'James Brown', 'Aria Grand Hotel', 2, 'MANUAL', 'GROUP_TOUR', true], // cancelled afterwards
    ],
  },
  {
    offset: 2,
    bookings: [
      ['TA-1008', 'Daniel Kim', 'Danang Golden Bay', 2, 'TRIPADVISOR', 'PRIVATE_TOUR', true],
      ['WS-2003', 'Alice Nguyen', 'Sea & Sun Hotel', 2, 'WEBSITE', 'PRIVATE_TOUR', false],
      ['BK-0005', 'Ethan Hunt', 'InterContinental', 10, 'MANUAL', 'GROUP_TOUR', true],
      ['BK-0006', 'Luna Park', 'Palm Garden Resort', 2, 'MANUAL', 'GROUP_TOUR', true],
    ],
  },
];

async function main() {
  await prisma.$connect();

  // ─── 1. Reset demo data ────────────────────────────────────────────────
  const refs = PLAN.flatMap((p) => p.bookings.map((b) => b[0]));
  await prisma.booking.deleteMany({ where: { bookingRef: { in: refs } } });
  const demoBuses = await prisma.assignment.findMany({
    where: { code: { contains: ' Bus ' } },
    select: { id: true },
  });
  if (demoBuses.length) {
    const busIds = demoBuses.map((b) => b.id);
    await prisma.tourReport.deleteMany({ where: { assignmentId: { in: busIds } } });
    await prisma.assignment.deleteMany({ where: { id: { in: busIds } } });
  }

  // ─── 2. Coordinates ────────────────────────────────────────────────────
  for (const h of HOTELS) {
    await prisma.coordinate.upsert({
      where: { address: h.address },
      update: { latitude: h.lat, longitude: h.lng },
      create: {
        hotelName: h.name,
        address: h.address,
        latitude: h.lat,
        longitude: h.lng,
        coordinate: `${h.lat},${h.lng}`,
      },
    });
  }

  // ─── 3. Providers + vehicles (company + external transport providers) ────
  const companyFleet = await prisma.transportationProvider.upsert({
    where: { id: 'demo-company-fleet' },
    update: { name: 'Company Fleet' },
    create: { id: 'demo-company-fleet', name: 'Company Fleet' },
  });
  const external = await prisma.transportationProvider.upsert({
    where: { id: 'demo-provider' },
    update: { name: 'An Phu Transport' },
    create: { id: 'demo-provider', name: 'An Phu Transport' },
  });
  const vehicles: Array<[string, string, number, string]> = [
    ['demo-vehicle-1', '43A-12345', 12, companyFleet.id],
    ['demo-vehicle-2', '51A-67890', 12, companyFleet.id],
    ['demo-vehicle-3', '29B-11111', 12, external.id],
    ['demo-vehicle-4', '29B-22222', 12, external.id],
  ];
  for (const [id, plate, capacity, providerId] of vehicles) {
    await prisma.vehicle.upsert({
      where: { id },
      update: { plateNumber: plate, capacity, providerId },
      create: { id, plateNumber: plate, capacity, providerId },
    });
  }

  // ─── 4. Crew (driver/guide) ────────────────────────────────────────────
  const pwd = await bcrypt.hash('demo123', 10);
  const upsertUser = (id: string, name: string, email: string, role: RoleType, providerId: string | null) =>
    prisma.user.upsert({
      where: { id },
      update: { name, providerId },
      create: {
        id,
        name,
        email,
        passwordHash: pwd,
        role,
        userType: 'crew',
        providerId,
        isActive: true,
      },
    });

  const tai = await upsertUser('demo-driver-1', 'Nguyen Van Tai', 'tai.driver@demo.local', RoleType.DRIVER, null);
  const son = await upsertUser('demo-driver-2', 'Le Van Son', 'son.driver@demo.local', RoleType.DRIVER, external.id);
  const binh = await upsertUser('demo-driver-3', 'Tran Quoc Binh', 'binh.driver@demo.local', RoleType.DRIVER, null);
  const huong = await upsertUser('demo-guide-1', 'Tran Thi Huong', 'huong.guide@demo.local', RoleType.TOUR_GUIDE, null);
  const anh = await upsertUser('demo-guide-2', 'Pham Van Anh', 'anh.guide@demo.local', RoleType.TOUR_GUIDE, null);
  const mai = await upsertUser('demo-guide-3', 'Do Thi Mai', 'mai.guide@demo.local', RoleType.TOUR_GUIDE, null);

  await prisma.driverProfile.deleteMany({
    where: { userId: { in: [tai.id, son.id, binh.id] } },
  });
  await prisma.guideProfile.deleteMany({
    where: { userId: { in: [huong.id, anh.id, mai.id] } },
  });
  await prisma.driverProfile.createMany({
    data: [
      { userId: tai.id, licenseNumber: 'DL-001', rating: 5.0 },
      { userId: son.id, licenseNumber: 'DL-002', rating: 4.6 },
      { userId: binh.id, licenseNumber: 'DL-003', rating: 4.8 },
    ],
  });
  await prisma.guideProfile.createMany({
    data: [
      { userId: huong.id, rating: 5.0, type: GuideType.OFFICIAL },
      { userId: anh.id, rating: 4.7, type: GuideType.FREELANCE },
      { userId: mai.id, rating: 4.9, type: GuideType.OFFICIAL },
    ],
  });

  // Assign the TOUR_GUIDE role to the 3 demo guides. This role is created by seed.ts (narrow permissions:
  // submit report + edit notes). Without it the guides have no permissions at all and every
  // endpoint guarded by @Permissions returns 403.
  const guideRole = await prisma.role.findUnique({
    where: { name: 'TOUR_GUIDE' },
  });
  if (guideRole) {
    const guideIds = [huong.id, anh.id, mai.id];
    await prisma.userRole.deleteMany({ where: { userId: { in: guideIds } } });
    await prisma.userRole.createMany({
      data: guideIds.map((userId) => ({ userId, roleId: guideRole.id })),
      skipDuplicates: true,
    });
  }

  // Binh is on leave tomorrow → the system will pick another driver for tomorrow.
  await prisma.userLeave.deleteMany({
    where: { userId: binh.id, startDate: { gte: day(0) } },
  });
  await prisma.userLeave.create({
    data: {
      userId: binh.id,
      startDate: day(1),
      endDate: new Date(day(1).getTime() + 3600 * 1000),
      reason: 'Nghỉ phép',
      status: 'APPROVED',
    },
  });

  // ─── 5. Office user (closes/verifies trips in the demo) ───────────────────
  const accounting = await prisma.user.upsert({
    where: { id: 'demo-accounting' },
    update: { name: 'Operations Room', role: RoleType.OFFICE, userType: 'office' },
    create: {
      id: 'demo-accounting',
      name: 'Operations Room',
      email: 'operations@demo.local',
      passwordHash: pwd,
      role: RoleType.OFFICE,
      userType: 'office',
      isActive: true,
    },
  });

  // ─── 5b. Bookings ───────────────────────────────────────────────────────
  const privateTour = await prisma.tour.findUnique({ where: { code: 'TOUR-0004' } });
  const groupTour = await prisma.tour.findUnique({ where: { code: 'TOUR-0002' } });
  if (!privateTour || !groupTour) {
    console.error('Run `npm run seed` first to create tours.');
    process.exit(1);
  }

  for (const p of PLAN) {
    const date = day(p.offset);
    for (const [ref, cust, hotel, pax, channel, tourType, hasCoord] of p.bookings) {
      const hotelInfo = HOTELS.find((h) => h.name === hotel);
      const tour = tourType === 'PRIVATE_TOUR' ? privateTour : groupTour;
      const isCanceled = ref === 'BK-0004';

      await prisma.booking.upsert({
        where: { bookingRef: ref },
        update: {
          startingDate: date,
          tourName: tour.name,
          tourType: tour.type,
          totalPax: pax,
          status: isCanceled ? 'CANCELED' : 'PENDING',
        },
        create: {
          bookingRef: ref,
          source: channel === 'TRIPADVISOR' ? 'tripadvisor' : channel === 'WEBSITE' ? 'website' : 'manual',
          confirmationCode: ref,
          channel: channel as any,
          status: isCanceled ? 'CANCELED' : 'PENDING',
          tourId: tour.id,
          tourName: tour.name,
          tourType: tour.type,
          startingDate: date,
          customerName: cust,
          hotelName: hotel,
          address: hotelInfo?.address,
          latitude: hasCoord ? hotelInfo?.lat ?? null : null,
          longitude: hasCoord ? hotelInfo?.lng ?? null : null,
          phone: '+84 900 000 000',
          mail: `${cust.toLowerCase().replace(/\s+/g, '.')}@mail.com`,
          totalPax: pax,
          paxDetail: `${pax} guests`,
          payment: 'PENDING',
          createdWho: channel === 'TRIPADVISOR' || channel === 'WEBSITE' ? 'Pub-Sub System' : 'Demo Admin',
        },
      });
    }
  }

  // ─── 6. Manually create bus trips (the engine auto-assign was removed) ─────
  // Every clean booking is put on its own bus (same as a manual action on the Dispatch Board).
  const pending = await prisma.booking.findMany({
    where: { bookingRef: { in: refs }, status: 'PENDING' },
    orderBy: [{ startingDate: 'asc' }, { bookingRef: 'asc' }],
  });
  let busSeq = 0;
  for (const b of pending) {
    const tour = b.tourId
      ? await prisma.tour.findUnique({ where: { id: b.tourId } })
      : null;
    const label = b.tourType === 'PRIVATE_TOUR' ? 'Priv' : 'Group';
    const dayStart = new Date(b.startingDate as any);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(
      dayStart.getTime() + (tour?.durationDays ?? 1) * 86400000,
    );
    const bus = await prisma.assignment.create({
      data: {
        code: `${label} Bus - ${++busSeq}`,
        startDate: dayStart,
        endDate: dayEnd,
        status: AssignmentStatus.PENDING,
        tourType: b.tourType as any,
        tourName: b.tourName ?? tour?.name ?? undefined,
        durationDays: tour?.durationDays ?? 1,
        createdWho: 'Demo',
        origin: 'MANUAL',
      },
    });
    await prisma.booking.update({
      where: { id: b.id },
      data: { assignmentId: bus.id, paxSequence: 1 },
    });
    await audit.log({
      entityType: 'Assignment',
      entityId: bus.id,
      action: 'CREATE',
    });
  }

  // ─── 6b. Activate the 2-layer settlement for each bus trip ────────────────
  // Layer 1: every booking on the trip has one "Collect on behalf COD" entry → the UI shows
  //        the collect-cash-from-passenger icon. Layer 2: the bus fee paid to the transport provider.
  // At the same time, move some trips to the VERIFYING state (fake progress
  // "waiting for Admin/Accounting to verify").
  const demoBusesAfter = await prisma.assignment.findMany({
    where: { code: { contains: ' Bus ' } },
    include: { bookings: true, provider: true },
  });

  for (const bus of demoBusesAfter) {
    // Fake progress: half of today's trips are "waiting for verification".
    if (bus.status !== AssignmentStatus.COMPLETED && bus.status !== AssignmentStatus.CANCELED) {
      await prisma.assignment.update({
        where: { id: bus.id },
        data: { status: AssignmentStatus.VERIFYING },
      });
    }
  }

  // ─── 7. Kết quả ────────────────────────────────────────────────────────
  const buses = await prisma.assignment.findMany({
    where: { code: { contains: ' Bus ' } },
    include: {
      bookings: {
        orderBy: { paxSequence: 'asc' },
      },
      vehicle: true,
      driver: { select: { name: true } },
      guide: { select: { name: true } },
    },
    orderBy: [{ startDate: 'asc' }, { sequenceIndex: 'asc' }],
  });

  console.log('\n==================== DISPATCH BOARD (demo) ====================');
  for (const bus of buses) {
    const pax = bus.bookings.reduce((s, b) => s + (b.totalPax ?? 0), 0);
    console.log(
      `\n🚌 [${bus.code}] ${bus.tourType} · ${new Date(bus.startDate).toLocaleDateString()} · ${bus.status} · ${pax}/${bus.vehicle?.capacity ?? 12} pax`,
    );
    console.log(
      `   Driver: ${bus.driver?.name ?? '—'}  |  Guide: ${bus.guide?.name ?? '—'}  |  Vehicle: ${bus.vehicle?.plateNumber ?? '—'}`,
    );
    for (const b of bus.bookings) {
      const coord = b.latitude != null ? ` (${b.latitude},${b.longitude})` : '';
      console.log(`   #${b.paxSequence} ${b.bookingRef} · ${b.customerName} · ${b.hotelName ?? b.address}${coord} · ${b.totalPax} pax`);
    }
  }
  const totalPax = buses.reduce((s, b) => s + b.bookings.reduce((x, y) => x + (y.totalPax ?? 0), 0), 0);
  console.log(`\nTotal: ${buses.length} buses, ${pending.length} pending bookings assigned, ${totalPax} pax`);

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
