import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getMigrationStatus,
  migrateLegacyConfig,
  getMigrationSummary,
  retireLegacyCronJob,
} from '@/lib/virtual-device/migration-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/virtual-devices/migrate
 * Check migration status for the current user
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // Admin action: get overall migration summary
    if (action === 'summary') {
      const summary = await getMigrationSummary();
      return NextResponse.json({
        success: true,
        summary,
      });
    }

    // Get user's migration status
    const status = await getMigrationStatus(session.userId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('[Migration API] GET error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/virtual-devices/migrate
 * Perform migration for the current user
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    // Admin action: retire legacy cron job
    if (action === 'retire-legacy-cron') {
      const result = await retireLegacyCronJob();
      return NextResponse.json(result);
    }

    // Default action: migrate current user
    const result = await migrateLegacyConfig(session.userId);

    if (result.success) {
      return NextResponse.json({
        ...result,
        message: `Successfully migrated to environment system`,
      });
    } else {
      return NextResponse.json({
        ...result,
        message: 'Migration failed',
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[Migration API] POST error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMsg }, { status: 500 });
  }
}
