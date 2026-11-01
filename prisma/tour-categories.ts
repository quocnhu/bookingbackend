import type { PrismaClient } from '@prisma/client';

export type TourCategorySeed = {
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive?: boolean;
};

export const TOUR_CATEGORIES: TourCategorySeed[] = [
  {
    name: 'Mekong Delta',
    slug: 'mekong-delta',
    description: 'Mekong Delta day trips, floating markets and homestays.',
    sortOrder: 10,
  },
  {
    name: 'Cu Chi Tunnels',
    slug: 'cu-chi-tunnels',
    description: 'Cu Chi tunnel experiences, from small group to deluxe.',
    sortOrder: 20,
  },
  {
    name: 'City Tour',
    slug: 'city-tour',
    description: 'Ho Chi Minh City highlights, culture and food by day or night.',
    sortOrder: 30,
  },
  {
    name: 'Airport Transfer',
    slug: 'airport-transfer',
    description: 'Private airport transfers to and from Ho Chi Minh City.',
    sortOrder: 40,
  },
  {
    name: 'Beach & Coast',
    slug: 'beach-coast',
    description: 'Beach escapes, sand dunes and coastal day trips.',
    sortOrder: 50,
  },
  {
    name: 'Nature & Trekking',
    slug: 'nature-trekking',
    description: 'National parks, mangroves, wetlands and trekking routes.',
    sortOrder: 60,
  },
  {
    name: 'Multi-Day',
    slug: 'multi-day',
    description: 'Overnight and multi-day tours across southern Vietnam.',
    sortOrder: 70,
  },
];

// The first slug in each list becomes the tour's primary category.
export const TOUR_CATEGORY_ASSIGNMENTS: Record<string, string[]> = {
  'TOUR-0001': ['mekong-delta'],
  'TOUR-0002': ['cu-chi-tunnels'],
  'TOUR-0003': ['airport-transfer'],
  'TOUR-0004': ['beach-coast'],
  'TOUR-0005': ['mekong-delta', 'cu-chi-tunnels'],
  'TOUR-0006': ['beach-coast'],
  'TOUR-0007': ['nature-trekking', 'multi-day'],
  'TOUR-0008': ['mekong-delta'],
  'TOUR-0009': ['city-tour'],
  'TOUR-0010': ['city-tour', 'cu-chi-tunnels'],
  'TOUR-0011': ['cu-chi-tunnels', 'mekong-delta'],
  'TOUR-0012': ['mekong-delta', 'cu-chi-tunnels', 'multi-day'],
  'TOUR-0013': ['mekong-delta'],
  'TOUR-0014': ['cu-chi-tunnels', 'city-tour'],
  'TOUR-0015': ['cu-chi-tunnels', 'mekong-delta'],
  'TOUR-0016': ['mekong-delta', 'multi-day'],
  'TOUR-0017': ['mekong-delta', 'cu-chi-tunnels'],
  'TOUR-0018': ['cu-chi-tunnels', 'mekong-delta', 'multi-day'],
  'TOUR-0019': ['mekong-delta'],
  'TOUR-0020': ['cu-chi-tunnels', 'mekong-delta', 'multi-day'],
  'TOUR-0021': ['mekong-delta', 'multi-day'],
  'TOUR-0022': ['cu-chi-tunnels'],
  'TOUR-0024': ['nature-trekking', 'beach-coast'],
  'TOUR-0026': ['mekong-delta', 'nature-trekking', 'multi-day'],
};

export async function applyTourCategories(prisma: PrismaClient) {
  const idBySlug = new Map<string, string>();
  for (const category of TOUR_CATEGORIES) {
    const saved = await prisma.tourCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description ?? null,
        sortOrder: category.sortOrder,
        isActive: category.isActive ?? true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description ?? null,
        sortOrder: category.sortOrder,
        isActive: category.isActive ?? true,
      },
    });
    idBySlug.set(saved.slug, saved.id);
  }

  const tours = await prisma.tour.findMany({
    select: { id: true, code: true },
  });
  let assigned = 0;
  for (const tour of tours) {
    const slugs = TOUR_CATEGORY_ASSIGNMENTS[tour.code] ?? [];
    const categoryIds = slugs
      .map((slug) => idBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    await prisma.tourCategoryLink.deleteMany({ where: { tourId: tour.id } });
    if (categoryIds.length === 0) continue;

    await prisma.tourCategoryLink.createMany({
      data: categoryIds.map((categoryId, index) => ({
        tourId: tour.id,
        categoryId,
        isPrimary: index === 0,
      })),
      skipDuplicates: true,
    });
    assigned += 1;
  }

  return { categories: TOUR_CATEGORIES.length, assigned };
}
