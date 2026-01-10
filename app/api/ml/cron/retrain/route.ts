import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, plantGrowth, mlModels, trainingDatasets } from '@/lib/db/schema';
import { gte, desc } from 'drizzle-orm';

// Cron job endpoint for automatic model retraining
// Runs weekly (Sunday 2 AM) via Vercel Cron or cron-job.org
// Schedule: 0 2 * * 0

// API Key for cron-job.org authentication (same key for all cron jobs)
const CRON_API_KEY = '3KjxViJoTMHiXOnOA38QdIIErIFgUTpH7HqCzqMMxhk=';

export async function GET(request: Request) {
  try {
    // Verify this is a cron job request - support both header and query param
    const authHeader = request.headers.get('authorization');
    const queryKey = new URL(request.url).searchParams.get('key');
    const isAuthorized =
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      authHeader === `Bearer ${CRON_API_KEY}` ||
      queryKey === CRON_API_KEY;

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron Retrain] Starting automatic model retraining...');

    // Get all devices
    const allDevices = await db.select().from(devices);

    if (allDevices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No devices found, skipping training',
      });
    }

    // Calculate date range (last 6 months)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const endDate = new Date();

    const results: Array<{
      modelType: string;
      status: string;
      message?: string;
      recordCount?: number;
    }> = [];

    // Check if we have enough data for training
    const growthData = await db
      .select()
      .from(plantGrowth)
      .where(gte(plantGrowth.measuredAt, startDate));

    if (growthData.length >= 100) {
      // Create training dataset record
      const version = `v${Date.now()}`;

      await db.insert(trainingDatasets).values({
        datasetType: 'height',
        startDate,
        endDate,
        recordCount: growthData.length,
        features: ['height', 'growth_rate', 'days_from_planting'],
      });

      // Create model record (would be updated by actual training)
      await db.insert(mlModels).values({
        modelType: 'height_short',
        modelVersion: version,
        trainedAt: new Date(),
        metrics: {
          status: 'scheduled',
          recordCount: growthData.length,
          scheduledAt: new Date().toISOString(),
        },
        hyperparameters: {
          sequence_length: 24,
          prediction_steps: 24,
          features: ['height'],
          horizon: 'short',
        },
        isActive: false,
      });

      // In production, this would trigger the actual Python training job
      // Options:
      // 1. Call external Python service
      // 2. Trigger GitHub Action
      // 3. Send to message queue (SQS, Redis, etc.)

      results.push({
        modelType: 'height_short',
        status: 'scheduled',
        recordCount: growthData.length,
        message: `Training scheduled with ${growthData.length} records`,
      });

      console.log(`[Cron Retrain] Scheduled height model training with ${growthData.length} records`);
    } else {
      results.push({
        modelType: 'height_short',
        status: 'skipped',
        recordCount: growthData.length,
        message: `Not enough data (${growthData.length}/100 required)`,
      });

      console.log(`[Cron Retrain] Skipped height model - not enough data (${growthData.length})`);
    }

    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      timestamp: new Date().toISOString(),
      results,
      nextRun: 'Sunday 2:00 AM UTC',
    });
  } catch (error) {
    console.error('[Cron Retrain] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
