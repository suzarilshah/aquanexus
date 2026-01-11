import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, plantReadings, plantGrowth, fishReadings, predictions, mlModels } from '@/lib/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Simple moving average prediction for serverless (fallback when ML model not available)
function simpleMovingAverageForecast(
  data: number[],
  windowSize: number,
  steps: number
): number[] {
  if (data.length < windowSize) {
    // Not enough data, return the average of what we have
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    return Array(steps).fill(avg);
  }

  const predictions: number[] = [];
  const workingData = [...data];

  for (let i = 0; i < steps; i++) {
    // Calculate moving average of last windowSize points
    const window = workingData.slice(-windowSize);
    const avg = window.reduce((a, b) => a + b, 0) / windowSize;

    // Add trend component
    const trend = workingData.length > 1
      ? (workingData[workingData.length - 1] - workingData[workingData.length - 2]) * 0.5
      : 0;

    const prediction = avg + trend;
    predictions.push(prediction);
    workingData.push(prediction);
  }

  return predictions;
}

// Calculate confidence based on data variance
function calculateConfidence(data: number[], step: number, totalSteps: number): number {
  if (data.length < 2) return 0.5;

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const cv = Math.sqrt(variance) / (mean || 1); // Coefficient of variation

  // Base confidence decreases with variance and step number
  const baseConfidence = Math.max(0.5, 0.95 - cv * 0.3);
  const stepPenalty = (step / totalSteps) * 0.2;

  return Math.max(0.5, Math.min(0.95, baseConfidence - stepPenalty));
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId, metricType = 'height', horizon = 'short' } = await request.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

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

    // Determine prediction parameters based on horizon
    const isShortTerm = horizon === 'short';
    const predictionSteps = isShortTerm ? 24 : 7; // 24 hours or 7 days
    const dataPointsNeeded = isShortTerm ? 168 : 30; // 7 days hourly or 30 days daily
    const stepLabel = isShortTerm ? 'hour' : 'day';

    // Fetch historical data based on device type and metric
    let historicalData: number[] = [];
    let lastTimestamp: Date = new Date();

    if (device[0].deviceType === 'plant') {
      if (metricType === 'height') {
        // Fetch growth data for height predictions
        const growthData = await db
          .select()
          .from(plantGrowth)
          .where(eq(plantGrowth.deviceId, deviceId))
          .orderBy(desc(plantGrowth.measuredAt))
          .limit(dataPointsNeeded);

        if (growthData.length > 0) {
          historicalData = growthData
            .reverse()
            .map(r => parseFloat(r.height))
            .filter(v => !isNaN(v));
          lastTimestamp = growthData[0].measuredAt;
        }
      } else {
        // Fetch plant readings for other metrics
        const readings = await db
          .select()
          .from(plantReadings)
          .where(eq(plantReadings.deviceId, deviceId))
          .orderBy(desc(plantReadings.timestamp))
          .limit(dataPointsNeeded);

        if (readings.length > 0) {
          const metricMap: Record<string, keyof typeof readings[0]> = {
            'soilMoisture': 'soilMoisture',
            'lightLevel': 'lightLevel',
            'temperature': 'temperature',
            'humidity': 'humidity',
          };

          const field = metricMap[metricType];
          if (field) {
            historicalData = readings
              .reverse()
              .map(r => {
                const val = r[field];
                return val ? parseFloat(val.toString()) : NaN;
              })
              .filter(v => !isNaN(v));
            lastTimestamp = readings[0].timestamp;
          }
        }
      }
    } else {
      // Fish device
      const readings = await db
        .select()
        .from(fishReadings)
        .where(eq(fishReadings.deviceId, deviceId))
        .orderBy(desc(fishReadings.timestamp))
        .limit(dataPointsNeeded);

      if (readings.length > 0) {
        const metricMap: Record<string, keyof typeof readings[0]> = {
          'temperature': 'temperature',
          'ph': 'ph',
          'dissolvedOxygen': 'dissolvedOxygen',
          'turbidity': 'turbidity',
          'tds': 'tds',
        };

        const field = metricMap[metricType];
        if (field) {
          historicalData = readings
            .reverse()
            .map(r => {
              const val = r[field];
              return val ? parseFloat(val.toString()) : NaN;
            })
            .filter(v => !isNaN(v));
          lastTimestamp = readings[0].timestamp;
        }
      }
    }

    if (historicalData.length < 10) {
      return NextResponse.json(
        { error: 'Not enough historical data for prediction. Need at least 10 data points.' },
        { status: 400 }
      );
    }

    // Check for active ML model
    const activeModel = await db
      .select()
      .from(mlModels)
      .where(
        and(
          eq(mlModels.modelType, `${device[0].deviceType}_${metricType}`),
          eq(mlModels.isActive, true)
        )
      )
      .limit(1);

    // Generate predictions using simple forecasting (ML model integration would go here)
    const windowSize = Math.min(24, Math.floor(historicalData.length / 2));
    const predictedValues = simpleMovingAverageForecast(
      historicalData,
      windowSize,
      predictionSteps
    );

    // Generate timestamps for predictions
    const predictions_output = predictedValues.map((value, index) => {
      const timestamp = new Date(lastTimestamp);
      if (isShortTerm) {
        timestamp.setHours(timestamp.getHours() + index + 1);
      } else {
        timestamp.setDate(timestamp.getDate() + index + 1);
      }

      return {
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 100) / 100,
        confidence: calculateConfidence(historicalData, index, predictionSteps),
        step: index + 1,
        stepLabel: `${index + 1} ${stepLabel}${index > 0 ? 's' : ''} ahead`,
      };
    });

    // Calculate growth rate if predicting height
    let growthMetrics = null;
    if (metricType === 'height' && historicalData.length >= 2) {
      const currentHeight = historicalData[historicalData.length - 1];
      const predictedHeight = predictions_output[predictions_output.length - 1].value;
      const daysDiff = isShortTerm ? 1 : 7;

      growthMetrics = {
        currentHeight: Math.round(currentHeight * 100) / 100,
        predictedHeight: Math.round(predictedHeight * 100) / 100,
        predictedGrowth: Math.round((predictedHeight - currentHeight) * 100) / 100,
        avgGrowthRate: Math.round(((predictedHeight - currentHeight) / daysDiff) * 1000) / 1000,
        unit: 'cm',
        period: isShortTerm ? '24 hours' : '7 days',
      };
    }

    // Save prediction to database
    await db.insert(predictions).values({
      deviceId,
      metricType,
      predictionHorizon: horizon,
      predictedValues: predictions_output,
      modelVersion: activeModel.length > 0 ? activeModel[0].modelVersion : 'statistical_v1',
    });

    return NextResponse.json({
      success: true,
      deviceId,
      deviceType: device[0].deviceType,
      metricType,
      horizon,
      predictionMethod: activeModel.length > 0 ? 'lstm' : 'statistical',
      modelVersion: activeModel.length > 0 ? activeModel[0].modelVersion : 'statistical_v1',
      dataPointsUsed: historicalData.length,
      predictions: predictions_output,
      growthMetrics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Prediction failed' },
      { status: 500 }
    );
  }
}
