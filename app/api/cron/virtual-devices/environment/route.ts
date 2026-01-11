import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { virtualDeviceEnvironments, devices, deviceStreamingSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Import virtual device utilities
import { parseFishCSV, parsePlantCSV, FishDataRow, PlantDataRow } from '@/lib/virtual-device/csv-parser';
import {
  startCronRun,
  completeCronRun,
  addCronError,
  logDataSent,
  logDataBatchSent,
  logError,
  CronRunContext,
} from '@/lib/virtual-device/logging-service';
import { getReadingsPerTrigger, StreamingSpeed } from '@/lib/virtual-device/cronjob-org-client';

// API Key for cron-job.org authentication
const CRON_API_KEY = process.env.CRONJOB_ORG_API_KEY || '3KjxViJoTMHiXOnOA38QdIIErIFgUTpH7HqCzqMMxhk=';

export async function GET(request: Request) {
  return handleCronRequest(request, 'GET');
}

export async function POST(request: Request) {
  return handleCronRequest(request, 'POST');
}

async function handleCronRequest(request: Request, method: string) {
  let cronContext: CronRunContext | null = null;

  try {
    const url = new URL(request.url);
    const environmentId = url.searchParams.get('envId');
    const isManual = url.searchParams.get('manual') === 'true';
    const triggerSource = isManual ? 'manual' : 'cron-job.org';

    // Verify API key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || url.searchParams.get('key');

    if (apiKey !== CRON_API_KEY) {
      console.log('[Environment Cron] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!environmentId) {
      return NextResponse.json({ error: 'Environment ID required' }, { status: 400 });
    }

    console.log(`[Environment Cron] Starting for environment ${environmentId} (${triggerSource})...`);

    // Start cron execution logging
    cronContext = await startCronRun(triggerSource);

    // Get the environment
    const [environment] = await db
      .select()
      .from(virtualDeviceEnvironments)
      .where(eq(virtualDeviceEnvironments.id, environmentId))
      .limit(1);

    if (!environment) {
      console.log('[Environment Cron] Environment not found:', environmentId);
      await completeCronRun(cronContext, 'completed');
      return NextResponse.json({
        success: false,
        error: 'Environment not found',
        runId: cronContext.runId,
      }, { status: 404 });
    }

    if (!environment.enabled) {
      console.log('[Environment Cron] Environment is disabled:', environmentId);
      await completeCronRun(cronContext, 'completed');
      return NextResponse.json({
        success: true,
        message: 'Environment is disabled',
        runId: cronContext.runId,
        streamed: 0,
      });
    }

    // Get the number of readings to process based on speed
    const readingsPerTrigger = getReadingsPerTrigger(environment.streamingSpeed as StreamingSpeed);
    console.log(`[Environment Cron] Processing ${readingsPerTrigger} readings (${environment.streamingSpeed} speed)`);

    // Process fish device
    if (environment.fishDeviceId) {
      await processDeviceReadings(
        environment,
        'fish',
        readingsPerTrigger,
        cronContext
      );
    }

    // Process plant device
    if (environment.plantDeviceId) {
      await processDeviceReadings(
        environment,
        'plant',
        readingsPerTrigger,
        cronContext
      );
    }

    // Complete cron run logging
    const status = cronContext.errors.length > 0 ? 'completed' : 'completed';
    await completeCronRun(cronContext, status);

    console.log(`[Environment Cron] Completed. Readings sent: ${cronContext.readingsSent}, Errors: ${cronContext.errors.length}`);

    return NextResponse.json({
      success: true,
      runId: cronContext.runId,
      environmentId,
      environmentName: environment.name,
      streamingSpeed: environment.streamingSpeed,
      readingsPerTrigger,
      readingsSent: cronContext.readingsSent,
      errors: cronContext.errors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Environment Cron] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (cronContext) {
      addCronError(cronContext, errorMessage);
      await completeCronRun(cronContext, 'failed');
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        runId: cronContext?.runId,
      },
      { status: 500 }
    );
  }
}

async function processDeviceReadings(
  environment: typeof virtualDeviceEnvironments.$inferSelect,
  deviceType: 'fish' | 'plant',
  readingsCount: number,
  cronContext: CronRunContext
) {
  const deviceId = deviceType === 'fish' ? environment.fishDeviceId : environment.plantDeviceId;
  const currentIndex = deviceType === 'fish' ? environment.currentFishIndex : environment.currentPlantIndex;

  if (!deviceId) {
    return;
  }

  // Get device details
  const [device] = await db
    .select()
    .from(devices)
    .where(eq(devices.id, deviceId))
    .limit(1);

  if (!device) {
    console.error(`[Environment Cron] Device not found: ${deviceId}`);
    addCronError(cronContext, `Device not found: ${deviceId}`);
    return;
  }

  // Parse CSV data
  let csvRows: (FishDataRow | PlantDataRow)[];
  try {
    const parsedData = deviceType === 'fish' ? parseFishCSV() : parsePlantCSV();
    csvRows = parsedData.rows;
  } catch (parseError) {
    console.error(`[Environment Cron] Failed to parse ${deviceType} CSV:`, parseError);
    addCronError(cronContext, `Failed to parse ${deviceType} CSV`);
    return;
  }

  if (csvRows.length === 0) {
    console.log(`[Environment Cron] No data in ${deviceType} CSV`);
    return;
  }

  // Process readings from current index
  let successCount = 0;
  let newIndex = currentIndex || 0;

  for (let i = 0; i < readingsCount; i++) {
    const rowIndex = (newIndex + i) % csvRows.length; // Loop back to start if at end
    const row = csvRows[rowIndex];

    try {
      const readings = deviceType === 'fish'
        ? generateFishReadings(row as FishDataRow)
        : generatePlantReadings(row as PlantDataRow);

      const response = await sendTelemetry(device.apiKey, device.deviceMac, deviceType, readings);

      // Log successful data sent
      const sensorValues = readings.reduce((acc, r) => {
        acc[r.type] = r.value;
        return acc;
      }, {} as Record<string, number>);

      await logDataSent(environment.id, {
        deviceType,
        rowIndex,
        csvTimestamp: row.timestamp,
        sensorValues,
        telemetryResponseStatus: response.status,
      }, cronContext.runId);

      successCount++;
      cronContext.readingsSent++;

      // Check if we've completed the dataset
      if (rowIndex === csvRows.length - 1) {
        console.log(`[Environment Cron] Completed full dataset loop for ${deviceType}`);
      }
    } catch (readingError) {
      const errorMessage = readingError instanceof Error ? readingError.message : 'Unknown error';
      console.error(`[Environment Cron] Error sending reading ${rowIndex}:`, errorMessage);
      addCronError(cronContext, errorMessage);
    }
  }

  // Update environment with new index
  newIndex = ((currentIndex || 0) + readingsCount) % csvRows.length;

  const updates: Partial<typeof virtualDeviceEnvironments.$inferInsert> = {
    lastStreamedAt: new Date(),
    updatedAt: new Date(),
  };

  if (deviceType === 'fish') {
    updates.currentFishIndex = newIndex;
  } else {
    updates.currentPlantIndex = newIndex;
  }

  await db
    .update(virtualDeviceEnvironments)
    .set(updates)
    .where(eq(virtualDeviceEnvironments.id, environment.id));

  console.log(`[Environment Cron] ${deviceType}: Sent ${successCount}/${readingsCount} readings. Next index: ${newIndex}`);
}

// Generate fish readings from CSV row
function generateFishReadings(row: FishDataRow): Array<{ type: string; value: number; unit: string; timestamp: string }> {
  // Use the original CSV timestamp to maintain 5-hour interval appearance
  const timestamp = new Date().toISOString();
  return [
    { type: 'temperature', value: row.waterTemperature, unit: '°C', timestamp },
    { type: 'ecValue', value: row.ecValue, unit: 'µS/cm', timestamp },
    { type: 'tds', value: row.tds, unit: 'mg/L', timestamp },
    { type: 'turbidity', value: row.turbidity, unit: 'NTU', timestamp },
    { type: 'ph', value: row.waterPh, unit: '', timestamp },
  ];
}

// Generate plant readings from CSV row
function generatePlantReadings(row: PlantDataRow): Array<{ type: string; value: number; unit: string; timestamp: string }> {
  const timestamp = new Date().toISOString();
  return [
    { type: 'height', value: row.height, unit: 'cm', timestamp },
    { type: 'temperature', value: row.temperature, unit: '°C', timestamp },
    { type: 'humidity', value: row.humidity, unit: '%', timestamp },
    { type: 'pressure', value: row.pressure, unit: 'Pa', timestamp },
  ];
}

// Send telemetry data to the API
async function sendTelemetry(
  apiKey: string,
  deviceMac: string,
  readingType: 'fish' | 'plant',
  readings: Array<{ type: string; value: number; unit: string; timestamp: string }>
): Promise<{ status: number; data: unknown }> {
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Telemetry API error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return { status: response.status, data };
}
