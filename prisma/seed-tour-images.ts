import 'dotenv/config';
import { access, copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { publicUploadsBase, uploadRootPath } from '../src/storage/storage.config';

const prisma = new PrismaClient();

const USER_AGENT = 'SunShineTravelDemo/1.0 (local demo seed)';
const API = 'https://commons.wikimedia.org/w/api.php';

type Candidate = {
  title: string;
  url: string;
  width: number;
  height: number;
};

const searchCache = new Map<string, Candidate[]>();
const usage = new Map<string, number>();

const TOUR_QUERIES: Record<string, string[]> = {
  'TOUR-0001': [
    'Vinh Trang Pagoda',
    'Mekong Delta boat',
    'My Tho Mekong Delta',
    'Ben Tre coconut',
    'Mekong Delta river',
  ],
  'TOUR-0002': [
    'Cu Chi tunnels',
    'Ben Duoc tunnels',
    'Cu Chi tunnel entrance',
    'Cu Chi Vietnam',
    'Cu Chi tunnels tourist',
  ],
  'TOUR-0003': [
    'Tan Son Nhat International Airport',
    'Tan Son Nhat Airport terminal',
    'Tan Son Nhat Airport apron',
    'Tan Son Nhat Airport check-in',
    'Tan Son Nhat Airport departure hall',
  ],
  'TOUR-0004': [
    'Mui Ne sand dunes',
    'Mui Ne fishing village',
    'Mui Ne beach',
    'Phan Thiet Vietnam',
    'Mui Ne jeep',
  ],
  'TOUR-0005': [
    'Cu Chi tunnels',
    'Mekong Delta boat',
    'My Tho Mekong Delta',
    'Ben Tre coconut',
    'Cu Chi Ben Duoc',
  ],
  'TOUR-0006': [
    'Vung Tau beach',
    'Long Tan cross',
    'Nui Dat',
    'Vung Tau Vietnam',
    'Australian base Vietnam',
  ],
  'TOUR-0007': [
    'Nam Cat Tien National Park',
    'Cat Tien National Park',
    'Cat Tien forest canopy',
    'Cat Tien Park forest',
    'Dong Nai river',
  ],
  'TOUR-0008': [
    'Cai Be floating market',
    'Vinh Long Vietnam',
    'Mekong Delta boat',
    'Cai Be Vietnam',
    'Mekong Delta river',
  ],
  'TOUR-0009': [
    'Ho Chi Minh City scooter',
    'Ho Chi Minh City street',
    'Ho Chi Minh City skyline',
    'Ben Thanh Market',
    'Bui Vien Street',
  ],
  'TOUR-0010': [
    'Ho Chi Minh City skyline',
    'Cu Chi tunnels',
    'Ben Thanh Market',
    'Saigon Notre Dame Cathedral',
    'Cu Chi Ben Duoc',
  ],
  'TOUR-0011': [
    'Cu Chi tunnels',
    'Tan Lap floating village',
    'Mekong Delta boat',
    'Cu Chi Ben Duoc',
    'Long An Vietnam',
  ],
  'TOUR-0012': [
    'Cu Chi tunnels',
    'Cai Rang floating market',
    'Mekong Delta boat',
    'Can Tho river',
    'Cu Chi Ben Duoc',
  ],
  'TOUR-0013': [
    'Mekong Delta boat',
    'Ben Tre coconut',
    'Mekong Delta river',
    'My Tho Mekong Delta',
    'Cai Be floating market',
  ],
  'TOUR-0014': [
    'Cu Chi tunnels',
    'War Remnants Museum',
    'Ben Duoc tunnels',
    'Ho Chi Minh City museum',
    'Cu Chi Vietnam',
  ],
  'TOUR-0015': [
    'Cu Chi tunnels',
    'Mekong Delta boat',
    'Ben Tre coconut',
    'My Tho Mekong Delta',
    'Cu Chi Ben Duoc',
  ],
  'TOUR-0016': [
    'Cai Rang floating market',
    'Can Tho river',
    'Mekong Delta boat',
    'Can Tho Vietnam',
    'Mekong Delta river',
  ],
  'TOUR-0017': [
    'Cai Rang floating market',
    'Cu Chi tunnels',
    'Can Tho river',
    'Mekong Delta biking',
    'Cu Chi Ben Duoc',
  ],
  'TOUR-0018': [
    'Cu Chi tunnels',
    'Cai Be floating market',
    'Vinh Long Vietnam',
    'Mekong Delta homestay',
    'Cu Chi Ben Duoc',
  ],
  'TOUR-0019': [
    'Cai Rang floating market',
    'Vinh Long Vietnam',
    'Cai Be floating market',
    'Can Tho river',
    'Mekong Delta boat',
  ],
  'TOUR-0020': [
    'Cu Chi tunnels',
    'Mekong Delta boat',
    'Cai Rang floating market',
    'My Tho Mekong Delta',
    'Cu Chi Ben Duoc',
  ],
  'TOUR-0021': [
    'My Tho Mekong Delta',
    'Can Tho river',
    'Cai Rang floating market',
    'Chau Doc Vietnam',
    'Tra Su forest',
  ],
  'TOUR-0022': [
    'Cu Chi tunnels',
    'Rice paper village Vietnam',
    'Cu Chi Ben Duoc',
    'Mekong Delta boat',
    'Vietnamese rice paper',
  ],
  'TOUR-0023': [
    'Mekong Delta boat',
    'Can Tho river',
    'Ben Tre coconut',
    'Tra Su forest',
    'Mekong Delta river',
  ],
  'TOUR-0024': [
    'Can Gio mangrove',
    'Can Gio Vietnam',
    'Can Gio Biosphere Reserve',
    'Mangrove forest Vietnam',
    'Can Gio beach',
  ],
  'TOUR-0025': [
    'Mui Ne beach',
    'Mui Ne fishing village',
    'Mui Ne sand dunes',
    'Phan Thiet Vietnam',
    'Mui Ne resort',
  ],
  'TOUR-0026': [
    'Gieng Island Mekong',
    'Tram Chim National Park',
    'Mekong Delta boat',
    'Dong Thap Vietnam',
    'Mekong Delta river',
  ],
  'TOUR-0027': [
    'Phu My Hafen',
    'Nha Rong Khanh Hoi Port',
    'Ho Chi Minh City cruise ship',
    'Ho Chi Minh City skyline',
    'Ben Thanh Market',
  ],
};

const FALLBACK_QUERIES: Record<string, string[]> = {
  mekong: ['Mekong Delta Vietnam', 'Mekong Delta boat', 'Cai Rang floating market'],
  cuChi: ['Cu Chi tunnels', 'Cu Chi Vietnam', 'Ben Duoc tunnels'],
  saigon: ['Ho Chi Minh City', 'Saigon Vietnam', 'Ben Thanh Market'],
  muine: ['Mui Ne Vietnam', 'Mui Ne beach', 'Phan Thiet Vietnam'],
  vungtau: ['Vung Tau Vietnam', 'Vung Tau beach', 'Long Tan cross'],
  cattien: ['Cat Tien National Park', 'Nam Cat Tien', 'Dong Nai river'],
  cangio: ['Can Gio Vietnam', 'Can Gio mangrove', 'Mangrove forest Vietnam'],
  transfer: ['Tan Son Nhat airport', 'Ho Chi Minh City airport', 'Phu My Port Vietnam'],
};

const THEME_BY_TOUR: Record<string, keyof typeof FALLBACK_QUERIES> = {
  'TOUR-0001': 'mekong',
  'TOUR-0002': 'cuChi',
  'TOUR-0003': 'transfer',
  'TOUR-0004': 'muine',
  'TOUR-0005': 'mekong',
  'TOUR-0006': 'vungtau',
  'TOUR-0007': 'cattien',
  'TOUR-0008': 'mekong',
  'TOUR-0009': 'saigon',
  'TOUR-0010': 'saigon',
  'TOUR-0011': 'cuChi',
  'TOUR-0012': 'mekong',
  'TOUR-0013': 'mekong',
  'TOUR-0014': 'cuChi',
  'TOUR-0015': 'mekong',
  'TOUR-0016': 'mekong',
  'TOUR-0017': 'mekong',
  'TOUR-0018': 'mekong',
  'TOUR-0019': 'mekong',
  'TOUR-0020': 'mekong',
  'TOUR-0021': 'mekong',
  'TOUR-0022': 'cuChi',
  'TOUR-0023': 'mekong',
  'TOUR-0024': 'cangio',
  'TOUR-0025': 'muine',
  'TOUR-0026': 'mekong',
  'TOUR-0027': 'saigon',
};

const BLOCKED_TITLE = /(map|diagram|logo|flag|coat of arms|stamp|poster|plaque|banknote|sign|graph|chart|Nha Phu lagoon|HK 佐敦|Allegorie van de geur|ĐảoKhỉ CátBà|Saigon Street Playground)/i;

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestWithRetry(url: string, attempts = 6) {
  let delay = 1500;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.ok) return response;
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : delay;
      console.warn(`Rate limited (${response.status}), retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      delay = Math.min(delay * 2, 20000);
      continue;
    }
    return response;
  }
  return null;
}

const CACHE_DIR = join(uploadRootPath(), '.tour-image-cache');

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function hydrateCache() {
  await mkdir(CACHE_DIR, { recursive: true });
  const toursDir = join(uploadRootPath(), 'tours');
  let tours: string[] = [];
  try {
    tours = await readdir(toursDir);
  } catch {
    return;
  }
  for (const tourId of tours) {
    const folder = join(toursDir, tourId, 'gallery');
    let files: string[] = [];
    try {
      files = await readdir(folder);
    } catch {
      continue;
    }
    for (const file of files) {
      const match = /^\d+-commons-(.+)\.webp$/.exec(file);
      if (!match) continue;
      const target = join(CACHE_DIR, `${match[1]}.webp`);
      if (await exists(target)) continue;
      await copyFile(join(folder, file), target);
    }
  }
}

async function cachedDownload(candidate: Candidate) {
  const label = slugify(candidate.title.replace(/^File:/, '').replace(/\.[^.]+$/, '')) || 'photo';
  const cachePath = join(CACHE_DIR, `${label}.webp`);
  if (await exists(cachePath)) return readFile(cachePath);
  const buffer = await download(candidate);
  await writeFile(cachePath, buffer);
  return buffer;
}

async function search(query: string): Promise<Candidate[]> {
  const cached = searchCache.get(query);
  if (cached) return cached;

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: '1600',
  });

  const response = await requestWithRetry(`${API}?${params}`);
  if (!response?.ok) {
    console.warn(`Search failed (${response?.status ?? 'network'}): ${query}`);
    searchCache.set(query, []);
    return [];
  }

  const data = (await response.json()) as {
    query?: { pages?: Record<string, { title: string; imageinfo?: Array<Record<string, unknown>> }> };
  };

  const candidates: Candidate[] = [];
  for (const page of Object.values(data.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const mime = String(info.mime ?? '');
    const width = Number(info.width ?? 0);
    const height = Number(info.height ?? 0);
    const url = String(info.thumburl ?? info.url ?? '');
    if (!/^image\/jpe?g$/i.test(mime)) continue;
    if (width < 1000 || height < 650 || width / height < 0.95) continue;
    if (BLOCKED_TITLE.test(page.title)) continue;
    if (!url) continue;
    if (candidates.some((c) => c.title === page.title)) continue;
    candidates.push({ title: page.title, url, width, height });
  }

  searchCache.set(query, candidates);
  await sleep(300);
  return candidates;
}

function pickForTour(
  code: string,
  usedInTour: Set<string>,
  selected: Candidate[],
  candidate: Candidate,
) {
  if (usedInTour.has(candidate.title)) return false;
  if (selected.some((item) => item.title === candidate.title)) return false;
  usedInTour.add(candidate.title);
  selected.push(candidate);
  usage.set(candidate.title, (usage.get(candidate.title) ?? 0) + 1);
  return true;
}

async function selectImages(code: string) {
  const queries = [...(TOUR_QUERIES[code] ?? [])];
  const theme = THEME_BY_TOUR[code];
  if (theme) queries.push(...FALLBACK_QUERIES[theme]);
  queries.push('Vietnam travel');

  const selected: Candidate[] = [];
  const usedInTour = new Set<string>();

  for (const query of queries) {
    if (selected.length >= 5) break;
    const candidates = await search(query);
    const ranked = [...candidates].sort((a, b) => {
      const useDiff = (usage.get(a.title) ?? 0) - (usage.get(b.title) ?? 0);
      return useDiff !== 0 ? useDiff : 0;
    });
    let pickedFromQuery = 0;
    for (const candidate of ranked) {
      if (selected.length >= 5 || pickedFromQuery >= 2) break;
      if (pickForTour(code, usedInTour, selected, candidate)) pickedFromQuery += 1;
    }
  }

  if (selected.length < 5) {
    for (const query of queries) {
      if (selected.length >= 5) break;
      const candidates = await search(query);
      for (const candidate of candidates) {
        if (selected.length >= 5) break;
        pickForTour(code, usedInTour, selected, candidate);
      }
    }
  }

  return selected;
}

async function download(candidate: Candidate) {
  const response = await requestWithRetry(candidate.url, 8);
  if (!response?.ok) {
    throw new Error(`Image download failed (${response?.status ?? 'network'}): ${candidate.title}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return sharp(buffer)
    .rotate()
    .resize(1600, 1000, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toBuffer();
}

async function main() {
  const only = new Set(process.argv.slice(2).filter((arg) => arg.startsWith('TOUR-')));
  const tours = await prisma.tour.findMany({
    where: only.size > 0 ? { code: { in: [...only] } } : undefined,
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });

  await hydrateCache();

  let images = 0;
  let skipped = 0;

  for (const tour of tours) {
    const selected = await selectImages(tour.code);
    if (selected.length === 0) {
      skipped += 1;
      console.warn(`No images found for ${tour.code} ${tour.name}`);
      continue;
    }

    const folder = join(uploadRootPath(), 'tours', tour.id, 'gallery');
    const tempFolder = join(uploadRootPath(), '.tmp-tour-images', tour.id);
    await rm(tempFolder, { recursive: true, force: true });
    await mkdir(tempFolder, { recursive: true });

    const urls: string[] = [];
    for (let index = 0; index < selected.length; index += 1) {
      const candidate = selected[index];
      const buffer = await cachedDownload(candidate);
      const label = slugify(candidate.title.replace(/^File:/, '').replace(/\.[^.]+$/, '')) || 'photo';
      const name = `${String(index).padStart(3, '0')}-commons-${label}.webp`;
      await writeFile(join(tempFolder, name), buffer);
      urls.push(`${publicUploadsBase()}/tours/${tour.id}/gallery/${name}`);
      images += 1;
      await sleep(900);
    }

    await rm(folder, { recursive: true, force: true });
    await rename(tempFolder, folder);

    await prisma.tour.update({
      where: { id: tour.id },
      data: { thumbnailUrl: urls[0] },
    });

    console.log(`${tour.code} ${tour.name}`);
    for (const candidate of selected) console.log(`  - ${candidate.title}`);
  }

  console.log(`Seeded ${images} images for ${tours.length - skipped} tours (${skipped} skipped).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
