import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { TOUR_DETAILS } from './tour-details';

const prisma = new PrismaClient();

async function main() {
  const tours = await prisma.tour.findMany({ select: { id: true, code: true } });
  let updated = 0;

  for (const tour of tours) {
    const detail = TOUR_DETAILS[tour.code];
    if (!detail) continue;

    const { typePrices, itineraries, ...tourData } = detail;

    await prisma.tour.update({
      where: { id: tour.id },
      data: tourData,
    });

    for (const price of typePrices) {
      await prisma.tourTypePrice.upsert({
        where: { tourId_type: { tourId: tour.id, type: price.type } },
        update: {
          adultPrice: price.adultPrice,
          childPrice: price.childPrice,
          infantPrice: price.infantPrice,
          currency: price.currency,
        },
        create: { tourId: tour.id, ...price },
      });
    }

    await prisma.tourItinerary.deleteMany({ where: { tourId: tour.id } });
    if (itineraries.length > 0) {
      await prisma.tourItinerary.createMany({
        data: itineraries.map((item) => ({ ...item, tourId: tour.id })),
      });
    }

    updated += 1;
  }

  const details = await prisma.tour.count({
    where: { code: { in: Object.keys(TOUR_DETAILS) } },
  });
  const itineraryCount = await prisma.tourItinerary.count();

  console.log(
    `Updated ${updated} tours with details (${details} matched), ${itineraryCount} itinerary items in total.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
