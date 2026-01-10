import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { virtualDeviceConfig, devices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// CSV data embedded for server-side access (cron can't fetch from public folder easily)
// 50 rows from fish_initial.csv - covers approximately 10 days of readings
const FISH_DATA = [
  { waterTemperature: 29.48, ecValue: 318.75, tds: 204, turbidity: 12, waterPh: 6.8 },
  { waterTemperature: 28.65, ecValue: 321.88, tds: 206, turbidity: 10, waterPh: 7.2 },
  { waterTemperature: 29.76, ecValue: 323.44, tds: 207, turbidity: 12, waterPh: 7.0 },
  { waterTemperature: 28.87, ecValue: 325.00, tds: 208, turbidity: 13, waterPh: 6.5 },
  { waterTemperature: 29.39, ecValue: 328.13, tds: 210, turbidity: 12, waterPh: 7.4 },
  { waterTemperature: 28.79, ecValue: 329.69, tds: 211, turbidity: 14, waterPh: 6.9 },
  { waterTemperature: 29.63, ecValue: 331.25, tds: 212, turbidity: 13, waterPh: 7.1 },
  { waterTemperature: 28.56, ecValue: 332.81, tds: 213, turbidity: 15, waterPh: 6.7 },
  { waterTemperature: 29.52, ecValue: 334.38, tds: 214, turbidity: 16, waterPh: 7.3 },
  { waterTemperature: 28.91, ecValue: 335.94, tds: 215, turbidity: 15, waterPh: 6.6 },
  { waterTemperature: 29.30, ecValue: 337.50, tds: 216, turbidity: 14, waterPh: 7.2 },
  { waterTemperature: 28.84, ecValue: 339.06, tds: 217, turbidity: 15, waterPh: 6.8 },
  { waterTemperature: 29.73, ecValue: 340.63, tds: 218, turbidity: 16, waterPh: 7.0 },
  { waterTemperature: 28.68, ecValue: 342.19, tds: 219, turbidity: 17, waterPh: 6.9 },
  { waterTemperature: 29.43, ecValue: 343.75, tds: 220, turbidity: 15, waterPh: 7.1 },
  { waterTemperature: 28.77, ecValue: 345.31, tds: 221, turbidity: 18, waterPh: 6.7 },
  { waterTemperature: 29.64, ecValue: 346.88, tds: 222, turbidity: 17, waterPh: 7.3 },
  { waterTemperature: 31.25, ecValue: 348.44, tds: 223, turbidity: 15, waterPh: 6.8 },
  { waterTemperature: 31.00, ecValue: 350.00, tds: 224, turbidity: 18, waterPh: 7.2 },
  { waterTemperature: 30.50, ecValue: 351.56, tds: 225, turbidity: 16, waterPh: 6.9 },
  { waterTemperature: 29.85, ecValue: 353.13, tds: 226, turbidity: 14, waterPh: 7.0 },
  { waterTemperature: 30.20, ecValue: 354.69, tds: 227, turbidity: 15, waterPh: 6.8 },
  { waterTemperature: 29.95, ecValue: 356.25, tds: 228, turbidity: 17, waterPh: 7.1 },
  { waterTemperature: 30.35, ecValue: 357.81, tds: 229, turbidity: 16, waterPh: 6.7 },
  { waterTemperature: 29.70, ecValue: 359.38, tds: 230, turbidity: 18, waterPh: 7.3 },
  { waterTemperature: 30.10, ecValue: 360.94, tds: 231, turbidity: 15, waterPh: 6.9 },
  { waterTemperature: 29.55, ecValue: 362.50, tds: 232, turbidity: 14, waterPh: 7.2 },
  { waterTemperature: 30.45, ecValue: 364.06, tds: 233, turbidity: 16, waterPh: 6.8 },
  { waterTemperature: 29.80, ecValue: 365.63, tds: 234, turbidity: 17, waterPh: 7.0 },
  { waterTemperature: 30.25, ecValue: 367.19, tds: 235, turbidity: 15, waterPh: 6.6 },
  { waterTemperature: 29.60, ecValue: 368.75, tds: 236, turbidity: 18, waterPh: 7.4 },
  { waterTemperature: 30.15, ecValue: 370.31, tds: 237, turbidity: 16, waterPh: 6.9 },
  { waterTemperature: 29.45, ecValue: 371.88, tds: 238, turbidity: 14, waterPh: 7.1 },
  { waterTemperature: 30.40, ecValue: 373.44, tds: 239, turbidity: 17, waterPh: 6.7 },
  { waterTemperature: 29.75, ecValue: 375.00, tds: 240, turbidity: 15, waterPh: 7.3 },
  { waterTemperature: 30.30, ecValue: 376.56, tds: 241, turbidity: 18, waterPh: 6.8 },
  { waterTemperature: 29.50, ecValue: 378.13, tds: 242, turbidity: 16, waterPh: 7.0 },
  { waterTemperature: 30.05, ecValue: 379.69, tds: 243, turbidity: 14, waterPh: 6.9 },
  { waterTemperature: 29.90, ecValue: 381.25, tds: 244, turbidity: 17, waterPh: 7.2 },
  { waterTemperature: 30.55, ecValue: 382.81, tds: 245, turbidity: 15, waterPh: 6.6 },
  { waterTemperature: 29.35, ecValue: 384.38, tds: 246, turbidity: 18, waterPh: 7.4 },
  { waterTemperature: 30.00, ecValue: 385.94, tds: 247, turbidity: 16, waterPh: 6.9 },
  { waterTemperature: 29.65, ecValue: 387.50, tds: 248, turbidity: 14, waterPh: 7.1 },
  { waterTemperature: 30.20, ecValue: 389.06, tds: 249, turbidity: 17, waterPh: 6.7 },
  { waterTemperature: 29.85, ecValue: 390.63, tds: 250, turbidity: 15, waterPh: 7.3 },
  { waterTemperature: 30.35, ecValue: 392.19, tds: 251, turbidity: 18, waterPh: 6.8 },
  { waterTemperature: 29.70, ecValue: 393.75, tds: 252, turbidity: 16, waterPh: 7.0 },
  { waterTemperature: 30.10, ecValue: 395.31, tds: 253, turbidity: 14, waterPh: 6.9 },
  { waterTemperature: 29.55, ecValue: 396.88, tds: 254, turbidity: 17, waterPh: 7.2 },
  { waterTemperature: 30.45, ecValue: 398.44, tds: 255, turbidity: 15, waterPh: 6.6 },
];

// 50 rows from plant_initial.csv - covers approximately 10 days with gradual height growth
const PLANT_DATA = [
  { height: 10.0, temperature: 30.12, humidity: 64.35, pressure: 100218.29 },
  { height: 10.0, temperature: 31.57, humidity: 67.80, pressure: 100209.74 },
  { height: 10.0, temperature: 32.48, humidity: 72.36, pressure: 100203.85 },
  { height: 10.0, temperature: 30.93, humidity: 68.54, pressure: 100221.62 },
  { height: 10.0, temperature: 33.27, humidity: 73.81, pressure: 100212.33 },
  { height: 10.0, temperature: 31.18, humidity: 69.92, pressure: 100196.82 },
  { height: 10.0, temperature: 32.54, humidity: 74.21, pressure: 100206.11 },
  { height: 10.0, temperature: 30.76, humidity: 66.43, pressure: 100211.84 },
  { height: 10.0, temperature: 33.12, humidity: 78.29, pressure: 100223.59 },
  { height: 10.0, temperature: 31.29, humidity: 71.05, pressure: 100217.24 },
  { height: 10.0, temperature: 32.09, humidity: 70.16, pressure: 100208.47 },
  { height: 11.0, temperature: 30.81, humidity: 67.35, pressure: 100210.53 },
  { height: 11.0, temperature: 31.95, humidity: 76.81, pressure: 100221.13 },
  { height: 10.0, temperature: 32.75, humidity: 78.46, pressure: 100215.45 },
  { height: 11.0, temperature: 30.54, humidity: 64.59, pressure: 100204.33 },
  { height: 10.0, temperature: 33.04, humidity: 80.12, pressure: 100207.89 },
  { height: 11.0, temperature: 32.11, humidity: 73.85, pressure: 100217.51 },
  { height: 11.0, temperature: 31.64, humidity: 77.10, pressure: 100216.18 },
  { height: 11.0, temperature: 32.36, humidity: 74.50, pressure: 100211.75 },
  { height: 11.0, temperature: 30.89, humidity: 68.29, pressure: 100219.84 },
  { height: 11.0, temperature: 31.45, humidity: 71.63, pressure: 100213.42 },
  { height: 12.0, temperature: 32.18, humidity: 75.87, pressure: 100208.19 },
  { height: 12.0, temperature: 30.67, humidity: 69.14, pressure: 100215.76 },
  { height: 12.0, temperature: 31.92, humidity: 73.28, pressure: 100210.53 },
  { height: 12.0, temperature: 32.84, humidity: 77.95, pressure: 100205.31 },
  { height: 12.0, temperature: 31.03, humidity: 70.41, pressure: 100218.67 },
  { height: 12.0, temperature: 30.48, humidity: 66.82, pressure: 100212.94 },
  { height: 13.0, temperature: 32.61, humidity: 76.19, pressure: 100207.48 },
  { height: 13.0, temperature: 31.27, humidity: 72.54, pressure: 100214.83 },
  { height: 13.0, temperature: 30.95, humidity: 68.97, pressure: 100220.16 },
  { height: 13.0, temperature: 32.39, humidity: 75.31, pressure: 100209.25 },
  { height: 13.0, temperature: 31.58, humidity: 71.78, pressure: 100216.52 },
  { height: 14.0, temperature: 30.72, humidity: 67.43, pressure: 100211.89 },
  { height: 14.0, temperature: 32.15, humidity: 74.86, pressure: 100206.47 },
  { height: 14.0, temperature: 31.84, humidity: 73.12, pressure: 100213.74 },
  { height: 14.0, temperature: 30.31, humidity: 65.79, pressure: 100219.38 },
  { height: 14.0, temperature: 32.93, humidity: 78.64, pressure: 100204.92 },
  { height: 15.0, temperature: 31.42, humidity: 70.28, pressure: 100217.06 },
  { height: 15.0, temperature: 30.89, humidity: 67.95, pressure: 100210.63 },
  { height: 15.0, temperature: 32.67, humidity: 76.53, pressure: 100208.31 },
  { height: 15.0, temperature: 31.18, humidity: 72.87, pressure: 100215.49 },
  { height: 15.0, temperature: 30.56, humidity: 66.24, pressure: 100220.78 },
  { height: 16.0, temperature: 32.04, humidity: 75.41, pressure: 100207.15 },
  { height: 16.0, temperature: 31.73, humidity: 73.68, pressure: 100212.42 },
  { height: 16.0, temperature: 30.45, humidity: 68.15, pressure: 100218.96 },
  { height: 16.0, temperature: 32.81, humidity: 77.82, pressure: 100205.64 },
  { height: 16.0, temperature: 31.29, humidity: 71.36, pressure: 100214.27 },
  { height: 17.0, temperature: 30.98, humidity: 69.73, pressure: 100211.53 },
  { height: 17.0, temperature: 32.46, humidity: 76.29, pressure: 100206.89 },
  { height: 17.0, temperature: 31.62, humidity: 74.05, pressure: 100216.34 },
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        hint: 'If table does not exist, run: npm run db:push'
      },
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:3000';

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
