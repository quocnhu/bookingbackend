import 'dotenv/config';
import { PrismaClient, RoleType } from '@prisma/client';
import type { Vehicle } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEATS = [7, 12, 16, 29, 45];

const BRAND_BY_SEAT: Record<number, string> = {
  7: 'Thaco',
  12: 'Toyota',
  16: 'Hyundai',
  29: 'Samco',
  45: 'Thaco',
};

const PROVIDERS: Array<{ id: string; name: string; contact: string }> = [
  { id: 'demo-company-fleet', name: 'Company Fleet', contact: 'company.fleet@demo.local' },
  { id: 'demo-provider', name: 'An Phu Transport', contact: 'anphu@demo.local' },
  { id: 'prov-hanoi-travel', name: 'Hanoi Travel Co.', contact: 'hanoi.travel@demo.local' },
  { id: 'prov-mekong-v2', name: 'Mekong Express', contact: 'mekong@demo.local' },
];

async function main() {
  const pwd = await bcrypt.hash('demo123', 10);
  const tours = await prisma.tour.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });

  let providerCount = 0;
  let vehicleCount = 0;
  let userCount = 0;
  let routeCount = 0;

  for (const p of PROVIDERS) {
    const isCompany = p.id === 'demo-company-fleet';
    const provider = await prisma.transportationProvider.upsert({
      where: { id: p.id },
      update: { name: p.name, isCompany },
      create: { id: p.id, name: p.name, isCompany },
    });
    providerCount++;

    // Provider user (TRANSPORT_PROVIDER role) linked to this provider entity.
    const providerUser = await prisma.user.upsert({
      where: { email: p.contact },
      update: { name: p.name, providerId: provider.id },
      create: {
        name: p.name,
        email: p.contact,
        passwordHash: pwd,
        role: RoleType.TRANSPORT_PROVIDER,
        userType: 'provider',
        providerId: provider.id,
        isActive: true,
      },
    });
    userCount++;

    // Bind TRANSPORT_PROVIDER user to the role so role-permissions resolve.
    const providerRole = await prisma.role.findUnique({ where: { name: 'TRANSPORT_PROVIDER' } });
    if (providerRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: providerUser.id, roleId: providerRole.id } },
        update: {},
        create: { userId: providerUser.id, roleId: providerRole.id },
      });
    }

    // One vehicle per seat size.
    const vehicles: Vehicle[] = [];
    for (const seats of SEATS) {
      const vehicleId = `${provider.id}-seat-${seats}`;
      const v = await prisma.vehicle.upsert({
        where: { id: vehicleId },
        update: { capacity: seats, plateNumber: `${p.id.slice(0, 3).toUpperCase()}-${seats}`, brand: BRAND_BY_SEAT[seats] },
        create: {
          id: vehicleId,
          capacity: seats,
          plateNumber: `${p.id.slice(0, 3).toUpperCase()}-${seats}`,
          brand: BRAND_BY_SEAT[seats],
          providerId: provider.id,
        },
      });
      vehicles.push(v);
      vehicleCount++;
    }

    // Route price per (tour x provider x vehicle).
    for (const tour of tours) {
      for (const v of vehicles) {
        const seats = v.capacity ?? 12;
        // Đội xe công ty (Company Fleet) phục vụ miễn phí: luôn 0 VND.
        const price = isCompany ? 0 : 40 + seats * 3 + (tour.name.length % 5) * 10;
        await prisma.routePrice.upsert({
          where: {
            tourId_providerId_vehicleId: {
              tourId: tour.id,
              providerId: provider.id,
              vehicleId: v.id,
            },
          },
          update: { price },
          create: { tourId: tour.id, providerId: provider.id, vehicleId: v.id, price },
        });
        routeCount++;
      }
    }
  }

  console.log(`✅ ${providerCount} providers, ${vehicleCount} vehicles, ${userCount} provider users, ${routeCount} route prices`);
}

main().finally(() => prisma.$disconnect());
