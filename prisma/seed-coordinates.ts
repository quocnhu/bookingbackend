import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

/** Parse a single CSV line handling quoted fields containing commas */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

interface HotelRow {
  hotelName: string;
  starRating: string | null;
  address: string;
  coordinate: string | null;
  latitude: number;
  longitude: number;
}

function loadHotels(): HotelRow[] {
  const csvPath = path.join(__dirname, 'hotelcoordinate.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: HotelRow[] = [];
  for (const line of lines.slice(1)) {
    const [hotelName, starRating, address, coordinate, latitude, longitude] =
      parseCsvLine(line).map((f) => f.trim());
    if (!hotelName || !address || !latitude || !longitude) continue;
    rows.push({
      hotelName,
      starRating: starRating || null,
      address,
      coordinate: coordinate || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    });
  }
  return rows;
}

async function main() {
  const hotels = loadHotels();
  console.log(`📄 Parsed ${hotels.length} hotels from hotelcoordinate.csv`);

  for (const h of hotels) {
    await prisma.coordinate.upsert({
      where: { address: h.address },
      update: {
        hotelName: h.hotelName,
        starRating: h.starRating,
        coordinate: h.coordinate,
        latitude: h.latitude,
        longitude: h.longitude,
      },
      create: h,
    });
  }
  console.log(`✅ Seeded ${hotels.length} coordinates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
