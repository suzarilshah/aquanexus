import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, plantGrowth, plantReadings, fishReadings, predictions, mlModels } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// Cron job endpoint for automatic predictions
// Runs every 6 hours via Vercel Cron
// Schedule: 0 */6 * * *

// Simple moving average prediction (fallback when no trained model)
function simpleMovingAverageForecast(
  data: number[],
  windowSize: number,
  steps: number
): number[] {
  if (data.length < windowSize) {
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    return Array(steps).fill(avg);
  }

  const predictions: number[] = [];
  const workingData = [...data];

  for (let i = 0; i < steps; i++) {
    const window = workingData.slice(-windowSize);
    const avg = window.reduce((a, b) => a + b, 0) / windowSize;
    const trend = workingData.length > 1
      ? (workingData[workingData.length - 1] - workingData[workingData.length - 2]) * 0.3
      : 0;
    const prediction = avg + trend;
    predictions.push(prediction);
    workingData.push(prediction);
  }

  return predictions;
}

function calculateConfidence(data: number[], step: number, totalSteps: number): number {
  if (data.length < 2) return 0.5;

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const cv = Math.sqrt(variance) / (mean || 1);

  const baseConfidence = Math.max(0.5, 0.95 - cv * 0.3);
  const stepPenalty = (step / totalSteps) * 0.2;

  return Math.max(0.5, Math.min(0.95, baseConfidence - stepPenalty));
}

export async function GET(request: Request) {
  try {
    // Verify this is a cron job request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[Cron Predict] Starting automatic predictions...');

    // Get all devices
    const allDevices = await db.select().from(devices);

    if (allDevices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No devices found, skipping predictions',
      });
    }

    const results: Array<{
      deviceId: string;
      deviceName: string;
      deviceType: string;
      status: string;
      predictions?: number;
    }> = [];

    for (const device of allDevices) {
      try {
        let historicalData: number[] = [];
        let lastTimestamp: Date = new Date();
        let metricType = '';

        if (device.deviceType === 'plant') {
          // Get plant growth data
          const growthData = await db
            .select()
            .from(plantGrowth)
            .where(eq(plantGrowth.deviceId, device.id))
            .orderBy(desc(plantGrowth.measuredAt))
            .limit(168); // 7 days of data

          if (growthData.length > 0) {
            historicalData = growthData
              .reverse()
              .map(r => parseFloat(r.height))
              .filter(v => !isNaN(v));
            lastTimestamp = growthData[0].measuredAt;
            metricType = 'height';
          }
        } else {
          // Get fish readings (temperature)
          const fishData = await db
            .select()
            .from(fishReadings)
            .where(eq(fishReadings.deviceId, device.id))
            .orderBy(desc(fishReadings.timestamp))
            .limit(168);

          if (fishData.length > 0) {
            historicalData = fishData
              .reverse()
              .map(r => r.temperature ? parseFloat(r.temperature) : NaN)
              .filter(v => !isNaN(v));
            lastTimestamp = fishData[0].timestamp;
            metricType = 'temperature';
          }
        }

        if (historicalData.length < 10) {
          results.push({
            deviceId: device.id,
            deviceName: device.deviceName,
            deviceType: device.deviceType,
            status: 'skipped',
          });
          continue;
        }

        // Generate predictions
        const predictionSteps = 24;
        const windowSize = Math.min(24, Math.floor(historicalData.length / 2));
        const predictedValues = simpleMovingAverageForecast(
          historicalData,
          windowSize,
          predictionSteps
        );

        // Generate timestamps and format predictions
        const predictionsOutput = predictedValues.map((value, index) => {
          const timestamp = new Date(lastTimestamp);
          timestamp.setHours(timestamp.getHours() + index + 1);

          return {
            timestamp: timestamp.toISOString(),
            value: Math.round(value * 100) / 100,
            confidence: calculateConfidence(historicalData, index, predictionSteps),
            step: index + 1,
          };
        });

        // Check for active model
        const activeModel = await db
          .select()
          .from(mlModels)
          .where(
            and(
              eq(mlModels.modelType, `${device.deviceType}_${metricType}`),
              eq(mlModels.isActive, true)
            )
          )
          .limit(1);

        // Save prediction
        await db.insert(predictions).values({
          deviceId: device.id,
          metricType,
          predictionHorizon: 'short',
          predictedValues: predictionsOutput,
          modelVersion: activeModel.length > 0 ? activeModel[0].modelVersion : 'statistical_v1',
        });

        results.push({
          deviceId: device.id,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          status: 'success',
          predictions: predictionSteps,
        });

        console.log(`[Cron Predict] Generated ${predictionSteps} predictions for ${device.deviceName}`);
      } catch (err) {
        console.error(`[Cron Predict] Error for device ${device.id}:`, err);
        results.push({
          deviceId: device.id,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          status: 'error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Prediction cron job completed',
      timestamp: new Date().toISOString(),
      results,
      nextRun: 'In 6 hours',
    });
  } catch (error) {
    console.error('[Cron Predict] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
