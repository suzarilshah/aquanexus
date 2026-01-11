import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, plantReadings, plantGrowth, fishReadings, mlModels, trainingDatasets } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// This endpoint triggers model training
// In production, this would call the Python ML service or trigger a background job
// For now, it prepares the data and stores a training job record

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      deviceId,
      modelType = 'height',
      horizon = 'short',
      daysOfData = 180
    } = await request.json();

    // Get all devices for user if no specific device
    let deviceIds: string[] = [];

    if (deviceId) {
      // Verify device ownership
      const device = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.id, deviceId),
            eq(devices.userId, session.userId)
          )
        )
        .limit(1);

      if (device.length === 0) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 });
      }
      deviceIds = [deviceId];
    } else {
      // Get all user's devices
      const userDevices = await db
        .select()
        .from(devices)
        .where(eq(devices.userId, session.userId));

      deviceIds = userDevices.map(d => d.id);
    }

    if (deviceIds.length === 0) {
      return NextResponse.json(
        { error: 'No devices found for training' },
        { status: 400 }
      );
    }

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysOfData);
    const endDate = new Date();

    // Collect training data based on model type
    let recordCount = 0;
    const features: string[] = [];

    if (modelType === 'height' || modelType.startsWith('plant')) {
      // Fetch plant growth data
      for (const devId of deviceIds) {
        const growthData = await db
          .select()
          .from(plantGrowth)
          .where(
            and(
              eq(plantGrowth.deviceId, devId),
              gte(plantGrowth.measuredAt, startDate)
            )
          );
        recordCount += growthData.length;
      }
      features.push('height', 'growth_rate', 'days_from_planting');

      // Also get plant readings for multivariate models
      for (const devId of deviceIds) {
        const plantData = await db
          .select()
          .from(plantReadings)
          .where(
            and(
              eq(plantReadings.deviceId, devId),
              gte(plantReadings.timestamp, startDate)
            )
          );
        if (modelType !== 'height') {
          recordCount += plantData.length;
        }
      }
      if (modelType !== 'height') {
        features.push('soil_moisture', 'light_level', 'temperature', 'humidity');
      }
    } else if (modelType.startsWith('fish')) {
      // Fetch fish readings
      for (const devId of deviceIds) {
        const fishData = await db
          .select()
          .from(fishReadings)
          .where(
            and(
              eq(fishReadings.deviceId, devId),
              gte(fishReadings.timestamp, startDate)
            )
          );
        recordCount += fishData.length;
      }
      features.push('temperature', 'ph', 'dissolved_oxygen', 'turbidity', 'tds');
    }

    if (recordCount < 100) {
      return NextResponse.json(
        {
          error: 'Not enough training data',
          recordCount,
          minimum: 100,
          suggestion: `Need at least 100 records for training. Currently have ${recordCount}.`
        },
        { status: 400 }
      );
    }

    // Create training dataset record
    const dataset = await db.insert(trainingDatasets).values({
      datasetType: modelType,
      startDate,
      endDate,
      recordCount,
      features,
    }).returning();

    // Create a placeholder model record (would be updated by actual training)
    const version = `v${Date.now()}`;
    const model = await db.insert(mlModels).values({
      modelType: `${modelType}_${horizon}`,
      modelVersion: version,
      trainedAt: new Date(),
      metrics: {
        status: 'pending',
        recordCount,
        datasetId: dataset[0].id,
      },
      hyperparameters: {
        sequence_length: horizon === 'short' ? 24 : 7,
        prediction_steps: horizon === 'short' ? 24 : 7,
        features,
        horizon,
      },
      isActive: false,
    }).returning();

    // In production, this would trigger the Python ML service
    // For now, we return the job info
    // TODO: Implement actual training trigger via:
    // 1. HTTP call to Python service
    // 2. Message queue (SQS, Redis, etc.)
    // 3. Background job (Bull, Agenda, etc.)

    return NextResponse.json({
      success: true,
      message: 'Training job created',
      job: {
        id: model[0].id,
        modelType,
        version,
        horizon,
        status: 'pending',
        datasetId: dataset[0].id,
        recordCount,
        features,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
      instructions: {
        manual: 'Run the Python training script manually:',
        command: `cd ml-service && python -m api.train --model-type ${modelType} --horizon ${horizon}`,
      },
    });
  } catch (error) {
    console.error('Training trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Training trigger failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check training status
export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const modelType = searchParams.get('modelType');

    // Get all models, optionally filtered by type
    let query = db
      .select()
      .from(mlModels)
      .orderBy(desc(mlModels.trainedAt))
      .limit(20);

    const models = await query;

    // Filter by type if specified
    const filteredModels = modelType
      ? models.filter(m => m.modelType.includes(modelType))
      : models;

    return NextResponse.json({
      success: true,
      models: filteredModels.map(m => ({
        id: m.id,
        modelType: m.modelType,
        version: m.modelVersion,
        trainedAt: m.trainedAt,
        isActive: m.isActive,
        metrics: m.metrics,
        hyperparameters: m.hyperparameters,
      })),
    });
  } catch (error) {
    console.error('Get models error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get models' },
      { status: 500 }
    );
  }
}
