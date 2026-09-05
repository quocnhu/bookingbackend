import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEATS = [7, 12, 16, 29, 45];

async function main() {
  await prisma.routePrice.deleteMany({ where: { vehicleId: null } });

  const providers = await prisma.transportationProvider.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  const tours = await prisma.tour.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });

  let routeCount = 0;
  for (const provider of providers) {
    // Ensure exactly one vehicle per seat capacity.
    for (const seats of SEATS) {
      const vehicleId = `${provider.id}-seat-${seats}`;
      await prisma.vehicle.upsert({
        where: { id: vehicleId },
        update: { capacity: seats, plateNumber: `P${SEATS.indexOf(seats) + 1}-${seats}` },
        create: {
          id: vehicleId,
          capacity: seats,
          plateNumber: `P${SEATS.indexOf(seats) + 1}-${seats}`,
          providerId: provider.id,
        },
      });
    }

    // Remove vehicles not in our seat set for this provider.
    const allVehicles = await prisma.vehicle.findMany({ where: { providerId: provider.id } });
    const keep = allVehicles.filter((v) => SEATS.includes(v.capacity ?? -1) && (v.id.startsWith(`${provider.id}-seat-`)));
    const drop = allVehicles.filter((v) => !keep.some((k) => k.id === v.id));
    for (const v of drop) {
      await prisma.routePrice.deleteMany({ where: { vehicleId: v.id } });
      await prisma.vehicle.delete({ where: { id: v.id } }).catch(() => {});
    }

    // Route price per (tour, provider, seat).
    const vehicles = await prisma.vehicle.findMany({
      where: { providerId: provider.id },
      orderBy: { capacity: 'asc' },
    });
    for (const tour of tours) {
      for (const v of vehicles) {
        const seats = v.capacity ?? 12;
        const price = 40 + seats * 3 + (tour.name.length % 5) * 10;
        await prisma.routePrice.upsert({
          where: {
            tourId_providerId_vehicleId: { tourId: tour.id, providerId: provider.id, vehicleId: v.id },
          },
          update: { price },
          create: { tourId: tour.id, providerId: provider.id, vehicleId: v.id, price },
        });
        routeCount++;
      }
    }
  }

  const groupCount = await prisma.transportationProvider.count();
  console.log(`✅ ${routeCount} route prices across ${groupCount} providers (${providers.length * SEATS.length * tours.length} expected)`);
}

main().finally(() => prisma.$disconnect());
