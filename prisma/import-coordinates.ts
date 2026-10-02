import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const csvPath = path.join(process.cwd(), 'prisma/hotelcoordinate.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  
  // Skip header
  const header = lines[0];
  console.log('Header:', header);
  
  let imported = 0;
  let skipped = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle quoted fields)
    const fields = parseCSVLine(line);
    if (fields.length < 6) continue;
    
    const [hotelName, starRating, address, coordinate, latStr, lonStr] = fields;
    
    // Skip empty rows
    if (!hotelName || !address) {
      skipped++;
      continue;
    }
    
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn(`Skipping ${hotelName}: invalid coordinates`);
      skipped++;
      continue;
    }
    
    try {
      await prisma.coordinate.upsert({
        where: { address },
        update: {
          hotelName,
          starRating: starRating || null,
          coordinate: coordinate || null,
          latitude,
          longitude,
        },
        create: {
          hotelName,
          starRating: starRating || null,
          address,
          coordinate: coordinate || null,
          latitude,
          longitude,
        },
      });
      imported++;
      console.log(`✅ ${hotelName} (${address})`);
    } catch (e) {
      console.error(`Failed to import ${hotelName}:`, e);
      skipped++;
    }
  }
  
  console.log(`\n✅ Import complete: ${imported} imported, ${skipped} skipped`);
  
  // Verify
  const count = await prisma.coordinate.count();
  console.log(`Total coordinates in DB: ${count}`);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());