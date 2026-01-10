import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { virtualDeviceConfig, devices, fishReadings, plantReadings, plantGrowth } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Helper to parse CSV
function parseCSV(content: string): Array<Record<string, string>> {
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

// Add small random variation
function addVariation(value: number, variationPercent: number = 2): number {
  const variation = value * (variationPercent / 100);
  const delta = (Math.random() - 0.5) * 2 * variation;
  return Number((value + delta).toFixed(2));
}

// Get current streaming index from config (stored in metadata)
async function getStreamIndex(configId: string, type: 'fish' | 'plant'): Promise<number> {
  const [config] = await db
    .select()
    .from(virtualDeviceConfig)
    .where(eq(virtualDeviceConfig.id, configId))
    .limit(1);

  if (!config) return 0;

  const metadata = (config as Record<string, unknown>).metadata as Record<string, number> | null;
  if (!metadata) return 0;

  return metadata[`${type}Index`] || 0;
}

// Update streaming index
async function updateStreamIndex(configId: string, fishIndex: number, plantIndex: number): Promise<void> {
  await db
    .update(virtualDeviceConfig)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(virtualDeviceConfig.id, configId));
}

// API endpoint for automatic streaming
// Called by cron-job.org or similar service
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Verify request (optional security)
    if (process.env.VIRTUAL_STREAM_SECRET && secret !== process.env.VIRTUAL_STREAM_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Virtual Stream] Starting automatic data stream...');

    // Get all enabled virtual device configurations
    const configs = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.enabled, true));

    if (configs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No enabled virtual devices found',
        streamed: 0,
      });
    }

    let totalStreamed = 0;
    const results: Array<{ userId: string; fish: boolean; plant: boolean }> = [];

    for (const config of configs) {
      try {
        // Determine data source files
        const dataSource = config.dataSource || 'validation';
        const fishFile = dataSource === 'validation' ? 'fish_validate.csv' : 'fish_initial.csv';
        const plantFile = dataSource === 'validation' ? 'plant_validate.csv' : 'plant_initial.csv';

        // Read CSV files from public folder
        const publicDir = path.join(process.cwd(), 'public');

        let fishData: Array<Record<string, string>> = [];
        let plantData: Array<Record<string, string>> = [];

        try {
          const fishContent = fs.readFileSync(path.join(publicDir, fishFile), 'utf-8');
          fishData = parseCSV(fishContent);
        } catch {
          console.warn(`[Virtual Stream] Could not read ${fishFile}`);
        }

        try {
          const plantContent = fs.readFileSync(path.join(publicDir, plantFile), 'utf-8');
          plantData = parseCSV(plantContent);
        } catch {
          console.warn(`[Virtual Stream] Could not read ${plantFile}`);
        }

        // Get current indices (we'll store them in localStorage-style approach using timestamp)
        // For simplicity, we'll use a round-robin based on the current minute
        const minute = new Date().getMinutes();
        const fishIndex = fishData.length > 0 ? minute % fishData.length : 0;
        const plantIndex = plantData.length > 0 ? minute % plantData.length : 0;

        let fishStreamed = false;
        let plantStreamed = false;

        // Stream fish data
        if (config.fishDeviceId && fishData.length > 0) {
          const row = fishData[fishIndex];

          // Find column values (handle different CSV column names)
          const temperature = parseFloat(row['Water Temperature(°C)'] || row['temperature'] || '29');
          const ph = parseFloat(row['Water pH'] || row['ph'] || '7.0');
          const tds = parseFloat(row['TDS(mg/L)'] || row['tds'] || '210');
          const turbidity = parseFloat(row['Turbidity(NTU)'] || row['turbidity'] || '12');
          const ecValue = parseFloat(row['EC Values(uS/cm)'] || row['EC Values(uS/cm'] || row['ec_value'] || '320');

          await db.insert(fishReadings).values({
            deviceId: config.fishDeviceId,
            timestamp: new Date(),
            temperature: addVariation(temperature, 2).toString(),
            ph: addVariation(ph, 2).toString(),
            tds: addVariation(tds, 3).toString(),
            turbidity: addVariation(turbidity, 5).toString(),
            ecValue: addVariation(ecValue, 3).toString(),
          });

          // Update device last seen
          await db
            .update(devices)
            .set({ lastSeen: new Date(), status: 'online' })
            .where(eq(devices.id, config.fishDeviceId));

          fishStreamed = true;
          totalStreamed++;
        }

        // Stream plant data
        if (config.plantDeviceId && plantData.length > 0) {
          const row = plantData[plantIndex];

          // Find column values
          const height = parseFloat(row['Height of the Plant(cm)'] || row['height'] || '15');
          const temperature = parseFloat(row['Plant Temperature(°C)'] || row['temperature'] || '30');
          const humidity = parseFloat(row['Humidity(RH)'] || row['humidity'] || '65');
          const pressure = parseFloat(row['Pressure(Pa)'] || row['pressure'] || '100210');

          // Insert plant reading
          await db.insert(plantReadings).values({
            deviceId: config.plantDeviceId,
            timestamp: new Date(),
            temperature: addVariation(temperature, 3).toString(),
            humidity: addVariation(humidity, 5).toString(),
            pressure: addVariation(pressure, 0.1).toString(),
            height: addVariation(height, 1).toString(),
          });

          // Insert plant growth record
          await db.insert(plantGrowth).values({
            deviceId: config.plantDeviceId,
            measuredAt: new Date(),
            height: addVariation(height, 1).toString(),
            daysFromPlanting: plantIndex, // Approximate days
          });

          // Update device last seen
          await db
            .update(devices)
            .set({ lastSeen: new Date(), status: 'online' })
            .where(eq(devices.id, config.plantDeviceId));

          plantStreamed = true;
          totalStreamed++;
        }

        results.push({
          userId: config.userId,
          fish: fishStreamed,
          plant: plantStreamed,
        });

      } catch (err) {
        console.error(`[Virtual Stream] Error for config ${config.id}:`, err);
      }
    }

    console.log(`[Virtual Stream] Completed. Streamed ${totalStreamed} readings.`);

    return NextResponse.json({
      success: true,
      message: `Streamed ${totalStreamed} readings`,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    console.error('[Virtual Stream] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stream failed' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: Request) {
  return GET(request);
}
