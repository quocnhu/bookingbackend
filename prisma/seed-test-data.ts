import 'dotenv/config';
import {
  PrismaClient,
  AuthProvider,
  FeeFlowType,
  RoleType,
  TourType,
  BookingStatus,
  PaymentStatus,
  BookingProvider,
  AssignmentStatus,
  AssignmentOrigin,
  NotificationType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data for bookings & assignments...');

  // Get existing data
  const tours = await prisma.tour.findMany();
  const users = await prisma.user.findMany({
    where: { role: { in: [RoleType.TOUR_GUIDE, RoleType.DRIVER, RoleType.OFFICE, RoleType.ADMIN] } }
  });
  const coordinates = await prisma.coordinate.findMany();

  // Get roles
  const guideRole = users.find(u => u.role === RoleType.TOUR_GUIDE);
  const driverRole = users.find(u => u.role === RoleType.DRIVER);
  const officeRole = users.find(u => u.role === RoleType.OFFICE);
  const adminRole = users.find(u => u.role === RoleType.ADMIN);

  const transportProvider = await prisma.transportationProvider.findFirst({
    where: { isCompany: true }
  });

  const vehicle = await prisma.vehicle.findFirst({
    where: { providerId: transportProvider?.id }
  });

  console.log(`Found ${tours.length} tours, ${users.length} users`);

  // Create test bookings for today and tomorrow
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  // Clear existing test data
  await prisma.booking.deleteMany({ where: { bookingRef: { startsWith: 'TEST-' } } });
  await prisma.assignment.deleteMany({ where: { code: { startsWith: 'TEST-' } } });

  // Booking 1: Group tour - Da Nang - Today - 4 pax
  const booking1 = await prisma.booking.create({
    data: {
      bookingRef: 'TEST-GR-001',
      confirmationCode: 'TEST-GR-001',
      source: 'manual',
      channel: BookingProvider.MANUAL,
      status: BookingStatus.ASSIGNED,
      tourId: tours.find(t => t.name.includes('Da Nang'))?.id,
      tourName: 'Da Nang & Ba Na Hills Golden Bridge',
      tourType: TourType.GROUP_TOUR,
      startingDate: new Date(today),
      customerName: 'Test Customer 1',
      hotelName: 'Au Lac Charner Hotel',
      address: '87-89-91 Ham Nghi Boulevard, Bến Nghé Ward, District 1',
      phone: '0901234567',
      mail: 'test1@test.com',
      totalPax: 4,
      payment: PaymentStatus.PAID,
      notes: 'Test booking - Da Nang today',
    }
  });

  // Booking 2: Group tour - Da Nang - Today - 3 pax
  const booking2 = await prisma.booking.create({
    data: {
      bookingRef: 'TEST-GR-002',
      confirmationCode: 'TEST-GR-002',
      source: 'manual',
      channel: BookingProvider.MANUAL,
      status: BookingStatus.ASSIGNED,
      tourId: tours.find(t => t.name.includes('Da Nang'))?.id,
      tourName: 'Da Nang & Ba Na Hills Golden Bridge',
      tourType: TourType.GROUP_TOUR,
      startingDate: new Date(today),
      customerName: 'Test Customer 2',
      hotelName: 'Bay Hotel Ho Chi Minh',
      address: '7 Ngo Van Nam Street, Bến Nghé Ward, District 1',
      phone: '0901234568',
      mail: 'test2@test.com',
      totalPax: 3,
      payment: PaymentStatus.PAID,
      notes: 'Test booking - Da Nang today',
    }
  });

  // Booking 3: Group tour - Ha Long Bay - Today - 5 pax
  const booking3 = await prisma.booking.create({
    data: {
      bookingRef: 'TEST-GR-003',
      confirmationCode: 'TEST-GR-003',
      source: 'manual',
      channel: BookingProvider.MANUAL,
      status: BookingStatus.ASSIGNED,
      tourId: tours.find(t => t.name.includes('Ha Long'))?.id,
      tourName: 'Ha Long Bay Full Day Cruise',
      tourType: TourType.GROUP_TOUR,
      startingDate: new Date(today),
      customerName: 'Test Customer 3',
      hotelName: 'Adora Hotel Bến Thành',
      address: '42-44 Thu Khoa Huan Street, Bến Thành Ward, District 1',
      phone: '0901234569',
      mail: 'test3@test.com',
      totalPax: 5,
      payment: PaymentStatus.PAID,
      notes: 'Test booking - Ha Long today',
    }
  });

  // Booking 4: Private tour - Hoi An - Tomorrow - 2 pax
  const booking4 = await prisma.booking.create({
    data: {
      bookingRef: 'TEST-PRV-001',
      confirmationCode: 'TEST-PRV-001',
      source: 'manual',
      channel: BookingProvider.MANUAL,
      status: BookingStatus.ASSIGNED,
      tourId: tours.find(t => t.name.includes('Hoi An'))?.id,
      tourName: 'Hoi An Ancient Town & Lantern Night',
      tourType: TourType.PRIVATE_TOUR,
      startingDate: new Date(tomorrow),
      customerName: 'Test Customer 4',
      hotelName: 'Au Lac Charner Hotel',
      address: '87-89-91 Ham Nghi Boulevard, Bến Nghé Ward, District 1',
      phone: '0901234570',
      mail: 'test4@test.com',
      totalPax: 2,
      payment: PaymentStatus.PAID,
      notes: 'Test booking - Hoi An tomorrow',
    }
  });

  // Booking 5: Group tour - Da Nang - Day after tomorrow - 3 pax (will need new bus)
  const booking5 = await prisma.booking.create({
    data: {
      bookingRef: 'TEST-GR-004',
      confirmationCode: 'TEST-GR-004',
      source: 'manual',
      channel: BookingProvider.MANUAL,
      status: BookingStatus.ASSIGNED,
      tourId: tours.find(t => t.name.includes('Da Nang'))?.id,
      tourName: 'Da Nang & Ba Na Hills Golden Bridge',
      tourType: TourType.GROUP_TOUR,
      startingDate: new Date(dayAfter),
      customerName: 'Test Customer 5',
      hotelName: 'Calista Saigon Hotel',
      address: '247 Ly Tu Trong Street, Bến Thành Ward, District 1',
      phone: '0901234571',
      mail: 'test5@test.com',
      totalPax: 3,
      payment: PaymentStatus.PAID,
      notes: 'Test booking - Da Nang day after',
    }
  });

  // Create assignments (buses)
  // Assignment 1: Group Bus - Da Nang Today - 7 pax (booking1 + booking2)
  const assignment1 = await prisma.assignment.create({
    data: {
      code: 'TEST-Group Bus - 1',
      tourName: 'Da Nang & Ba Na Hills Golden Bridge',
      tourType: TourType.GROUP_TOUR,
      startDate: new Date(today),
      endDate: new Date(today),
      durationDays: 1,
      status: AssignmentStatus.PENDING,
      origin: AssignmentOrigin.MANUAL,
      totalPax: 7,
      tourName: 'Da Nang & Ba Na Hills Golden Bridge',
      tourType: TourType.GROUP_TOUR,
      vehicleId: vehicle?.id,
      providerId: transportProvider?.id,
      guideId: guideRole?.id,
      driverId: driverRole?.id,
      tourId: tours.find(t => t.name.includes('Da Nang'))?.id,
      bookings: {
        connect: [{ id: booking1.id }, { id: booking2.id }]
      },
      createdWho: 'Test System',
    }
  });

  // Update bookings with assignment
  await prisma.booking.updateMany({
    where: { id: { in: [booking1.id, booking2.id] } },
    data: { assignmentId: assignment1.id, status: BookingStatus.ASSIGNED, paxSequence: 1 }
  });

  // Assignment 2: Group Bus - Ha Long Today - 5 pax (booking3)
  const assignment2 = await prisma.assignment.create({
    data: {
      code: 'TEST-Group Bus - 2',
      tourName: 'Ha Long Bay Full Day Cruise',
      tourType: TourType.GROUP_TOUR,
      startDate: new Date(today),
      endDate: new Date(today),
      durationDays: 1,
      status: AssignmentStatus.PENDING,
      origin: AssignmentOrigin.MANUAL,
      totalPax: 5,
      tourName: 'Ha Long Bay Full Day Cruise',
      tourType: TourType.GROUP_TOUR,
      vehicleId: vehicle?.id,
      providerId: transportProvider?.id,
      guideId: guideRole?.id,
      driverId: driverRole?.id,
      tourId: tours.find(t => t.name.includes('Ha Long'))?.id,
      bookings: {
        connect: [{ id: booking3.id }]
      },
      createdWho: 'Test System',
    }
  });

  await prisma.booking.update({
    where: { id: booking3.id },
    data: { assignmentId: assignment2.id, status: BookingStatus.ASSIGNED, paxSequence: 1 }
  });

  // Assignment 3: Private Bus - Hoi An Tomorrow - 2 pax (booking4)
  const assignment3 = await prisma.assignment.create({
    data: {
      code: 'TEST-Priv Bus - 1',
      tourName: 'Hoi An Ancient Town & Lantern Night',
      tourType: TourType.PRIVATE_TOUR,
      startDate: new Date(tomorrow),
      endDate: new Date(tomorrow),
      durationDays: 1,
      status: AssignmentStatus.PENDING,
      origin: AssignmentOrigin.MANUAL,
      totalPax: 2,
      tourName: 'Hoi An Ancient Town & Lantern Night',
      tourType: TourType.PRIVATE_TOUR,
      vehicleId: vehicle?.id,
      providerId: transportProvider?.id,
      guideId: guideRole?.id,
      driverId: driverRole?.id,
      tourId: tours.find(t => t.name.includes('Hoi An'))?.id,
      bookings: {
        connect: [{ id: booking4.id }]
      },
      createdWho: 'Test System',
    }
  });

  await prisma.booking.update({
    where: { id: booking4.id },
    data: { assignmentId: assignment3.id, status: BookingStatus.ASSIGNED, paxSequence: 1 }
  });

  // Assignment 4: Group Bus - Da Nang Day After - 3 pax (booking5)
  const assignment4 = await prisma.assignment.create({
    data: {
      code: 'TEST-Group Bus - 2',
      tourName: 'Da Nang & Ba Na Hills Golden Bridge',
      tourType: TourType.GROUP_TOUR,
      startDate: new Date(dayAfter),
      endDate: new Date(dayAfter),
      durationDays: 2,
      status: AssignmentStatus.PENDING,
      origin: AssignmentOrigin.MANUAL,
      totalPax: 3,
      tourName: 'Da Nang & Ba Na Hills Golden Bridge',
      tourType: TourType.GROUP_TOUR,
      vehicleId: vehicle?.id,
      providerId: transportProvider?.id,
      guideId: guideRole?.id,
      driverId: driverRole?.id,
      tourId: tours.find(t => t.name.includes('Da Nang'))?.id,
      bookings: {
        connect: [{ id: booking5.id }]
      },
      createdWho: 'Test System',
    }
  });

  await prisma.booking.update({
    where: { id: booking5.id },
    data: { assignmentId: assignment4.id, status: BookingStatus.ASSIGNED, paxSequence: 1 }
  });

  console.log('✅ Test data created:');
  console.log(`  - ${5} bookings`);
  console.log(`  - ${4} assignments`);
  console.log('');
  console.log('Summary:');
  console.log('  Today (10/2):');
  console.log('  - Group Bus 1: Da Nang (7 pax = 4+3)');
  console.log('  - Group Bus 2: Ha Long (5 pax)');
  console.log('  Tomorrow (10/3):');
  console.log('  - Private Bus 1: Hoi An (2 pax)');
  console.log('  Day After (10/4):');
  console.log('  - Group Bus 2: Da Nang (3 pax)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());