/**
 * Manual Sync API Endpoint
 *
 * Allows users to manually trigger a synchronization between their virtual devices
 * and the streaming sessions. This is useful when:
 * - A device was deleted and sessions need cleanup
 * - A new device was created and needs a session
 * - The system is out of sync for any reason
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { performSync, getHealthCheck } from '@/lib/virtual-device/sync-service';
import { logStreamingEvent } from '@/lib/virtual-device/logging-service';
import { db } from '@/lib/db';
import { virtualDeviceConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST() {
  const startTime = Date.now();

  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Sync API] POST - Starting manual sync for user ${session.userId}`);

    // Get user's virtual device config
    const [config] = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.userId, session.userId))
      .limit(1);

    if (!config) {
      return NextResponse.json(
        {
          error: 'No virtual device configuration found',
          hint: 'Please set up virtual devices in the simulator page first.',
        },
        { status: 404 }
      );
    }

    // Generate a unique ID for this manual sync
    const syncRunId = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Log the manual sync initiation
    if (config.fishSessionId) {
      await logStreamingEvent(config.fishSessionId, 'manual_sync_triggered', {
        eventDetails: {
          triggeredBy: 'user',
          userId: session.userId,
        },
        cronRunId: syncRunId,
      });
    }
    if (config.plantSessionId) {
      await logStreamingEvent(config.plantSessionId, 'manual_sync_triggered', {
        eventDetails: {
          triggeredBy: 'user',
          userId: session.userId,
        },
        cronRunId: syncRunId,
      });
    }

    // Perform the sync
    const syncResult = await performSync(session.userId, syncRunId);

    // Get updated health status
    const health = await getHealthCheck(session.userId);

    const duration = Date.now() - startTime;
    console.log(`[Sync API] POST - Completed for user ${session.userId}`, {
      success: syncResult.success,
      actions: syncResult.actions,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: syncResult.success,
      syncResult: {
        syncedAt: syncResult.syncedAt,
        actions: syncResult.actions,
        issues: syncResult.issues,
        healthStatus: syncResult.healthStatus,
      },
      health,
      syncRunId,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync API] POST failed:', errorMessage);

    return NextResponse.json(
      {
        error: 'Failed to perform sync',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET() {
  const startTime = Date.now();

  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const health = await getHealthCheck(session.userId);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      syncStatus: health.syncStatus,
      health,
      checkedAt: new Date().toISOString(),
      duration: `${duration}ms`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync API] GET failed:', errorMessage);

    return NextResponse.json(
      {
        error: 'Failed to get sync status',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
