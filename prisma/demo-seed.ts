import * as bcrypt from 'bcrypt';
import { PrismaClient, RoleType } from '@prisma/client';

const prisma = new PrismaClient();

const day = (offset: number, hour = 8) => {
  const d = new Date('2026-08-08T00:00:00.000Z');
  d.setDate(d.getDate() + offset);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  // ─── Provider + vehicles ───
  const provider = await prisma.transportationProvider.upsert({
    where: { id: 'demo-provider' },
    update: {},
    create: { id: 'demo-provider', name: 'An Phu Transport' },
  });
  await prisma.vehicle.upsert({
    where: { id: 'demo-vehicle-1' },
    update: { capacity: 12 },
    create: { id: 'demo-vehicle-1', plateNumber: '43A-12345', capacity: 12, providerId: provider.id },
  });
  await prisma.vehicle.upsert({
    where: { id: 'demo-vehicle-2' },
    update: { capacity: 12 },
    create: { id: 'demo-vehicle-2', plateNumber: '51A-67890', capacity: 12, providerId: provider.id },
  });

  // ─── Crew users ───
  const pwd = await bcrypt.hash('demo123', 10);
  const upsertUser = (id: string, name: string, email: string, role: RoleType, userType: string) =>
    prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, name, email, passwordHash: pwd, role, userType, isActive: true },
    });

  const tai = await upsertUser('demo-driver-1', 'Nguyen Van Tai', 'tai.driver@demo.local', RoleType.DRIVER, 'driver');
  const son = await upsertUser('demo-driver-2', 'Le Van Son', 'son.driver@demo.local', RoleType.DRIVER, 'driver');
  const huong = await upsertUser('demo-guide-1', 'Tran Thi Huong', 'huong.guide@demo.local', RoleType.TOUR_GUIDE, 'guide');
  const anh = await upsertUser('demo-guide-2', 'Pham Van Anh', 'anh.guide@demo.local', RoleType.TOUR_GUIDE, 'guide');

  // ─── Tours by type ───
  const privateTours = await prisma.tour.findMany({ where: { type: 'PRIVATE_TOUR' } });
  const groupTours = await prisma.tour.findMany({ where: { type: 'GROUP_TOUR' } });

  // ─── Build a day's plan ───
  const plan: Array<{
    offset: number;
    privateBookings: Array<[string, string, string, number, string]>;
    groupBookings: Array<[string, string, string, number, string]>;
    bus: [string, string]; // driverId, guideId
  }> = [
    {
      offset: 0, // Hôm nay 08-08
      privateBookings: [
        ['TA-1001', 'Emma Watson', 'Fusion Maia', 2, 'Vo Nguyen Giap Street, Son Tra'],
        ['TA-1002', 'John Carter', 'Danang Golden Bay', 4, 'Ho Nghinh Street, My An'],
        ['TA-1004', 'Noah Wilson', 'TMS Hotel', 2, 'Hung Vuong, Hai Chau'],
      ],
      groupBookings: [
        ['WS-2001', 'Liam Smith', 'Pulchra Resort', 12, 'Truong Sa, Hoa Hai'],
        ['BK-0002', 'Sophia Tran', 'Palm Garden Resort', 10, 'Cua Dai, Hoi An'],
      ],
      bus: ['demo-driver-1', 'demo-guide-1'],
    },
    {
      offset: 1, // Ngày mai 09-08
      privateBookings: [
        ['TA-1005', 'Olivia Brown', 'Fusion Maia', 3, 'Vo Nguyen Giap Street, Son Tra'],
        ['TA-1006', 'James Lee', 'A La Carte', 6, 'Ho Nghinh Street, My An'],
      ],
      groupBookings: [
        ['BK-0003', 'Minh Nguyen', 'Emeralda Ninh Binh', 20, 'Van Long, Gia Vien'],
        ['TA-1007', 'Chloe Martin', 'Aria Grand Hotel', 15, 'Le Thanh Ton'],
      ],
      bus: ['demo-driver-2', 'demo-guide-2'],
    },
    {
      offset: 2, // 10-08
      privateBookings: [['TA-1008', 'Daniel Kim', 'Danang Golden Bay', 2, 'Ho Nghinh Street, My An']],
      groupBookings: [
        ['WS-2003', 'Alice Nguyen', 'Sea & Sun Hotel', 25, 'Bach Dang Street'],
        ['BK-0004', 'Peter Parker', 'InterContinental', 18, 'Son Tra Peninsula'],
      ],
      bus: ['demo-driver-1', 'demo-guide-1'],
    },
  ];

  for (const p of plan) {
    const date = day(p.offset);

    for (const [ref, cust, hotel, pax, addr] of p.privateBookings) {
      await prisma.booking.upsert({
        where: { bookingRef: ref },
        update: { startingDate: date },
        create: {
          bookingRef: ref,
          channel: 'TRIPADVISOR',
          status: 'PENDING',
          tourId: privateTours[0]?.id,
          tourName: privateTours[0]?.name ?? 'Private Tour',
          tourType: 'PRIVATE_TOUR',
          startingDate: date,
          customerName: cust,
          hotelName: hotel,
          address: addr,
          phone: '+84 900 000 000',
          mail: `${cust.toLowerCase().replace(/\s+/g, '.')}@mail.com`,
          totalPax: pax,
          paxDetail: `${pax} adults`,
          payment: 'PENDING',
        },
      });
    }

    for (const [ref, cust, hotel, pax, addr] of p.groupBookings) {
      await prisma.booking.upsert({
        where: { bookingRef: ref },
        update: { startingDate: date },
        create: {
          bookingRef: ref,
          channel: ref.startsWith('WS') ? 'WEBSITE' : 'MANUAL',
          status: 'PENDING',
          tourId: groupTours[0]?.id,
          tourName: groupTours[0]?.name ?? 'Group Tour',
          tourType: 'GROUP_TOUR',
          startingDate: date,
          customerName: cust,
          hotelName: hotel,
          address: addr,
          phone: '+84 911 111 111',
          mail: `${cust.toLowerCase().replace(/\s+/g, '.')}@mail.com`,
          totalPax: pax,
          paxDetail: `${pax} guests`,
          payment: 'PENDING',
        },
      });
    }

    const allRefs = [...p.privateBookings, ...p.groupBookings].map((b) => b[0]);
    const bookings = await prisma.booking.findMany({ where: { bookingRef: { in: allRefs } } });

    const getOrCreateBus = async (type: 'PRIVATE_TOUR' | 'GROUP_TOUR', vehicleId: string, refs: string[]) => {
      const label = type === 'PRIVATE_TOUR' ? 'Priv' : 'Group';
      let bus = await prisma.assignment.findFirst({
        where: { code: `${label} Bus ${date.toISOString().slice(5, 10)}` },
      });
      if (!bus) {
        bus = await prisma.assignment.create({
          data: {
            code: `${label} Bus ${date.toISOString().slice(5, 10)}`,
            startDate: date,
            endDate: new Date(date.getTime() + 10 * 3600 * 1000),
            status: 'DISPATCHED',
            driverId: p.bus[0],
            guideId: p.bus[1],
            vehicleId,
            providerId: provider.id,
            sequenceIndex: type === 'PRIVATE_TOUR' ? 0 : 1,
            tripNotes: 'Pickup at hotels listed.',
          },
        });
      }
      const dayBookings = bookings.filter((b) => refs.includes(b.bookingRef));
      for (const b of dayBookings) {
        await prisma.booking.update({ where: { id: b.id }, data: { assignmentId: bus.id, status: 'ASSIGNED' } });
      }
    };

    await getOrCreateBus('PRIVATE_TOUR', 'demo-vehicle-2', p.privateBookings.map((b) => b[0]));
    await getOrCreateBus('GROUP_TOUR', 'demo-vehicle-1', p.groupBookings.map((b) => b[0]));
  }

  console.log('Seeded demo board: 3 days, private+group bookings, buses with driver/guide.');
  console.log('Crew:', tai.name, '|', son.name, '|', huong.name, '|', anh.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
