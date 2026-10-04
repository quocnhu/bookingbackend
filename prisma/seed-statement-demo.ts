import 'dotenv/config';
import { AssignmentStatus, FeeFlowType, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const D = (s: string) => new Date(`${s}T12:00:00`);
const DT = (s: string) => new Date(`${s}T18:00:00`);

/**
 * Demo statement data — one row per case so Accounting can open the
 * voucher/statement forms for guide, driver and transport provider:
 *
 *  Demo Bus A  Oct 1      Huong + Tai   locked, UNPAID (guide returns to company)
 *  Demo Bus B  Oct 2      Huong + Son   locked, PAID to Huong (period Oct 2)
 *  Demo Bus C  Oct 3–4    Anh + Son     locked, UNPAID (company returns to Anh)
 *  Demo Bus D  Oct 4      Mai + Tai     submitted, NOT locked yet
 *  Demo Bus E  Oct 5      Anh + Binh    upcoming, NOT locked yet
 *  Provider period (An Phu, Oct 2–4): Bus B + Bus C PAID at provider level
 */
async function main() {
  // ── Cleanup previous demo feed (idempotent re-run) ──
  await prisma.paymentPeriod.deleteMany({ where: { note: 'demo-statement' } });
  await prisma.booking.deleteMany({
    where: { bookingRef: { startsWith: 'DEMO-' } },
  });
  await prisma.assignment.deleteMany({
    where: { code: { startsWith: 'Demo Bus ' } },
  });

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@booking.local' },
    select: { id: true, name: true },
  });
  if (!admin) throw new Error('Admin user missing — run seed.ts first');

  const cat = async (code: string) => {
    const c = await prisma.settlementCategory.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!c) throw new Error(`SettlementCategory ${code} missing`);
    return c.id;
  };
  const collectCat = await cat('CUSTOMER_PAYMENT');
  const vehicleCat = await cat('VEHICLE_FEE');

  const tourId = async (code: string) => {
    const t = await prisma.tour.findUnique({
      where: { code },
      select: { id: true, name: true },
    });
    if (!t) throw new Error(`Tour ${code} missing`);
    return t;
  };
  const T2 = await tourId('TOUR-0002');
  const T4 = await tourId('TOUR-0004');
  const T5 = await tourId('TOUR-0005');

  const HUONG = 'crew-guide-huong';
  const ANH = 'crew-guide-anh';
  const MAI = 'crew-guide-mai';
  const TAI = 'crew-driver-tai';
  const SON = 'crew-driver-son';
  const BINH = 'crew-driver-binh';
  const FLEET = 'demo-company-fleet';
  const ANPHU = 'demo-provider';

  const money = async (
    assignmentId: string,
    rows: Array<{ amount: number; categoryId: string; note: string }>,
  ) => {
    for (const r of rows) {
      await prisma.settlement.create({
        data: {
          amount: new Prisma.Decimal(r.amount),
          note: r.note,
          assignmentId,
          categoryId: r.categoryId,
          createdById: admin.id,
          createdByName: admin.name,
        },
      });
    }
  };

  const booking = (
    ref: string,
    tour: { id: string },
    start: Date,
    assignmentId: string,
    customer: string,
  ) =>
    prisma.booking.create({
      data: {
        bookingRef: ref,
        channel: 'MANUAL',
        status: 'ASSIGNED',
        tourId: tour.id,
        hotelName: 'Demo Hotel',
        phone: '0900000001',
        customerName: customer,
        totalPax: 4,
        startingDate: start,
        assignmentId,
        paxSequence: 1,
        createdWho: 'Demo feed',
      },
    });

  const mkTrip = (def: {
    code: string;
    tour: { id: string; name: string };
    start: string;
    end: string;
    guideId: string;
    guideName: string;
    driverId: string;
    vehicleId: string;
    providerId: string;
    status: AssignmentStatus;
  }) =>
    prisma.assignment.create({
      data: {
        code: def.code,
        tourName: def.tour.name,
        tourType: 'GROUP_TOUR',
        totalPax: 4,
        startDate: D(def.start),
        endDate: D(def.end),
        vehicleId: def.vehicleId,
        providerId: def.providerId,
        guideId: def.guideId,
        driverId: def.driverId,
        status: def.status,
        createdWho: 'Demo feed',
      },
    });

  const lock = (
    assignmentId: string,
    guideId: string,
    guideName: string,
    net: number,
    flow: FeeFlowType,
    finalized: string,
  ) =>
    prisma.tourReport.create({
      data: {
        assignmentId,
        submittedById: guideId,
        submittedByName: guideName,
        submittedAt: DT(finalized),
        actualPax: 4,
        status: 'VERIFIED',
        settlementFlow: flow,
        netAmount: new Prisma.Decimal(net),
        moneyPayableToId: guideId,
        moneyVerifiedById: admin.id,
        moneyVerifiedByName: admin.name,
        moneyVerifiedAt: DT(finalized),
        finalizedById: admin.id,
        finalizedByName: admin.name,
        finalizedAt: DT(finalized),
      },
    });

  // ── A: Oct 1, locked, UNPAID (Huong returns 6M to company) ──
  const A = await mkTrip({
    code: 'Demo Bus A',
    tour: T2,
    start: '2026-10-01',
    end: '2026-10-01',
    guideId: HUONG,
    guideName: 'Tran Thi Huong',
    driverId: TAI,
    vehicleId: `${FLEET}-seat-12`,
    providerId: FLEET,
    status: AssignmentStatus.COMPLETED,
  });
  await booking('DEMO-A1', T2, D('2026-10-01'), A.id, 'Demo Guest A');
  await money(A.id, [
    { amount: 8000000, categoryId: collectCat, note: 'Collected from guests' },
    { amount: 2000000, categoryId: vehicleCat, note: 'Vehicle fee' },
  ]);
  await lock(A.id, HUONG, 'Tran Thi Huong', 6000000, FeeFlowType.COLLECT_MONEY, '2026-10-01');

  // ── B: Oct 2, locked, PAID to Huong (company returned 1.5M) ──
  const B = await mkTrip({
    code: 'Demo Bus B',
    tour: T4,
    start: '2026-10-02',
    end: '2026-10-02',
    guideId: HUONG,
    guideName: 'Tran Thi Huong',
    driverId: SON,
    vehicleId: `${ANPHU}-seat-16`,
    providerId: ANPHU,
    status: AssignmentStatus.COMPLETED,
  });
  await booking('DEMO-B1', T4, D('2026-10-02'), B.id, 'Demo Guest B');
  await money(B.id, [
    { amount: 5000000, categoryId: collectCat, note: 'Collected from guests' },
    { amount: 6500000, categoryId: vehicleCat, note: 'Vehicle + extras' },
  ]);
  await lock(B.id, HUONG, 'Tran Thi Huong', -1500000, FeeFlowType.PAY_MONEY, '2026-10-02');

  // ── C: Oct 3–4, locked, UNPAID (company returns 5M to Anh) ──
  const C = await mkTrip({
    code: 'Demo Bus C',
    tour: T5,
    start: '2026-10-03',
    end: '2026-10-04',
    guideId: ANH,
    guideName: 'Pham Van Anh',
    driverId: SON,
    vehicleId: `${ANPHU}-seat-16`,
    providerId: ANPHU,
    status: AssignmentStatus.COMPLETED,
  });
  await booking('DEMO-C1', T5, D('2026-10-03'), C.id, 'Demo Guest C');
  await money(C.id, [
    { amount: 2000000, categoryId: collectCat, note: 'Collected from guests' },
    { amount: 7000000, categoryId: vehicleCat, note: 'Vehicle 2 days' },
  ]);
  await lock(C.id, ANH, 'Pham Van Anh', -5000000, FeeFlowType.PAY_MONEY, '2026-10-04');

  // ── D: Oct 4, submitted but NOT locked ──
  const Dtrip = await mkTrip({
    code: 'Demo Bus D',
    tour: T2,
    start: '2026-10-04',
    end: '2026-10-04',
    guideId: MAI,
    guideName: 'Do Thi Mai',
    driverId: TAI,
    vehicleId: `${FLEET}-seat-12`,
    providerId: FLEET,
    status: AssignmentStatus.DISPATCHED,
  });
  await booking('DEMO-D1', T2, D('2026-10-04'), Dtrip.id, 'Demo Guest D');
  await prisma.tourReport.create({
    data: {
      assignmentId: Dtrip.id,
      submittedById: MAI,
      submittedByName: 'Do Thi Mai',
      submittedAt: DT('2026-10-04'),
      actualPax: 4,
      status: 'SUBMITTED',
    },
  });

  // ── E: Oct 5, upcoming, no report at all ──
  const E = await mkTrip({
    code: 'Demo Bus E',
    tour: T4,
    start: '2026-10-05',
    end: '2026-10-05',
    guideId: ANH,
    guideName: 'Pham Van Anh',
    driverId: BINH,
    vehicleId: `${FLEET}-seat-12`,
    providerId: FLEET,
    status: AssignmentStatus.PENDING,
  });
  await booking('DEMO-E1', T4, D('2026-10-05'), E.id, 'Demo Guest E');

  // ── Guide period: Huong, Oct 2 only → Bus B PAID ──
  const hp = await prisma.paymentPeriod.create({
    data: {
      personId: HUONG,
      payeeType: 'COMPANY_GUIDE',
      payeeName: 'Tran Thi Huong',
      fromDate: D('2026-10-02'),
      toDate: new Date('2026-10-02T23:59:59.999'),
      tourCount: 1,
      personReturnsToCompany: new Prisma.Decimal(0),
      companyReturnsToPerson: new Prisma.Decimal(1500000),
      totalNet: new Prisma.Decimal(-1500000),
      note: 'demo-statement',
      createdById: admin.id,
      createdByName: admin.name,
      lines: {
        create: [
          {
            assignmentId: B.id,
            payableToId: HUONG,
            tourName: T4.name,
            tourDate: DT('2026-10-02'),
            netAmount: new Prisma.Decimal(-1500000),
            flow: FeeFlowType.PAY_MONEY,
            note: 'Demo Bus B',
          },
        ],
      },
    },
  });

  // ── Provider period: An Phu, Oct 2–4 → Bus B (1.8M) + Bus C (3.6M) PAID ──
  await prisma.paymentPeriod.create({
    data: {
      personId: ANPHU,
      payeeType: 'TRANSPORT_PROVIDER',
      payeeName: 'An Phu Transport',
      fromDate: D('2026-10-02'),
      toDate: new Date('2026-10-04T23:59:59.999'),
      tourCount: 2,
      personReturnsToCompany: new Prisma.Decimal(0),
      companyReturnsToPerson: new Prisma.Decimal(5400000),
      totalNet: new Prisma.Decimal(-5400000),
      note: 'demo-statement',
      createdById: admin.id,
      createdByName: admin.name,
      lines: {
        create: [
          {
            assignmentId: B.id,
            payableToId: SON,
            tourName: T4.name,
            tourDate: DT('2026-10-02'),
            netAmount: new Prisma.Decimal(1800000),
            flow: FeeFlowType.PAY_MONEY,
            note: 'Demo Bus B · Le Van Son',
          },
          {
            assignmentId: C.id,
            payableToId: SON,
            tourName: T5.name,
            tourDate: DT('2026-10-04'),
            netAmount: new Prisma.Decimal(3600000),
            flow: FeeFlowType.PAY_MONEY,
            note: 'Demo Bus C · Le Van Son',
          },
        ],
      },
    },
  });

  console.log('✅ Demo statement feed: 5 trips (A–E), 1 guide period', hp.id.slice(0, 8), '+ 1 provider period');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
