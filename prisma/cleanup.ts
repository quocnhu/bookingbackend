import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting database cleanup...');

  // Delete in reverse dependency order

  // 1. Accounting: Payment periods & lines
  console.log('Deleting PaymentPeriodLine...');
  await prisma.paymentPeriodLine.deleteMany({});
  console.log('Deleting PaymentPeriod...');
  await prisma.paymentPeriod.deleteMany({});

  // 2. Settlements (reversals first due to self-ref)
  console.log('Deleting Settlement reversals...');
  await prisma.settlement.updateMany({
    where: { reversesId: { not: null } },
    data: { reversesId: null },
  });
  console.log('Deleting Settlement...');
  await prisma.settlement.deleteMany({});

  // 3. Settlement categories (keep system ones)
  console.log('Deleting non-system SettlementCategory...');
  await prisma.settlementCategory.deleteMany({
    where: { isSystem: false },
  });

  // 4. Tour reports
  console.log('Deleting TourReport...');
  await prisma.tourReport.deleteMany({});

  // 5. Assignments (detach bookings first)
  console.log('Detaching bookings from assignments...');
  await prisma.booking.updateMany({
    where: { assignmentId: { not: null } },
    data: { assignmentId: null, paxSequence: 0, status: 'PENDING' },
  });
  console.log('Deleting Assignment...');
  await prisma.assignment.deleteMany({});

  // 6. Bookings
  console.log('Deleting Booking...');
  await prisma.booking.deleteMany({});

  // 6b. RawData
  console.log('Deleting RawData...');
  await prisma.rawData.deleteMany({});

  // 7. Gmail accounts
  console.log('Deleting GmailAccount...');
  await prisma.gmailAccount.deleteMany({});

  // 8. Coordinates
  console.log('Deleting Coordinate...');
  await prisma.coordinate.deleteMany({});

  // 9. Company profile (keep but reset)
  console.log('Resetting CompanyProfile...');
  await prisma.companyProfile.deleteMany({});

  // 10. Route prices (before Tour due to FK)
  console.log('Deleting RoutePrice...');
  await prisma.routePrice.deleteMany({});

  // 11. Tour departures & galleries
  console.log('Deleting TourDeparture...');
  await prisma.tourDeparture.deleteMany({});
  console.log('Deleting TourGallery...');
  await prisma.tourGallery.deleteMany({});
  console.log('Deleting TourTypePrice...');
  await prisma.tourTypePrice.deleteMany({});
  console.log('Deleting TourItinerary...');
  await prisma.tourItinerary.deleteMany({});

  // 12. Tours
  console.log('Deleting Tour...');
  await prisma.tour.deleteMany({});

  // 13. Vehicles & Transportation Providers
  console.log('Deleting Vehicle...');
  await prisma.vehicle.deleteMany({});
  console.log('Deleting TransportationProvider...');
  await prisma.transportationProvider.deleteMany({});

  // 14. Driver/Guide profiles
  console.log('Deleting DriverProfile...');
  await prisma.driverProfile.deleteMany({});
  console.log('Deleting GuideProfile...');
  await prisma.guideProfile.deleteMany({});

  // 15. User leaves
  console.log('Deleting UserLeave...');
  await prisma.userLeave.deleteMany({});

  // 16. Notifications & push subscriptions
  console.log('Deleting Notification...');
  await prisma.notification.deleteMany({});
  console.log('Deleting PushSubscription...');
  await prisma.pushSubscription.deleteMany({});

  // 17. Audit logs & auth activities
  console.log('Deleting AuditLog...');
  await prisma.auditLog.deleteMany({});
  console.log('Deleting AuthActivity...');
  await prisma.authActivity.deleteMany({});

  // 18. User sessions
  console.log('Deleting UserSession...');
  await prisma.userSession.deleteMany({});

  // 19. Drive files & folders
  console.log('Deleting DriveFile...');
  await prisma.driveFile.deleteMany({});
  console.log('Deleting DriveFolder...');
  await prisma.driveFolder.deleteMany({});

  // 20. User roles & permissions (keep admin)
  console.log('Deleting UserRole (non-admin)...');
  const adminRole = await prisma.role.findFirst({ where: { isSystem: true } });
  if (adminRole) {
    await prisma.userRole.deleteMany({
      where: { roleId: { not: adminRole.id } },
    });
  }
  console.log('Deleting UserPermission...');
  await prisma.userPermission.deleteMany({});

  // 21. Roles (keep system roles)
  console.log('Deleting non-system Role...');
  await prisma.role.deleteMany({
    where: { isSystem: false },
  });

  // 22. Permissions (keep system ones)
  console.log('Keeping system permissions...');

  // 23. Users (keep admin)
  console.log('Deleting non-admin Users...');
  await prisma.user.deleteMany({
    where: { role: { not: 'ADMIN' } },
  });

  // 24. Clean uploads folder (keep structure)
  const fs = await import('fs');
  const path = await import('path');
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  
  if (fs.existsSync(uploadsRoot)) {
    const dirs = ['assignments', 'bookings', 'drive', 'evidence', 'tours'];
    for (const dir of dirs) {
      const fullPath = path.join(uploadsRoot, dir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`Removed uploads/${dir}`);
      }
    }
  }

  console.log('✅ Database cleanup complete!');
  console.log('');
  console.log('Remaining:');
  console.log('  - ADMIN user (admin@booking.local / admin123)');
  console.log('  - System roles (ADMIN, TOUR_GUIDE, ACCOUNTING, etc.)');
  console.log('  - System permissions');
  console.log('  - System settlement categories');
  console.log('');
  console.log('You can now manually create:');
  console.log('  1. Tours → 2. Bookings → 3. Assignments → 4. Tour Report → 5. Accounting');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());