/**
 * Health Check API Endpoint
 *
 * Provides health status information for the virtual device streaming system.
 * This helps users understand if their cron jobs are running correctly and
 * if their virtual devices are properly synchronized.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getHealthCheck, checkAndCreateAlerts } from '@/lib/virtual-device/sync-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get health check status
    const health = await getHealthCheck(session.userId);

    // Also check and create any necessary alerts
    await checkAndCreateAlerts(session.userId);

    const duration = Date.now() - startTime;
    console.log(`[Health API] GET - User ${session.userId} - Status: ${health.status} (${duration}ms)`);

    return NextResponse.json({
      success: true,
      health,
      checkedAt: new Date().toISOString(),
      duration: `${duration}ms`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Health API] GET failed:', errorMessage);

    return NextResponse.json(
      {
        error: 'Failed to get health status',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
