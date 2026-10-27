import 'dotenv/config';
import { AuthProvider, DriverType, GuideType, PrismaClient, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = 'demo123';

interface SeedUser {
  email: string;
  name: string;
  role: RoleType;
  userType: string;
  roleName?: string;
  providerId?: string;
  driver?: { licenseNumber: string; type: DriverType; rating?: number };
  guide?: { type: GuideType; languages: string[]; rating?: number };
}

const USERS: SeedUser[] = [
  {
    email: 'admin@booking.local',
    name: 'System Admin',
    role: RoleType.ADMIN,
    userType: 'admin',
    roleName: 'ADMIN',
  },
  {
    email: 'office@booking.local',
    name: 'Nguyen Thi Office',
    role: RoleType.OFFICE,
    userType: 'office',
    roleName: 'OFFICE',
  },
  {
    email: 'accounting@booking.local',
    name: 'Tran Thi Accounting',
    role: RoleType.OFFICE,
    userType: 'office',
    roleName: 'ACCOUNTING',
  },
  {
    email: 'huong.guide@booking.local',
    name: 'Tran Thi Huong',
    role: RoleType.TOUR_GUIDE,
    userType: 'guide',
    roleName: 'TOUR_GUIDE',
    guide: { type: GuideType.OFFICIAL, languages: ['English', 'Vietnamese'], rating: 5 },
  },
  {
    email: 'anh.guide@booking.local',
    name: 'Pham Van Anh',
    role: RoleType.TOUR_GUIDE,
    userType: 'guide',
    roleName: 'TOUR_GUIDE',
    guide: { type: GuideType.FREELANCE, languages: ['English', 'French'], rating: 4.8 },
  },
  {
    email: 'mai.guide@booking.local',
    name: 'Do Thi Mai',
    role: RoleType.TOUR_GUIDE,
    userType: 'guide',
    roleName: 'TOUR_GUIDE',
    guide: { type: GuideType.OFFICIAL, languages: ['English', 'Chinese'], rating: 4.9 },
  },
  {
    email: 'tai.driver@booking.local',
    name: 'Nguyen Van Tai',
    role: RoleType.DRIVER,
    userType: 'driver',
    providerId: 'demo-company-fleet',
    driver: { licenseNumber: 'DL-001', type: DriverType.COMPANY, rating: 5 },
  },
  {
    email: 'binh.driver@booking.local',
    name: 'Tran Quoc Binh',
    role: RoleType.DRIVER,
    userType: 'driver',
    providerId: 'demo-company-fleet',
    driver: { licenseNumber: 'DL-002', type: DriverType.COMPANY, rating: 4.8 },
  },
  {
    email: 'son.driver@booking.local',
    name: 'Le Van Son',
    role: RoleType.DRIVER,
    userType: 'driver',
    providerId: 'demo-provider',
    driver: { licenseNumber: 'DL-003', type: DriverType.FREELANCE, rating: 4.7 },
  },
  {
    email: 'customer@booking.local',
    name: 'Nguyen Van Customer',
    role: RoleType.CUSTOMER,
    userType: 'customer',
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  const roleByName = new Map(roles.map((r) => [r.name, r.id]));

  let created = 0;
  let updated = 0;

  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        userType: u.userType,
        providerId: u.providerId ?? null,
        isActive: true,
        authProvider: AuthProvider.LOCAL,
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        userType: u.userType,
        providerId: u.providerId ?? null,
        isActive: true,
        authProvider: AuthProvider.LOCAL,
      },
    });
    existing ? updated++ : created++;

    if (u.roleName) {
      const roleId = roleByName.get(u.roleName);
      if (roleId) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId } },
          update: {},
          create: { userId: user.id, roleId },
        });
      } else {
        console.warn(`⚠️  Role ${u.roleName} not found — run 'npm run seed' first`);
      }
    }

    if (u.driver) {
      await prisma.driverProfile.upsert({
        where: { userId: user.id },
        update: {
          licenseNumber: u.driver.licenseNumber,
          type: u.driver.type,
          rating: u.driver.rating ?? 5,
        },
        create: {
          userId: user.id,
          licenseNumber: u.driver.licenseNumber,
          type: u.driver.type,
          rating: u.driver.rating ?? 5,
        },
      });
    }

    if (u.guide) {
      await prisma.guideProfile.upsert({
        where: { userId: user.id },
        update: { type: u.guide.type, languages: u.guide.languages, rating: u.guide.rating ?? 5 },
        create: {
          userId: user.id,
          type: u.guide.type,
          languages: u.guide.languages,
          rating: u.guide.rating ?? 5,
        },
      });
    }
  }

  const byType = await prisma.user.groupBy({ by: ['userType'], _count: { _all: true } });
  console.log(`✅ Users seeded: ${created} created, ${updated} updated (password: ${PASSWORD})`);
  for (const row of byType.sort((a, b) => (a.userType ?? '').localeCompare(b.userType ?? ''))) {
    console.log(`   ${row.userType ?? '—'}: ${row._count._all}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
