import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEATS = [7, 12, 16, 29, 45];

// ─── Transport provider costs, VND per tour day by vehicle size ─────────
// Must match seed-transportation.ts: what the company pays an external
// provider to run one tour day. Company Fleet always prices at 0 VND.
const VND_PER_DAY_BY_SEAT: Record<number, number> = {
  7: 1200000,
  12: 1500000,
  16: 1800000,
  29: 2800000,
  45: 3800000,
};

async function main() {
  // vehicleId is required on RoutePrice, so there are no null-vehicle rows
  // to clean — the upserts below are idempotent by themselves.

  const providers = await prisma.transportationProvider.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  const tours = await prisma.tour.findMany({
    select: { id: true, name: true, durationDays: true },
    orderBy: { name: 'asc' },
  });

  // Company Fleet prices at 0 VND; everyone else follows the VND table.
  const companyFlags = new Map<string, boolean>();
  for (const provider of providers) {
    const full = await prisma.transportationProvider.findUnique({
      where: { id: provider.id },
      select: { isCompany: true },
    });
    companyFlags.set(provider.id, full?.isCompany ?? false);
  }

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
        const days = tour.durationDays ?? 1;
        const price = companyFlags.get(provider.id)
          ? 0
          : (VND_PER_DAY_BY_SEAT[seats] ?? 1500000) * days;
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
