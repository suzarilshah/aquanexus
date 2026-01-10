/**
 * Script to import CSV training data into Neon PostgreSQL database
 *
 * Usage:
 *   npx tsx scripts/import-training-data.ts
 *
 * This script imports:
 * - plant_initial.csv -> plantReadings + plantGrowth tables
 * - plant_validate.csv -> plantReadings + plantGrowth tables
 * - fish_initial.csv -> fishReadings table
 * - fish_validate.csv -> fishReadings table
 */

import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Parse CSV file
function parseCSV(filePath: string): Array<Record<string, string>> {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    return record;
  });
}

// Import fish data
async function importFishData(filePath: string, deviceId: string) {
  console.log(`\nImporting fish data from ${path.basename(filePath)}...`);

  const records = parseCSV(filePath);
  console.log(`Found ${records.length} records`);

  let imported = 0;
  const chunkSize = 50;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    const values = chunk.map(r => {
      const timestamp = new Date(r['Timestamp']);
      return {
        device_id: deviceId,
        timestamp: timestamp.toISOString(),
        temperature: r['Water Temperature(°C)'] || null,
        ph: r['Water pH'] || null,
        tds: r['TDS(mg/L)'] || null,
        turbidity: r['Turbidity(NTU)'] || null,
        ec_value: r['EC Values(uS/cm'] || r['EC Values(uS/cm)'] || null,
      };
    });

    // Insert using raw SQL for better performance
    for (const v of values) {
      try {
        await sql`
          INSERT INTO fish_readings (device_id, timestamp, temperature, ph, tds, turbidity, ec_value)
          VALUES (${v.device_id}::uuid, ${v.timestamp}::timestamp, ${v.temperature}, ${v.ph}, ${v.tds}, ${v.turbidity}, ${v.ec_value})
        `;
        imported++;
      } catch (error) {
        console.error(`Error inserting row:`, error);
      }
    }

    process.stdout.write(`\r  Imported ${imported}/${records.length} records`);
  }

  console.log(`\n  Completed: ${imported} records imported`);
  return imported;
}

// Import plant data
async function importPlantData(filePath: string, deviceId: string) {
  console.log(`\nImporting plant data from ${path.basename(filePath)}...`);

  const records = parseCSV(filePath);
  console.log(`Found ${records.length} records`);

  let importedReadings = 0;
  let importedGrowth = 0;

  // Sort by timestamp for growth rate calculation
  records.sort((a, b) => new Date(a['Timestamp']).getTime() - new Date(b['Timestamp']).getTime());

  const plantingDate = new Date(records[0]['Timestamp']);

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const timestamp = new Date(r['Timestamp']);
    const height = r['Height of the Plant(cm)'];
    const temperature = r['Plant Temperature(°C)'];
    const humidity = r['Humidity(RH)'];
    const pressure = r['Pressure(Pa)'];

    try {
      // Insert plant reading
      await sql`
        INSERT INTO plant_readings (device_id, timestamp, temperature, humidity, pressure, height)
        VALUES (${deviceId}::uuid, ${timestamp.toISOString()}::timestamp, ${temperature}, ${humidity}, ${pressure}, ${height})
      `;
      importedReadings++;

      // Insert growth record
      const daysFromPlanting = Math.floor((timestamp.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));

      let growthRate: string | null = null;
      if (i > 0) {
        const prevRecord = records[i - 1];
        const prevTimestamp = new Date(prevRecord['Timestamp']);
        const prevHeight = parseFloat(prevRecord['Height of the Plant(cm)']);
        const currentHeight = parseFloat(height);
        const timeDiffDays = (timestamp.getTime() - prevTimestamp.getTime()) / (1000 * 60 * 60 * 24);
        if (timeDiffDays > 0 && !isNaN(prevHeight) && !isNaN(currentHeight)) {
          growthRate = ((currentHeight - prevHeight) / timeDiffDays).toFixed(4);
        }
      }

      await sql`
        INSERT INTO plant_growth (device_id, measured_at, height, growth_rate, days_from_planting)
        VALUES (${deviceId}::uuid, ${timestamp.toISOString()}::timestamp, ${height}, ${growthRate}, ${daysFromPlanting})
      `;
      importedGrowth++;

      if ((i + 1) % 50 === 0) {
        process.stdout.write(`\r  Imported ${importedReadings}/${records.length} records`);
      }
    } catch (error) {
      console.error(`Error inserting row ${i}:`, error);
    }
  }

  console.log(`\n  Completed: ${importedReadings} readings, ${importedGrowth} growth records`);
  return { readings: importedReadings, growth: importedGrowth };
}

// Get or create device
async function getOrCreateDevice(deviceType: 'fish' | 'plant', userId: string): Promise<string> {
  const deviceName = deviceType === 'fish' ? 'Fish Training Device' : 'Plant Training Device';
  const deviceMac = deviceType === 'fish' ? 'AA:BB:CC:DD:EE:01' : 'AA:BB:CC:DD:EE:02';

  // Check if device exists
  const existing = await sql`
    SELECT id FROM devices WHERE device_mac = ${deviceMac}
  `;

  if (existing.length > 0) {
    console.log(`Using existing ${deviceType} device: ${existing[0].id}`);
    return existing[0].id;
  }

  // Create new device
  const result = await sql`
    INSERT INTO devices (user_id, device_mac, device_name, device_type, api_key, status)
    VALUES (${userId}::uuid, ${deviceMac}, ${deviceName}, ${deviceType}, ${'training-api-key-' + Date.now()}, 'online')
    RETURNING id
  `;

  console.log(`Created new ${deviceType} device: ${result[0].id}`);
  return result[0].id;
}

// Get first user ID or create demo user
async function getOrCreateUser(): Promise<string> {
  const users = await sql`SELECT id FROM users LIMIT 1`;

  if (users.length > 0) {
    return users[0].id;
  }

  // Create demo user
  const result = await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES ('demo@aquanexus.local', '$2a$10$demo', 'Demo User')
    RETURNING id
  `;

  console.log('Created demo user for training data');
  return result[0].id;
}

async function main() {
  console.log('====================================');
  console.log('AquaNexus Training Data Import');
  console.log('====================================');

  try {
    // Get or create user
    const userId = await getOrCreateUser();
    console.log(`Using user ID: ${userId}`);

    // Get or create devices
    const fishDeviceId = await getOrCreateDevice('fish', userId);
    const plantDeviceId = await getOrCreateDevice('plant', userId);

    // Define file paths (relative to project root)
    const files = {
      fishInitial: 'fish_initial.csv',
      fishValidate: 'fish_validate.csv',
      plantInitial: 'plant_initial.csv',
      plantValidate: 'plant_validate.csv',
    };

    // Check which files exist
    for (const [key, file] of Object.entries(files)) {
      if (!fs.existsSync(file)) {
        console.warn(`Warning: ${file} not found, skipping`);
        delete files[key as keyof typeof files];
      }
    }

    // Import fish data
    if (files.fishInitial) {
      await importFishData(files.fishInitial, fishDeviceId);
    }
    if (files.fishValidate) {
      await importFishData(files.fishValidate, fishDeviceId);
    }

    // Import plant data
    if (files.plantInitial) {
      await importPlantData(files.plantInitial, plantDeviceId);
    }
    if (files.plantValidate) {
      await importPlantData(files.plantValidate, plantDeviceId);
    }

    console.log('\n====================================');
    console.log('Import Complete!');
    console.log('====================================');
    console.log(`Fish Device ID: ${fishDeviceId}`);
    console.log(`Plant Device ID: ${plantDeviceId}`);
    console.log('\nYou can now train the LSTM models using this data.');

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
