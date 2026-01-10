import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { virtualDeviceConfig, devices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// CSV data embedded for server-side access (cron can't fetch from public folder easily)
// This is the fish training data structure
const FISH_DATA = [
  { waterTemperature: 29.48, ecValue: 318.75, tds: 204, turbidity: 12, waterPh: 6.8 },
  { waterTemperature: 29.52, ecValue: 320.10, tds: 206, turbidity: 11, waterPh: 6.9 },
  { waterTemperature: 29.45, ecValue: 315.50, tds: 202, turbidity: 13, waterPh: 6.7 },
  { waterTemperature: 29.60, ecValue: 322.00, tds: 208, turbidity: 10, waterPh: 7.0 },
  { waterTemperature: 29.55, ecValue: 319.25, tds: 205, turbidity: 12, waterPh: 6.8 },
];

const PLANT_DATA = [
  { height: 10, temperature: 30.12, humidity: 64.35, pressure: 100218.29 },
  { height: 10.2, temperature: 30.25, humidity: 63.80, pressure: 100220.15 },
  { height: 10.5, temperature: 29.95, humidity: 65.10, pressure: 100215.50 },
  { height: 10.8, temperature: 30.40, humidity: 64.00, pressure: 100222.00 },
  { height: 11.0, temperature: 30.18, humidity: 64.50, pressure: 100219.75 },
];

// API Key for cron-job.org authentication
const CRON_API_KEY = '3KjxViJoTMHiXOnOA38QdIIErIFgUTpH7HqCzqMMxhk=';

export async function GET(request: Request) {
  try {
    // Verify API key from cron-job.org
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') ||
                   new URL(request.url).searchParams.get('key');

    if (apiKey !== CRON_API_KEY) {
      console.log('[Virtual Device Cron] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Virtual Device Cron] Starting virtual device streaming...');

    // Fetch all enabled virtual device configs
    const configs = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.enabled, true));

    if (configs.length === 0) {
      console.log('[Virtual Device Cron] No enabled virtual devices found');
      return NextResponse.json({
        success: true,
        message: 'No enabled virtual devices',
        streamed: 0
      });
    }

    let totalStreamed = 0;

    for (const config of configs) {
      try {
        // Get device details
        let fishDevice = null;
        let plantDevice = null;

        if (config.fishDeviceId) {
          const [device] = await db
            .select()
            .from(devices)
            .where(eq(devices.id, config.fishDeviceId))
            .limit(1);
          fishDevice = device;
        }

        if (config.plantDeviceId) {
          const [device] = await db
            .select()
            .from(devices)
            .where(eq(devices.id, config.plantDeviceId))
            .limit(1);
          plantDevice = device;
        }

        // Send fish data
        if (fishDevice) {
          const fishIndex = config.currentFishIndex || 0;
          const fishRow = FISH_DATA[fishIndex % FISH_DATA.length];

          const fishReadings = [
            { type: 'temperature', value: addVariation(fishRow.waterTemperature, 2), unit: '°C', timestamp: new Date().toISOString() },
            { type: 'ecValue', value: addVariation(fishRow.ecValue, 3), unit: 'µS/cm', timestamp: new Date().toISOString() },
            { type: 'tds', value: addVariation(fishRow.tds, 3), unit: 'mg/L', timestamp: new Date().toISOString() },
            { type: 'turbidity', value: addVariation(fishRow.turbidity, 5), unit: 'NTU', timestamp: new Date().toISOString() },
            { type: 'ph', value: addVariation(fishRow.waterPh, 2), unit: '', timestamp: new Date().toISOString() },
          ];

          await sendTelemetry(fishDevice.apiKey, fishDevice.deviceMac, 'fish', fishReadings);
          totalStreamed++;

          // Update fish index
          await db
            .update(virtualDeviceConfig)
            .set({
              currentFishIndex: (fishIndex + 1) % FISH_DATA.length,
              lastStreamedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(virtualDeviceConfig.id, config.id));
        }

        // Send plant data
        if (plantDevice) {
          const plantIndex = config.currentPlantIndex || 0;
          const plantRow = PLANT_DATA[plantIndex % PLANT_DATA.length];

          const plantReadings = [
            { type: 'height', value: addVariation(plantRow.height, 1), unit: 'cm', timestamp: new Date().toISOString() },
            { type: 'temperature', value: addVariation(plantRow.temperature, 3), unit: '°C', timestamp: new Date().toISOString() },
            { type: 'humidity', value: addVariation(plantRow.humidity, 5), unit: '%', timestamp: new Date().toISOString() },
            { type: 'pressure', value: addVariation(plantRow.pressure, 0.1), unit: 'Pa', timestamp: new Date().toISOString() },
          ];

          await sendTelemetry(plantDevice.apiKey, plantDevice.deviceMac, 'plant', plantReadings);
          totalStreamed++;

          // Update plant index
          await db
            .update(virtualDeviceConfig)
            .set({
              currentPlantIndex: (plantIndex + 1) % PLANT_DATA.length,
              lastStreamedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(virtualDeviceConfig.id, config.id));
        }

        console.log(`[Virtual Device Cron] Streamed data for config ${config.id}`);
      } catch (configError) {
        console.error(`[Virtual Device Cron] Error processing config ${config.id}:`, configError);
      }
    }

    console.log(`[Virtual Device Cron] Completed. Total streamed: ${totalStreamed}`);

    return NextResponse.json({
      success: true,
      message: `Streamed ${totalStreamed} readings`,
      streamed: totalStreamed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Virtual Device Cron] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to add small random variation
function addVariation(value: number, variationPercent: number): number {
  const variation = value * (variationPercent / 100);
  const delta = (Math.random() - 0.5) * 2 * variation;
  return Number((value + delta).toFixed(2));
}

// Helper function to send telemetry data
async function sendTelemetry(
  apiKey: string,
  deviceMac: string,
  readingType: 'fish' | 'plant',
  readings: Array<{ type: string; value: number; unit: string; timestamp: string }>
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      deviceMac,
      readingType,
      readings,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telemetry API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Also support POST for flexibility
export async function POST(request: Request) {
  return GET(request);
}
