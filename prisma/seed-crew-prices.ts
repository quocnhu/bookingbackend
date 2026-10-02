import 'dotenv/config';
import { PrismaClient, RoleType, GuideType, DriverType, TourType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Drivers: 2 per provider (company fleet + externals) ────────────────
const DRIVERS: Array<{
  id: string;
  name: string;
  email: string;
  providerKey: 'demo-company-fleet' | 'demo-provider' | 'prov-hanoi-travel' | 'prov-mekong-v2';
  license: string;
  type: DriverType;
}> = [
  { id: 'crew-driver-tai', name: 'Nguyen Van Tai', email: 'tai.driver@demo.local', providerKey: 'demo-company-fleet', license: 'DL-001', type: DriverType.COMPANY },
  { id: 'crew-driver-binh', name: 'Tran Quoc Binh', email: 'binh.driver@demo.local', providerKey: 'demo-company-fleet', license: 'DL-002', type: DriverType.COMPANY },
  { id: 'crew-driver-son', name: 'Le Van Son', email: 'son.driver@demo.local', providerKey: 'demo-provider', license: 'DL-003', type: DriverType.FREELANCE },
  { id: 'crew-driver-minh', name: 'Hoang Minh Duc', email: 'minh.driver@demo.local', providerKey: 'demo-provider', license: 'DL-004', type: DriverType.FREELANCE },
  { id: 'crew-driver-long', name: 'Vu Van Long', email: 'long.driver@demo.local', providerKey: 'prov-hanoi-travel', license: 'DL-005', type: DriverType.FREELANCE },
  { id: 'crew-driver-phuc', name: 'Phan Dinh Phuc', email: 'phuc.driver@demo.local', providerKey: 'prov-mekong-v2', license: 'DL-006', type: DriverType.FREELANCE },
];

// ─── Guides (in-house + freelance) ───────────────────────────────────────
const GUIDES: Array<{
  id: string;
  name: string;
  email: string;
  type: GuideType;
  languages: string[];
}> = [
  { id: 'crew-guide-huong', name: 'Tran Thi Huong', email: 'huong.guide@demo.local', type: GuideType.OFFICIAL, languages: ['English', 'Vietnamese'] },
  { id: 'crew-guide-anh', name: 'Pham Van Anh', email: 'anh.guide@demo.local', type: GuideType.FREELANCE, languages: ['English', 'French'] },
  { id: 'crew-guide-mai', name: 'Do Thi Mai', email: 'mai.guide@demo.local', type: GuideType.OFFICIAL, languages: ['English', 'Chinese'] },
  { id: 'crew-guide-lan', name: 'Nguyen Thi Lan', email: 'lan.guide@demo.local', type: GuideType.FREELANCE, languages: ['English', 'Korean'] },
];

async function main() {
  const pwd = await bcrypt.hash('demo123', 10);

  const providers = await prisma.transportationProvider.findMany({ select: { id: true, name: true } });
  const byId = new Map(providers.map((p) => [p.id, p]));
  for (const key of ['demo-company-fleet', 'demo-provider', 'prov-hanoi-travel', 'prov-mekong-v2']) {
    if (!byId.has(key)) throw new Error(`Provider ${key} missing — run seed-transportation.ts first`);
  }

  // ─── Drivers ───────────────────────────────────────────────────────────
  for (const [i, d] of DRIVERS.entries()) {
    const user = await prisma.user.upsert({
      where: { id: d.id },
      update: { name: d.name, providerId: d.providerKey },
      create: {
        id: d.id,
        name: d.name,
        email: d.email,
        passwordHash: pwd,
        role: RoleType.DRIVER,
        userType: 'crew',
        providerId: d.providerKey,
        isActive: true,
      },
    });
    await prisma.driverProfile.deleteMany({ where: { userId: user.id } });
    await prisma.driverProfile.create({
      data: { userId: user.id, licenseNumber: d.license, type: d.type, rating: 5 - i * 0.1 },
    });
  }

  // ─── Guides ────────────────────────────────────────────────────────────
  const guideIds: string[] = [];
  for (const [i, g] of GUIDES.entries()) {
    const user = await prisma.user.upsert({
      where: { id: g.id },
      update: { name: g.name },
      create: {
        id: g.id,
        name: g.name,
        email: g.email,
        passwordHash: pwd,
        role: RoleType.TOUR_GUIDE,
        userType: 'crew',
        isActive: true,
      },
    });
    guideIds.push(user.id);
    await prisma.guideProfile.deleteMany({ where: { userId: user.id } });
    await prisma.guideProfile.create({
      data: { userId: user.id, type: g.type, languages: g.languages, rating: 5 - i * 0.1 },
    });
  }

  // Guides need the TOUR_GUIDE role or every @Permissions endpoint returns 403.
  const guideRole = await prisma.role.findUnique({ where: { name: 'TOUR_GUIDE' } });
  if (guideRole) {
    await prisma.userRole.deleteMany({ where: { userId: { in: guideIds } } });
    await prisma.userRole.createMany({
      data: guideIds.map((userId) => ({ userId, roleId: guideRole.id })),
      skipDuplicates: true,
    });
  }

  // ─── Tour selling prices per tour type (travel-agent / customer prices) ─
  // PRIVATE = base tour price, GROUP = ~85% of base.
  const tours = await prisma.tour.findMany({
    select: { id: true, code: true, name: true, adultPrice: true, childPrice: true, infantPrice: true, currency: true },
  });
  let typePriceCount = 0;
  for (const t of tours) {
    const adult = Number(t.adultPrice ?? 0);
    const child = Number(t.childPrice ?? 0);
    const infant = Number(t.infantPrice ?? 0);
    const group = (n: number) => Math.round(n * 0.85);
    for (const type of [TourType.PRIVATE_TOUR, TourType.GROUP_TOUR] as const) {
      const isPrivate = type === TourType.PRIVATE_TOUR;
      await prisma.tourTypePrice.upsert({
        where: { tourId_type: { tourId: t.id, type } },
        update: {
          adultPrice: isPrivate ? adult : group(adult),
          childPrice: isPrivate ? child : group(child),
          infantPrice: isPrivate ? infant : group(infant),
          currency: t.currency,
        },
        create: {
          tourId: t.id,
          type,
          adultPrice: isPrivate ? adult : group(adult),
          childPrice: isPrivate ? child : group(child),
          infantPrice: isPrivate ? infant : group(infant),
          currency: t.currency,
        },
      });
      typePriceCount++;
    }
  }

  console.log(`✅ ${DRIVERS.length} drivers, ${GUIDES.length} guides, ${typePriceCount} tour-type prices`);
  console.log('🔑 Crew login password for all: demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
