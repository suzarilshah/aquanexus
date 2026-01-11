import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiConfig, aiAnalyses, devices, fishReadings, plantReadings } from '@/lib/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { analyzeWithConsensus, generateAnalysisPrompt } from '@/lib/ai/consensus';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId, timeRange = '24h' } = await request.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Get device info
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

    // Get AI configuration
    const config = await db
      .select()
      .from(aiConfig)
      .where(eq(aiConfig.userId, session.userId))
      .limit(1);

    if (config.length === 0 || !config[0].model1Endpoint || !config[0].model2Endpoint) {
      return NextResponse.json(
        { error: 'AI models not configured. Please configure in Settings.' },
        { status: 400 }
      );
    }

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get sensor readings based on device type
    let readings: Record<string, unknown>[] = [];

    if (device[0].deviceType === 'fish') {
      const fishData = await db
        .select()
        .from(fishReadings)
        .where(
          and(
            eq(fishReadings.deviceId, deviceId),
            gte(fishReadings.timestamp, startTime)
          )
        )
        .orderBy(desc(fishReadings.timestamp))
        .limit(100);

      readings = fishData.map((r) => ({
        timestamp: r.timestamp,
        temperature: r.temperature,
        ph: r.ph,
        dissolvedOxygen: r.dissolvedOxygen,
        turbidity: r.turbidity,
        tds: r.tds,
      }));
    } else {
      const plantData = await db
        .select()
        .from(plantReadings)
        .where(
          and(
            eq(plantReadings.deviceId, deviceId),
            gte(plantReadings.timestamp, startTime)
          )
        )
        .orderBy(desc(plantReadings.timestamp))
        .limit(100);

      readings = plantData.map((r) => ({
        timestamp: r.timestamp,
        soilMoisture: r.soilMoisture,
        lightLevel: r.lightLevel,
        temperature: r.temperature,
        humidity: r.humidity,
      }));
    }

    if (readings.length === 0) {
      return NextResponse.json(
        { error: 'No sensor data available for analysis' },
        { status: 400 }
      );
    }

    // Generate analysis prompt
    const prompt = generateAnalysisPrompt(device[0].deviceType, readings, timeRange);

    // Run dual model analysis
    const model1Config = {
      name: config[0].model1Name || 'gpt-o3-mini',
      endpoint: config[0].model1Endpoint!,
      apiKey: config[0].model1ApiKey!,
    };

    const model2Config = {
      name: config[0].model2Name || 'deepseek-r1',
      endpoint: config[0].model2Endpoint!,
      apiKey: config[0].model2ApiKey!,
    };

    const consensusResult = await analyzeWithConsensus(
      model1Config,
      model2Config,
      prompt
    );

    // Save analysis result
    const savedAnalysis = await db
      .insert(aiAnalyses)
      .values({
        deviceId,
        model1Verdict: consensusResult.model1,
        model2Verdict: consensusResult.model2,
        consensusVerdict: consensusResult.consensus,
        agreementScore: consensusResult.agreementScore.toString(),
        errorMargin: consensusResult.errorMargin.toString(),
        timeRange,
      })
      .returning();

    return NextResponse.json({
      success: true,
      analysis: {
        id: savedAnalysis[0].id,
        ...consensusResult,
      },
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
