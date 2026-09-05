import * as bcrypt from 'bcrypt';
import {
  PrismaService,
} from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { AssignmentStatus, FeeFlowType, GuideType, RoleType, TourType } from '@prisma/client';

const prisma = new PrismaService();
const audit = new AuditService(prisma);

// ─── Toạ độ khách sạn (Da Nang / Hoi An) ───────────────────────────────
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
      ['BK-0004', 'James Brown', 'Aria Grand Hotel', 2, 'MANUAL', 'GROUP_TOUR', true], // sau đó bị hủy
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
    await prisma.settlement.deleteMany({ where: { assignmentId: { in: busIds } } });
    await prisma.settlement.deleteMany({ where: { booking: { is: { assignmentId: { in: busIds } } } } });
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

  // ─── 3. Providers + vehicles (công ty + nhà xe ngoài) ──────────────────
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

  // Binh nghỉ phép ngày mai → hệ thống sẽ chọn driver khác cho ngày mai.
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

  // ─── 5. Danh mục khoản thu/chi (cho quyết toán 2 lớp) ──────────────────
  const demoCategories: Array<{ code: string; name: string; flowType: FeeFlowType }> = [
    { code: 'COLLECT_ON_BEHALF', name: 'Thu hộ COD', flowType: FeeFlowType.COLLECT_MONEY },
    { code: 'CUSTOMER_PAYMENT', name: 'Thu tiền khách', flowType: FeeFlowType.COLLECT_MONEY },
    { code: 'RESTAURANT', name: 'Tiền nhà hàng', flowType: FeeFlowType.PAY_MONEY },
    { code: 'VEHICLE_FEE', name: 'Phí xe', flowType: FeeFlowType.PAY_MONEY },
    { code: 'TOLL_FEE', name: 'Phí cầu đường', flowType: FeeFlowType.PAY_MONEY },
    { code: 'OTHERS', name: 'Khác', flowType: FeeFlowType.PAY_MONEY },
  ];
  const categoryMap = new Map<string, string>();
  for (const c of demoCategories) {
    const cat = await prisma.settlementCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, flowType: c.flowType },
      create: { code: c.code, name: c.name, flowType: c.flowType, isSystem: true },
    });
    categoryMap.set(c.code, cat.id);
  }

  // Người kế toán/quản lý (người tạo các khoản quyết toán mặc định).
  const accounting = await prisma.user.upsert({
    where: { id: 'demo-accounting' },
    update: { name: 'Accounting Room', role: RoleType.OFFICE, userType: 'office' },
    create: {
      id: 'demo-accounting',
      name: 'Accounting Room',
      email: 'accounting@demo.local',
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

  // ─── 6. Tạo chuyến xe thủ công (engine auto-assign đã bị gỡ) ───────────
  // Mỗi booking sạch được xếp vào 1 bus riêng (giống thao tác tay trên Dispatch Board).
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

  // ─── 6b. Kích hoạt quyết toán 2 lớp cho từng chuyến xe ────────────────
  // Lớp 1: mỗi booking trên chuyến có 1 khoản "Thu hộ COD" → giao diện hiển thị
  //        biểu tượng thu tiền từ khách. Lớp 2: phí xe trả nhà xe.
  // Đồng thời đưa một số chuyến sang trạng thái VERIFYING (fake progress
  // "chờ Admin/Kế toán xác minh").
  const demoBusesAfter = await prisma.assignment.findMany({
    where: { code: { contains: ' Bus ' } },
    include: { bookings: true, provider: true },
  });

  const collectCatId = categoryMap.get('COLLECT_ON_BEHALF') ?? null;
  const vehicleCatId = categoryMap.get('VEHICLE_FEE') ?? null;

  for (const bus of demoBusesAfter) {
    // Lớp 1 — từng booking.
    for (const bk of bus.bookings) {
      const existing = await prisma.settlement.findFirst({ where: { bookingId: bk.id } });
      if (existing) continue;
      await prisma.settlement.create({
        data: {
          amount: bk.totalPax && bk.totalPax >= 4 ? 50 : 25,
          note: `Thu hộ COD — ${bk.customerName}`,
          bookingId: bk.id,
          assignmentId: bus.id,
          categoryId: collectCatId,
          createdById: accounting.id,
        },
      });
    }
    // Lớp 2 — phí xe.
    if (bus.provider && bus.provider.id !== 'demo-company-fleet') {
      const existing = await prisma.settlement.findFirst({
        where: { assignmentId: bus.id, categoryId: vehicleCatId },
      });
      if (!existing) {
        await prisma.settlement.create({
          data: {
            amount: 120,
            note: `Phí xe — ${bus.code}`,
            assignmentId: bus.id,
            categoryId: vehicleCatId,
            createdById: accounting.id,
          },
        });
      }
    }
    // Fake progress: một nửa số chuyến của ngày hôm nay đang "chờ xác minh".
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
        include: { settlements: true },
      },
      settlements: true,
      vehicle: true,
      driver: { select: { name: true } },
      guide: { select: { name: true } },
    },
    orderBy: [{ startDate: 'asc' }, { sequenceIndex: 'asc' }],
  });

  console.log('\n==================== DISPATCH BOARD (demo) ====================');
  for (const bus of buses) {
    const pax = bus.bookings.reduce((s, b) => s + (b.totalPax ?? 0), 0);
    const busSettlementAmt = bus.settlements.reduce((s, x) => s + Number(x.amount ?? 0), 0);
    console.log(
      `\n🚌 [${bus.code}] ${bus.tourType} · ${new Date(bus.startDate).toLocaleDateString()} · ${bus.status} · ${pax}/${bus.vehicle?.capacity ?? 12} pax · Lớp2 phí: ${busSettlementAmt}`,
    );
    console.log(
      `   Driver: ${bus.driver?.name ?? '—'}  |  Guide: ${bus.guide?.name ?? '—'}  |  Vehicle: ${bus.vehicle?.plateNumber ?? '—'}`,
    );
    for (const b of bus.bookings) {
      const coord = b.latitude != null ? ` (${b.latitude},${b.longitude})` : '';
      const s0 = b.settlements[0];
      const pay = s0 ? `💵 Thu hộ ${s0.amount} (${s0.note})` : '💵 chưa có settlement';
      console.log(`   #${b.paxSequence} ${b.bookingRef} · ${b.customerName} · ${b.hotelName ?? b.address}${coord} · ${b.totalPax} pax · ${pay}`);
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
