import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { virtualDeviceConfig, devices, deviceStreamingSessions } from '@/lib/db/schema';
import { eq, or, and } from 'drizzle-orm';

// Import virtual device utilities
import { parseFishCSV, parsePlantCSV, FishDataRow, PlantDataRow } from '@/lib/virtual-device/csv-parser';
import { getDueReadings } from '@/lib/virtual-device/timing-calculator';
import {
  startCronRun,
  completeCronRun,
  addCronError,
  logDataSent,
  logDataBatchSent,
  logError,
  logSessionEvent,
  CronRunContext,
} from '@/lib/virtual-device/logging-service';
import {
  getOrCreateSession,
  updateSessionProgress,
  recordSessionError,
  completeSession,
} from '@/lib/virtual-device/session-service';

// API Key for cron-job.org authentication
const CRON_API_KEY = process.env.CRON_API_KEY || '3KjxViJoTMHiXOnOA38QdIIErIFgUTpH7HqCzqMMxhk=';

export async function GET(request: Request) {
  return handleCronRequest(request, 'GET');
}

export async function POST(request: Request) {
  return handleCronRequest(request, 'POST');
}

async function handleCronRequest(request: Request, method: string) {
  let cronContext: CronRunContext | null = null;

  try {
    // Determine trigger source
    const url = new URL(request.url);
    const isManual = url.searchParams.get('manual') === 'true';
    const triggerSource = isManual ? 'manual' : 'cron-job.org';

    // Verify API key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || url.searchParams.get('key');

    if (apiKey !== CRON_API_KEY) {
      console.log('[Virtual Device Cron] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Virtual Device Cron] Starting cron execution (${triggerSource})...`);

    // Start cron execution logging
    cronContext = await startCronRun(triggerSource);

    // Fetch all enabled virtual device configs
    const configs = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.enabled, true));

    if (configs.length === 0) {
      console.log('[Virtual Device Cron] No enabled virtual devices found');
      await completeCronRun(cronContext, 'completed');
      return NextResponse.json({
        success: true,
        message: 'No enabled virtual devices',
        runId: cronContext.runId,
        streamed: 0,
      });
    }

    // Process each config
    for (const config of configs) {
      try {
        cronContext.configsProcessed.push(config.id);
        await processConfig(config, cronContext);
      } catch (configError) {
        const errorMessage = configError instanceof Error ? configError.message : 'Unknown error';
        console.error(`[Virtual Device Cron] Error processing config ${config.id}:`, errorMessage);
        addCronError(cronContext, errorMessage, config.id);
      }
    }

    // Complete cron run logging
    const status = cronContext.errors.length > 0 ? 'completed' : 'completed';
    await completeCronRun(cronContext, status);

    console.log(`[Virtual Device Cron] Completed. Readings sent: ${cronContext.readingsSent}, Errors: ${cronContext.errors.length}`);

    return NextResponse.json({
      success: true,
      runId: cronContext.runId,
      configsProcessed: cronContext.configsProcessed.length,
      sessionsProcessed: cronContext.sessionsProcessed.length,
      readingsSent: cronContext.readingsSent,
      errors: cronContext.errors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Virtual Device Cron] Fatal error:', error);
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

async function processConfig(config: typeof virtualDeviceConfig.$inferSelect, cronContext: CronRunContext) {
  // Process fish device
  if (config.fishDeviceId) {
    const session = await getOrCreateSession(config, 'fish');
    if (session && session.status === 'active') {
      cronContext.sessionsProcessed.push(session.id);
      await processSession(session, 'fish', config, cronContext);
    }
  }

  // Process plant device
  if (config.plantDeviceId) {
    const session = await getOrCreateSession(config, 'plant');
    if (session && session.status === 'active') {
      cronContext.sessionsProcessed.push(session.id);
      await processSession(session, 'plant', config, cronContext);
    }
  }
}

async function processSession(
  session: typeof deviceStreamingSessions.$inferSelect,
  deviceType: 'fish' | 'plant',
  config: typeof virtualDeviceConfig.$inferSelect,
  cronContext: CronRunContext
) {
  const sessionId = session.id;
  const startTime = Date.now();

  try {
    // Get due readings based on 1:1 timing
    const dueReadings = getDueReadings(session, deviceType);

    if (dueReadings.count === 0) {
      console.log(`[Virtual Device Cron] No readings due for session ${sessionId} (${deviceType})`);
      return;
    }

    console.log(`[Virtual Device Cron] ${dueReadings.count} readings due for session ${sessionId} (${deviceType})`);

    // Get device details
    const deviceId = deviceType === 'fish' ? config.fishDeviceId : config.plantDeviceId;
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId!))
      .limit(1);

    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Send each due reading
    let successCount = 0;
    let lastSuccessfulIndex = session.lastRowSent || 0;

    for (const row of dueReadings.rows) {
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

        await logDataSent(sessionId, {
          deviceType,
          rowIndex: row.rowIndex,
          csvTimestamp: row.timestamp,
          sensorValues,
          telemetryResponseStatus: response.status,
        }, cronContext.runId);

        successCount++;
        lastSuccessfulIndex = row.rowIndex + 1;
        cronContext.readingsSent++;

      } catch (readingError) {
        const errorMessage = readingError instanceof Error ? readingError.message : 'Unknown error';
        console.error(`[Virtual Device Cron] Error sending reading ${row.rowIndex}:`, errorMessage);

        // Log error
        await logError(sessionId, readingError as Error, {
          rowIndex: row.rowIndex,
          deviceType,
        }, cronContext.runId);

        // Record error on session
        const { shouldFail } = await recordSessionError(sessionId, errorMessage);

        if (shouldFail) {
          console.error(`[Virtual Device Cron] Session ${sessionId} failed due to too many errors`);
          throw new Error('Too many consecutive errors');
        }

        addCronError(cronContext, errorMessage, sessionId);
      }
    }

    // Update session progress
    if (successCount > 0) {
      await updateSessionProgress(sessionId, lastSuccessfulIndex, successCount);

      // Log batch completion
      const duration = Date.now() - startTime;
      await logDataBatchSent(sessionId, {
        deviceType,
        startIndex: dueReadings.fromIndex,
        endIndex: lastSuccessfulIndex,
        count: successCount,
        duration,
      }, cronContext.runId);
    }

    // Check if dataset is complete
    if (dueReadings.isComplete && lastSuccessfulIndex >= session.totalRows) {
      console.log(`[Virtual Device Cron] Dataset complete for session ${sessionId}`);
      await completeSession(sessionId, cronContext.runId);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Virtual Device Cron] Error processing session ${sessionId}:`, errorMessage);
    await logError(sessionId, error as Error, { deviceType }, cronContext.runId);
    addCronError(cronContext, errorMessage, sessionId);
  }
}

// Generate fish readings from CSV row
function generateFishReadings(row: FishDataRow): Array<{ type: string; value: number; unit: string; timestamp: string }> {
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
