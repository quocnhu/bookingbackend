import 'dotenv/config';
import { PrismaClient, BookingStatus, AssignmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Resetting Bookings & Assignments only...');

  // 1. Accounting: Payment periods & lines (keep but could clear)
  console.log('Deleting PaymentPeriodLine...');
  await prisma.paymentPeriodLine.deleteMany({});
  console.log('Deleting PaymentPeriod...');
  await prisma.paymentPeriod.deleteMany({});

  // 2. Settlements
  console.log('Clearing Settlement reversals...');
  await prisma.settlement.updateMany({
    where: { reversesId: { not: null } },
    data: { reversesId: null },
  });
  console.log('Deleting Settlement...');
  await prisma.settlement.deleteMany({});

  // 3. Tour reports
  console.log('Deleting TourReport...');
  await prisma.tourReport.deleteMany({});

  // 4. Assignments (detach bookings first)
  console.log('Detaching bookings from assignments...');
  await prisma.booking.updateMany({
    where: { assignmentId: { not: null } },
    data: { assignmentId: null, paxSequence: 0, status: BookingStatus.PENDING },
  });
  console.log('Deleting Assignment...');
  await prisma.assignment.deleteMany({});

  // 5. Bookings
  console.log('Deleting Booking...');
  await prisma.booking.deleteMany({});

  // 6. RawData
  console.log('Deleting RawData...');
  await prisma.rawData.deleteMany({});

  // 7. Gmail accounts
  console.log('Deleting GmailAccount...');
  await prisma.gmailAccount.deleteMany({});

  // 8. Notifications
  console.log('Deleting Notification...');
  await prisma.notification.deleteMany({});

  // 9. Audit logs & auth activities
  console.log('Deleting AuditLog...');
  await prisma.auditLog.deleteMany({});
  console.log('Deleting AuthActivity...');
  await prisma.authActivity.deleteMany({});

  // 10. User sessions
  console.log('Deleting UserSession...');
  await prisma.userSession.deleteMany({});

  // 11. Drive files & folders
  console.log('Deleting DriveFile...');
  await prisma.driveFile.deleteMany({});
  console.log('Deleting DriveFolder...');
  await prisma.driveFolder.deleteMany({});

  // 12. User leaves
  console.log('Deleting UserLeave...');
  await prisma.userLeave.deleteMany({});

  // 13. Clean uploads folder (booking/assignment related)
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

  console.log('');
  console.log('✅ Bookings & Assignments reset complete!');
  console.log('');
  console.log('Preserved:');
  console.log('  - Users (admin, guides, drivers)');
  console.log('  - Tours (6 seeded tours)');
  console.log('  - Coordinates (49 hotels)');
  console.log('  - Company profile');
  console.log('  - Vehicles & Transportation Providers');
  console.log('  - Permissions & Roles');
  console.log('  - Settlement categories (system)');
  console.log('');
  console.log('Ready for manual bookings!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());