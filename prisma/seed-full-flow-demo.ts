import 'dotenv/config';
import {
  AssignmentExecutionMode,
  AssignmentOrigin,
  AssignmentStatus,
  BookingProvider,
  BookingStatus,
  DriverType,
  FeeFlowType,
  GuideType,
  MoneyPayeeType,
  NotificationType,
  PartnerHandoffStatus,
  PartnerMoneyFlow,
  PartnerPaymentStatus,
  PayerType,
  PayeeType,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  PrismaClient,
  RoleType,
  TourReportSource,
  TourReportStatus,
  TransportRequestStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

function atHcm(date: Date, hour: number, minute = 0) {
  // Build a date by formatting in local runtime as plain Date for seed simplicity.
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * DAY_MS);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function money(n: number) {
  return n;
}

async function clearData() {
  console.log('Clearing booking/assignment/notification/accounting data...');
  await prisma.$transaction(async (tx) => {
    await tx.bookingPayment.deleteMany({});
    await tx.hotelCommissionPayout.deleteMany({});
    await tx.paymentPeriodLine.deleteMany({});
    await tx.paymentPeriod.deleteMany({});
    await tx.partnerPayment.deleteMany({});
    await tx.settlement.updateMany({ where: { reversesId: { not: null } }, data: { reversesId: null } });
    await tx.settlement.deleteMany({});
    await tx.tourReport.deleteMany({});
    await tx.notification.deleteMany({});
    await tx.booking.updateMany({ data: { assignmentId: null, movedFromBusId: null, parentBookingId: null } });
    await tx.assignment.deleteMany({});
    await tx.booking.deleteMany({});
    await tx.rawData.deleteMany({});
  });
}

async function main() {
  await clearData();

  const now = new Date();
  const today = startOfDay(now);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: {
      guideProfile: true,
      driverProfile: true,
      roles: { include: { role: true } },
    },
  });
  const byRole = (role: RoleType) => users.filter((u) => u.role === role);
  const admin = byRole(RoleType.ADMIN)[0];
  const office = byRole(RoleType.OFFICE)[0] ?? admin;
  const accounting = byRole(RoleType.ACCOUNTING)[0] ?? admin;
  const guides = byRole(RoleType.TOUR_GUIDE);
  const officialGuides = guides.filter((g) => g.guideProfile?.type === GuideType.OFFICIAL);
  const freelanceGuides = guides.filter((g) => g.guideProfile?.type === GuideType.FREELANCE);
  const drivers = byRole(RoleType.DRIVER);
  const companyDrivers = drivers.filter((d) => d.driverProfile?.type === DriverType.COMPANY);
  const freelanceDrivers = drivers.filter((d) => d.driverProfile?.type === DriverType.FREELANCE);
  const providers = await prisma.transportationProvider.findMany({ include: { vehicles: true } });
  const companyProvider = providers.find((p) => p.isCompany) ?? providers[0];
  const externalProvider = providers.find((p) => !p.isCompany) ?? providers[1] ?? providers[0];
  const vehicles = await prisma.vehicle.findMany({ include: { provider: true } });
  const companyVehicles = vehicles.filter((v) => v.provider?.isCompany);
  const externalVehicles = vehicles.filter((v) => !v.provider?.isCompany);
  let hotels = await prisma.hotel.findMany({ where: { isActive: true } });
  let hotel = hotels[0];
  if (!hotel) {
    hotel = await prisma.hotel.create({ data: { name: 'Demo Hotel', commissionPercent: 10 as any, isActive: true, address: '1 Demo St', phone: '0900000000', email: 'hotel.demo@booking.local' } });
    hotels = [hotel];
  }
  const hotelUser = await prisma.user.findFirst({ where: { role: RoleType.HOTEL, isActive: true } });
  if (!hotelUser) {
    const role = await prisma.role.findFirst({ where: { name: 'HOTEL' } });
    const bcrypt = require('bcrypt');
    await prisma.user.create({ data: { email: 'hotel.demo@booking.local', name: 'Demo Hotel Account', role: RoleType.HOTEL, hotel: { connect: { id: hotel.id } }, passwordHash: await bcrypt.hash('demo123', 10), isActive: true, roles: role ? { create: { roleId: role.id } } : undefined } as any });
  } else if (!hotelUser.hotelId) {
    await prisma.user.update({ where: { id: hotelUser.id }, data: { hotelId: hotel.id } });
  }
  const tours = await prisma.tour.findMany({ orderBy: { code: 'asc' }, include: { typePrices: true } });
  const groupTours = tours.filter((t) => t.typePrices.some((p) => p.type === 'GROUP_TOUR' && Number(p.adultPrice) > 0));
  const privateTours = tours.filter((t) => t.typePrices.some((p) => p.type === 'PRIVATE_TOUR' && Number(p.adultPrice) > 0));
  const fallbackGroup = groupTours[0] ?? tours[0];
  const fallbackPrivate = privateTours[0] ?? tours[1] ?? tours[0];

  const rotate = <T>(items: T[], by: number): T[] =>
    items.length
      ? [...items.slice(by % items.length), ...items.slice(0, by % items.length)]
      : [];
  const pickUnique = <T extends { id: string }>(
    pool: T[],
    used: Set<string>,
    preferred?: (item: T) => boolean,
  ): T | undefined => {
    const ordered = preferred
      ? [...pool.filter(preferred), ...pool.filter((item) => !preferred(item))]
      : pool;
    const chosen = ordered.find((item) => !used.has(item.id));
    if (chosen) used.add(chosen.id);
    return chosen;
  };

  if (!admin) throw new Error('No admin user found');
  if (!fallbackGroup || !fallbackPrivate) throw new Error('Need tours');
  if (hotel.commissionPercent == null) await prisma.hotel.update({ where: { id: hotel.id }, data: { commissionPercent: 10 as any } });

  const partner = await prisma.partnerAgency.upsert({
    where: { name: 'Demo Outsource Partner' },
    update: { isActive: true, contactName: 'Partner Ops', phone: '0900000001', email: 'partner.demo@booking.local' },
    create: { name: 'Demo Outsource Partner', isActive: true, contactName: 'Partner Ops', phone: '0900000001', email: 'partner.demo@booking.local' },
  });

  let bookingSeq = 1;
  let assignmentSeq = 1;
  const dayPlans = [-2, -1, 0, 1, 2, 3, 4].map((offset) => addDays(today, offset));

  const mkBooking = async (args: {
    assignmentId?: string | null;
    date: Date;
    tour: any;
    tourType: 'GROUP_TOUR' | 'PRIVATE_TOUR';
    pax: number;
    channel?: BookingProvider;
    status?: BookingStatus;
    payment?: PaymentStatus;
    hotelId?: string | null;
    totalAmount?: number;
    customerName: string;
    mail?: string;
    lateBooking?: boolean;
  }) => {
    const ref = `DEMO-BKG-${String(bookingSeq++).padStart(4, '0')}`;
    const commissionPercent = args.hotelId ? (hotel?.commissionPercent ?? 10) : null;
    return prisma.booking.create({
      data: {
        bookingRef: ref,
        channel: args.channel ?? BookingProvider.WEBSITE,
        status: args.status ?? BookingStatus.ASSIGNED,
        tourId: args.tour.id,
        startingDate: atHcm(args.date, 8),
        departureTime: '08:00',
        customerName: args.customerName,
        hotelName: args.hotelId ? (hotel?.name ?? 'Demo Hotel') : 'Walk-in',
        hotelId: args.hotelId ?? null,
        hotelCommissionPercent: commissionPercent as any,
        phone: '0901234567',
        mail: args.mail ?? `guest${bookingSeq}@demo.local`,
        totalPax: args.pax,
        paxDetail: `${args.pax} adults`,
        tourType: args.tourType as any,
        tourName: args.tour.name,
        payment: args.payment ?? PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        totalAmount: money(args.totalAmount ?? args.pax * 1000000) as any,
        currency: 'VND',
        assignmentId: args.assignmentId ?? null,
        lateBooking: args.lateBooking ?? false,
        createdWho: admin.name ?? admin.email,
      },
    });
  };

  const mkAssignment = async (args: any) => {
    const code = `${args.tourType === 'GROUP_TOUR' ? 'GRP' : 'PRV'}-DEMO-${String(assignmentSeq++).padStart(2, '0')}`;
    const assignment = await prisma.assignment.create({
      data: {
        code,
        startDate: atHcm(args.date, args.hour ?? 8),
        endDate: atHcm(args.date, args.endHour ?? 16),
        tourName: args.tour.name,
        tourType: args.tourType,
        durationDays: args.tour.durationDays ?? 1,
        totalPax: args.totalPax ?? 0,
        vehicleId: args.vehicleId ?? null,
        providerId: args.providerId ?? null,
        driverId: args.driverId ?? null,
        guideId: args.guideId ?? null,
        executionMode: args.executionMode ?? AssignmentExecutionMode.COMPANY_GUIDED,
        partnerId: args.partnerId ?? null,
        partnerStatus: args.partnerStatus ?? null,
        partnerAmount: args.partnerAmount as any,
        partnerCurrency: args.partnerCurrency ?? 'VND',
        partnerMoneyFlow: args.partnerMoneyFlow ?? null,
        partnerConfirmedById: args.partnerConfirmedById ?? null,
        partnerConfirmedByName: args.partnerConfirmedByName ?? null,
        partnerConfirmedAt: args.partnerConfirmedAt ?? null,
        providerRequestStatus: args.providerRequestStatus ?? TransportRequestStatus.NOT_REQUIRED,
        providerRequestedAt: args.providerRequestedAt ?? null,
        providerRespondedAt: args.providerRespondedAt ?? null,
        providerDeadline: args.providerDeadline ?? null,
        providerRequestNote: args.providerRequestNote ?? null,
        status: args.status ?? AssignmentStatus.PENDING,
        origin: AssignmentOrigin.MANUAL,
        createdWho: admin.name ?? admin.email,
        guideConfirmationRequestedAt: args.guideConfirmationRequestedAt ?? null,
        guideConfirmedAt: args.guideConfirmedAt ?? null,
        guideDeclinedAt: args.guideDeclinedAt ?? null,
        guideDeclineReason: args.guideDeclineReason ?? null,
      },
    });
    return assignment;
  };

  const notify = async (userId: string, title: string, body: string, type = NotificationType.GENERAL) => {
    await prisma.notification.create({ data: { userId, type, title, body, data: { source: 'seed-full-flow-demo' } as any } });
  };

  for (const [i, day] of dayPlans.entries()) {
    const dayGuides = rotate(guides, i);
    const dayDrivers = rotate(drivers, i);
    const usedGuideIds = new Set<string>();
    const usedDriverIds = new Set<string>();
    const pickGuide = (type?: GuideType) =>
      pickUnique(
        dayGuides,
        usedGuideIds,
        type ? (guide) => guide.guideProfile?.type === type : undefined,
      );
    const pickDriver = (type?: DriverType) =>
      pickUnique(
        dayDrivers,
        usedDriverIds,
        type ? (driver) => driver.driverProfile?.type === type : undefined,
      );
    const pickExternalDriver = () =>
      pickUnique(
        dayDrivers.filter((driver) => driver.providerId === externalProvider?.id),
        usedDriverIds,
      ) ?? pickDriver(DriverType.FREELANCE);
    const cVehicle = companyVehicles[i % Math.max(companyVehicles.length, 1)] ?? vehicles[i % Math.max(vehicles.length, 1)];
    const eVehicle = externalVehicles[i % Math.max(externalVehicles.length, 1)] ?? vehicles[(i + 1) % Math.max(vehicles.length, 1)];

    const p1Guide = pickGuide(GuideType.OFFICIAL);
    const p1Driver = pickDriver(DriverType.COMPANY);
    const p1Crewed = !!(p1Guide?.id && p1Driver?.id);

    // 1) GROUP - company guided, completed, accounting locked, exported paid
    const g1Guide = pickGuide(GuideType.OFFICIAL);
    const g1Driver = pickDriver(DriverType.COMPANY);
    const g1Crewed = !!(g1Guide?.id && g1Driver?.id);
    const g1 = await mkAssignment({
      date: day, hour: 8, endHour: 16, tour: fallbackGroup, tourType: 'GROUP_TOUR', totalPax: 12,
      guideId: g1Guide?.id ?? null, driverId: g1Driver?.id ?? null, vehicleId: g1Crewed ? cVehicle?.id : null, providerId: g1Crewed ? companyProvider?.id : null,
      status: g1Crewed ? AssignmentStatus.COMPLETED : AssignmentStatus.PENDING,
      guideConfirmationRequestedAt: g1Guide ? addDays(day, -1) : null,
      guideConfirmedAt: g1Crewed ? addDays(day, -1) : null,
    });
    await mkBooking({
      assignmentId: g1.id, date: day, tour: fallbackGroup, tourType: 'GROUP_TOUR', pax: 12,
      customerName: `Group Customer ${i + 1}`, hotelId: hotel?.id, payment: PaymentStatus.PAID,
      status: g1Crewed ? BookingStatus.ASSIGNED : BookingStatus.PENDING, totalAmount: 12000000,
    });
    if (g1Crewed) {
      await prisma.tourReport.create({
        data: {
          assignmentId: g1.id,
          submittedById: g1Guide?.id,
          submittedByName: g1Guide?.name ?? 'Guide',
          submittedAt: atHcm(day, 17),
          actualPax: 12,
          status: TourReportStatus.VERIFIED,
          verifiedById: office?.id,
          verifiedByName: office?.name ?? office?.email,
          verifiedAt: atHcm(day, 18),
          finalizedById: office?.id,
          finalizedByName: office?.name ?? office?.email,
          finalizedAt: atHcm(day, 18),
          settlementFlow: FeeFlowType.COLLECT_MONEY,
          netAmount: 3000000 as any,
          moneyVerifiedById: accounting?.id,
          moneyVerifiedByName: accounting?.name ?? accounting?.email,
          moneyVerifiedAt: atHcm(day, 18),
          moneyPayableToId: g1Guide?.id,
          moneyPayeeType: MoneyPayeeType.GUIDE,
        },
      });
      await prisma.settlement.create({ data: { amount: 3000000 as any, note: 'Collected cash from group tour', assignmentId: g1.id, categoryId: (await prisma.settlementCategory.findFirst({ where: { code: 'CUSTOMER_PAYMENT' } }))?.id, createdById: g1Guide?.id ?? admin.id, createdByName: g1Guide?.name ?? 'Guide' } });
      const period = await prisma.paymentPeriod.create({
        data: {
          personId: g1Guide?.id ?? admin.id,
          payeeType: PayeeType.COMPANY_GUIDE,
          payeeName: g1Guide?.name ?? 'Guide',
          fromDate: startOfDay(day),
          toDate: atHcm(day, 23, 59),
          tourCount: 1,
          personReturnsToCompany: 3000000 as any,
          companyReturnsToPerson: 0 as any,
          totalNet: 3000000 as any,
          createdById: accounting?.id ?? admin.id,
          createdByName: accounting?.name ?? 'Accounting',
          paidAt: addDays(day, 1),
          paidById: accounting?.id ?? admin.id,
          paidByName: accounting?.name ?? 'Accounting',
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paymentReference: `PAY-${codeSafe(g1.code)}`,
        },
      });
      await prisma.paymentPeriodLine.create({ data: { periodId: period.id, assignmentId: g1.id, payableToId: g1Guide?.id ?? admin.id, tourName: g1.tourName, tourDate: g1.startDate, netAmount: 3000000 as any, flow: FeeFlowType.COLLECT_MONEY, note: 'Demo locked line' } });
      await notify(g1Guide?.id ?? admin.id, 'Money verified', `${g1.code} was verified and exported.`);
    }

    // 2) PRIVATE - completed with hotel commission payout/paid/unpaid cases.
    const p1 = await mkAssignment({
      date: day, hour: 8, endHour: 15, tour: fallbackPrivate, tourType: 'PRIVATE_TOUR', totalPax: 4,
      guideId: p1Guide?.id ?? null, driverId: p1Driver?.id ?? null, vehicleId: p1Crewed ? cVehicle?.id : null, providerId: p1Crewed ? companyProvider?.id : null,
      status: p1Crewed ? AssignmentStatus.COMPLETED : AssignmentStatus.PENDING,
      guideConfirmationRequestedAt: p1Guide ? addDays(day, -1) : null,
      guideConfirmedAt: p1Crewed ? addDays(day, -1) : null,
    });
    const bP1 = await mkBooking({
      assignmentId: p1.id, date: day, tour: fallbackPrivate, tourType: 'PRIVATE_TOUR', pax: 4,
      customerName: `Private Hotel ${i + 1}`, hotelId: hotel?.id, payment: PaymentStatus.PAID,
      status: p1Crewed ? BookingStatus.ASSIGNED : BookingStatus.PENDING, totalAmount: 6000000,
    });
    if (p1Crewed) {
      await prisma.tourReport.create({ data: { assignmentId: p1.id, submittedById: p1Guide?.id, submittedByName: p1Guide?.name ?? 'Guide', status: TourReportStatus.VERIFIED, verifiedById: office?.id, verifiedByName: office?.name ?? 'Office', verifiedAt: atHcm(day, 18), finalizedById: office?.id, finalizedByName: office?.name ?? 'Office', finalizedAt: atHcm(day, 18), settlementFlow: FeeFlowType.PAY_MONEY, netAmount: 500000 as any, moneyVerifiedById: accounting?.id, moneyVerifiedByName: accounting?.name ?? 'Accounting', moneyVerifiedAt: atHcm(day, 18), moneyPayableToId: p1Guide?.id, moneyPayeeType: MoneyPayeeType.GUIDE } });
      if (hotel) {
        const amount = Math.round(6000000 * (Number(hotel.commissionPercent) / 100));
        const shouldPay = i % 2 === 0;
        if (shouldPay) {
          await prisma.hotelCommissionPayout.create({
            data: {
              bookingId: bP1.id, hotelId: hotel.id, amount: amount as any, currency: 'VND',
              commissionPercent: hotel.commissionPercent as any, tourName: fallbackPrivate.name, tourDate: bP1.startingDate,
              status: 'PAID', paidAt: addDays(day, 1), paidById: accounting?.id, paidByName: accounting?.name ?? 'Accounting',
              paymentMethod: PaymentMethod.BANK_TRANSFER, paymentReference: `HOTEL-${bP1.bookingRef}`,
            },
          });
        }
        const hotelUsers = await prisma.user.findMany({ where: { hotelId: hotel.id, isActive: true }, select: { id: true } });
        for (const hu of hotelUsers) await notify(hu.id, 'Hotel commission update', shouldPay ? `${bP1.bookingRef} commission paid` : `${bP1.bookingRef} commission earned and waiting for payment`);
      }
    }

    // 3) GROUP - freelance guide awaiting confirmation / dispatch issue
    const g2Guide = pickGuide(GuideType.FREELANCE);
    const g2Driver = pickDriver(DriverType.COMPANY);
    const g2 = await mkAssignment({
      date: day, hour: 9, endHour: 17, tour: fallbackGroup, tourType: 'GROUP_TOUR', totalPax: 10,
      guideId: g2Guide?.id ?? null, driverId: g2Driver?.id ?? null,
      vehicleId: companyVehicles[(i + 1) % Math.max(companyVehicles.length, 1)]?.id ?? cVehicle?.id,
      providerId: companyProvider?.id,
      // Awaiting confirmation must stay PENDING — dispatch already requires
      // the freelance guide to confirm first.
      status: AssignmentStatus.PENDING,
      guideConfirmationRequestedAt: addDays(day, -1), guideConfirmedAt: null, guideDeclinedAt: null,
    });
    await mkBooking({ assignmentId: g2.id, date: day, tour: fallbackGroup, tourType: 'GROUP_TOUR', pax: 10, customerName: `Group Awaiting ${i + 1}`, hotelId: hotel?.id, payment: PaymentStatus.PAID, totalAmount: 10000000 });
    await notify(g2Guide?.id ?? admin.id, 'Please confirm assignment', `${g2.code} is waiting for your confirmation.`);

    // 4) GROUP - external provider request / assigned / declined cases
    const reqStatus = [TransportRequestStatus.REQUESTED, TransportRequestStatus.ASSIGNED, TransportRequestStatus.DECLINED, TransportRequestStatus.EXPIRED, TransportRequestStatus.CANCELLED, TransportRequestStatus.VIEWED, TransportRequestStatus.REQUESTED][i % 7];
    const g3Guide = pickGuide(GuideType.OFFICIAL);
    const g3Driver =
      reqStatus === TransportRequestStatus.ASSIGNED ? pickExternalDriver() : null;
    const g3 = await mkAssignment({
      date: day, hour: 10, endHour: 18, tour: fallbackGroup, tourType: 'GROUP_TOUR', totalPax: 8,
      guideId: g3Guide?.id ?? null,
      driverId: g3Driver?.id ?? null,
      vehicleId: reqStatus === TransportRequestStatus.ASSIGNED ? (eVehicle?.id ?? null) : null,
      providerId: externalProvider?.id,
      providerRequestStatus: reqStatus,
      providerRequestedAt: addDays(day, -2),
      providerRespondedAt: [TransportRequestStatus.ASSIGNED, TransportRequestStatus.DECLINED].includes(reqStatus) ? addDays(day, -1) : null,
      providerDeadline: addDays(day, -1),
      providerRequestNote: 'Seeded transport request case',
      status: AssignmentStatus.PENDING,
      guideConfirmationRequestedAt: addDays(day, -1), guideConfirmedAt: addDays(day, -1),
    });
    await mkBooking({ assignmentId: g3.id, date: day, tour: fallbackGroup, tourType: 'GROUP_TOUR', pax: 8, customerName: `Group Provider ${i + 1}`, payment: PaymentStatus.PAID, totalAmount: 8000000 });
    if (externalProvider) {
      const pUsers = await prisma.user.findMany({ where: { providerId: externalProvider.id, role: RoleType.TRANSPORT_PROVIDER, isActive: true }, select: { id: true } });
      for (const u of pUsers) await notify(u.id, 'Transport request', `${g3.code} is ${reqStatus}.`);
    }

    // 5) PRIVATE - outsourced partner case
    const p2 = await mkAssignment({
      date: day, hour: 11, endHour: 17, tour: fallbackPrivate, tourType: 'PRIVATE_TOUR', totalPax: 2,
      executionMode: AssignmentExecutionMode.OUTSOURCED_PARTNER,
      partnerId: partner.id, partnerStatus: i % 2 === 0 ? PartnerHandoffStatus.CLOSED : PartnerHandoffStatus.HANDED_OFF,
      partnerAmount: 2500000 as any, partnerCurrency: 'VND', partnerMoneyFlow: PartnerMoneyFlow.COMPANY_PAYS_PARTNER,
      partnerConfirmedById: office?.id, partnerConfirmedByName: office?.name ?? 'Office', partnerConfirmedAt: addDays(day, -1),
      status: i % 2 === 0 ? AssignmentStatus.COMPLETED : AssignmentStatus.VERIFYING,
    });
    await mkBooking({ assignmentId: p2.id, date: day, tour: fallbackPrivate, tourType: 'PRIVATE_TOUR', pax: 2, customerName: `Private Partner ${i + 1}`, payment: PaymentStatus.PAID, totalAmount: 4000000 });
    await prisma.tourReport.create({
      data: {
        assignmentId: p2.id, sourceType: TourReportSource.OUTSOURCED_PARTNER, status: i % 2 === 0 ? TourReportStatus.VERIFIED : TourReportStatus.SUBMITTED,
        submittedById: office?.id, submittedByName: office?.name ?? 'Office', submittedAt: addDays(day, -1),
        verifiedById: i % 2 === 0 ? accounting?.id : null, verifiedByName: i % 2 === 0 ? accounting?.name ?? 'Accounting' : null,
        verifiedAt: i % 2 === 0 ? atHcm(day, 18) : null, finalizedById: i % 2 === 0 ? accounting?.id : null, finalizedByName: i % 2 === 0 ? accounting?.name ?? 'Accounting' : null, finalizedAt: i % 2 === 0 ? atHcm(day, 18) : null,
        settlementFlow: FeeFlowType.PAY_MONEY, netAmount: 2500000 as any, moneyVerifiedById: i % 2 === 0 ? accounting?.id : null, moneyVerifiedByName: i % 2 === 0 ? accounting?.name ?? 'Accounting' : null, moneyVerifiedAt: i % 2 === 0 ? atHcm(day, 18) : null,
        moneyPayeeType: MoneyPayeeType.PARTNER, moneyPartnerId: partner.id,
      },
    });
    if (i % 2 === 0) {
      await prisma.partnerPayment.upsert({
        where: { assignmentId: p2.id },
        update: { status: PartnerPaymentStatus.PAID, paidAt: addDays(day, 1), paidById: accounting?.id, paidByName: accounting?.name ?? 'Accounting', paymentMethod: PaymentMethod.BANK_TRANSFER, paymentReference: `PARTNER-${p2.code}` },
        create: { assignmentId: p2.id, partnerId: partner.id, amount: 2500000 as any, currency: 'VND', moneyFlow: PartnerMoneyFlow.COMPANY_PAYS_PARTNER, tourName: p2.tourName, tourDate: p2.startDate, status: PartnerPaymentStatus.PAID, lockedAt: atHcm(day, 18), lockedById: accounting?.id, lockedByName: accounting?.name ?? 'Accounting', paidAt: addDays(day, 1), paidById: accounting?.id, paidByName: accounting?.name ?? 'Accounting', paymentMethod: PaymentMethod.BANK_TRANSFER, paymentReference: `PARTNER-${p2.code}` },
      });
    }

    // 6) PRIVATE - driver-only / unassigned / cancelled / unpaid-paypal cases
    const p3DriverOnly = i % 2 === 0;
    const p3Cancelled = i % 3 === 1;
    const p3Guide =
      p3DriverOnly || p3Cancelled ? null : pickGuide(GuideType.FREELANCE);
    const p3Driver = p3Cancelled ? null : pickDriver(DriverType.COMPANY);
    const p3 = await mkAssignment({
      date: day, hour: 13, endHour: 18, tour: fallbackPrivate, tourType: 'PRIVATE_TOUR', totalPax: 3,
      executionMode: p3DriverOnly ? AssignmentExecutionMode.COMPANY_DRIVER_ONLY : AssignmentExecutionMode.COMPANY_GUIDED,
      guideId: p3Guide?.id ?? null,
      driverId: p3Driver?.id ?? null,
      vehicleId: cVehicle?.id, providerId: companyProvider?.id,
      status: i % 3 === 0 ? AssignmentStatus.PENDING : p3Cancelled ? AssignmentStatus.CANCELED : AssignmentStatus.DISPATCHED,
      guideConfirmationRequestedAt: p3DriverOnly ? null : addDays(day, -1),
      guideConfirmedAt: null,
      guideDeclinedAt: i % 3 === 2 ? addDays(day, -1) : null,
      guideDeclineReason: i % 3 === 2 ? 'Guide unavailable (seeded case)' : null,
    });
    const bP3 = await mkBooking({
      assignmentId: p3.status === AssignmentStatus.CANCELED ? null : p3.id,
      date: day, tour: fallbackPrivate, tourType: 'PRIVATE_TOUR', pax: 3,
      customerName: `Private Edge ${i + 1}`, payment: i % 2 === 0 ? PaymentStatus.PENDING : PaymentStatus.PAID,
      status: p3.status === AssignmentStatus.CANCELED ? BookingStatus.CANCELED : BookingStatus.ASSIGNED,
      channel: i % 2 === 0 ? BookingProvider.WEBSITE : BookingProvider.MANUAL,
      totalAmount: 4500000,
    });
    if (i % 2 === 0) {
      await prisma.bookingPayment.create({
        data: { bookingId: bP3.id, amount: 4500000 as any, currency: 'VND', method: PaymentMethod.PAYPAL, payerType: PayerType.CUSTOMER, status: PaymentRecordStatus.PENDING, provider: 'paypal', providerOrderId: `SEED-ORDER-${bP3.bookingRef}` },
      });
    }
  }

  console.log('Seeded demo flow data:', {
    days: dayPlans.length,
    assignments: await prisma.assignment.count(),
    bookings: await prisma.booking.count(),
    notifications: await prisma.notification.count(),
    tourReports: await prisma.tourReport.count(),
    partnerPayments: await prisma.partnerPayment.count(),
    hotelCommissionPayouts: await prisma.hotelCommissionPayout.count(),
    paymentPeriods: await prisma.paymentPeriod.count(),
  });
}

function codeSafe(v?: string | null) {
  return (v || 'NA').replace(/[^a-zA-Z0-9]/g, '');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
