import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { virtualDeviceConfig, devices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getActiveSessions, getSessionWithProgress } from '@/lib/virtual-device/session-service';
import { getSessionEvents, getRecentCronRuns } from '@/lib/virtual-device/logging-service';
import { getDatasetSummary } from '@/lib/virtual-device/csv-parser';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const deviceType = url.searchParams.get('deviceType') as 'fish' | 'plant' | null;

    // Get user's virtual device config
    const [config] = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.userId, session.userId))
      .limit(1);

    if (!config) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: 'No virtual device configuration found. Please set up in Settings.',
      });
    }

    // If specific session requested
    if (sessionId) {
      const sessionDetails = await getSessionWithProgress(sessionId);
      if (!sessionDetails) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Get recent events
      const { events: recentEvents } = await getSessionEvents(sessionId, { limit: 10 });

      return NextResponse.json({
        success: true,
        session: sessionDetails,
        recentEvents,
      });
    }

    // Get all active sessions for the config
    const { fishSession, plantSession } = await getActiveSessions(config.id);

    // Get device details
    let fishDevice = null;
    let plantDevice = null;

    if (config.fishDeviceId) {
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, config.fishDeviceId))
        .limit(1);
      fishDevice = device ? { id: device.id, name: device.deviceName, mac: device.deviceMac } : null;
    }

    if (config.plantDeviceId) {
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, config.plantDeviceId))
        .limit(1);
      plantDevice = device ? { id: device.id, name: device.deviceName, mac: device.deviceMac } : null;
    }

    // Get recent cron runs
    const recentCronRuns = await getRecentCronRuns(5);

    // Get dataset summaries
    const fishDataset = getDatasetSummary('fish');
    const plantDataset = getDatasetSummary('plant');

    // Get recent events for each session
    let fishEvents: typeof streamingEventLogs.$inferSelect[] = [];
    let plantEvents: typeof streamingEventLogs.$inferSelect[] = [];

    if (fishSession) {
      const { events } = await getSessionEvents(fishSession.id, { limit: 5 });
      fishEvents = events;
    }

    if (plantSession) {
      const { events } = await getSessionEvents(plantSession.id, { limit: 5 });
      plantEvents = events;
    }

    return NextResponse.json({
      success: true,
      configured: true,
      config: {
        id: config.id,
        enabled: config.enabled,
        dataSource: config.dataSource,
        speedMultiplier: config.speedMultiplier,
        dataRetentionOnReset: config.dataRetentionOnReset,
        notifyOnCompletion: config.notifyOnCompletion,
        notifyOnError: config.notifyOnError,
        lastUserAction: config.lastUserAction,
        lastUserActionAt: config.lastUserActionAt,
      },
      fish: {
        device: fishDevice,
        session: fishSession,
        recentEvents: fishEvents,
        dataset: fishDataset,
      },
      plant: {
        device: plantDevice,
        session: plantSession,
        recentEvents: plantEvents,
        dataset: plantDataset,
      },
      recentCronRuns,
    });
  } catch (error) {
    console.error('[Session Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get session status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Import for type reference (workaround)
import type { streamingEventLogs } from '@/lib/db/schema';
