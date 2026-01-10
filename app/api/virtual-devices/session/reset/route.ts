import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { virtualDeviceConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resetSession, getSessionWithProgress } from '@/lib/virtual-device/session-service';
import { getDatasetSummary } from '@/lib/virtual-device/csv-parser';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deviceType, retainData } = body as { deviceType?: 'fish' | 'plant'; retainData?: boolean };

    if (!deviceType || !['fish', 'plant'].includes(deviceType)) {
      return NextResponse.json(
        { error: 'Invalid device type. Must be "fish" or "plant".' },
        { status: 400 }
      );
    }

    if (typeof retainData !== 'boolean') {
      return NextResponse.json(
        { error: 'retainData must be a boolean value' },
        { status: 400 }
      );
    }

    // Get user's virtual device config
    const [config] = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.userId, session.userId))
      .limit(1);

    if (!config) {
      return NextResponse.json(
        { error: 'Virtual device configuration not found.' },
        { status: 404 }
      );
    }

    // Check if device exists
    const deviceId = deviceType === 'fish' ? config.fishDeviceId : config.plantDeviceId;
    if (!deviceId) {
      return NextResponse.json(
        { error: `No ${deviceType} device configured.` },
        { status: 400 }
      );
    }

    // Perform reset
    const newSession = await resetSession(config.id, deviceType, retainData);
    const sessionDetails = await getSessionWithProgress(newSession.id);

    // Get dataset summary
    const datasetSummary = getDatasetSummary(deviceType);

    return NextResponse.json({
      success: true,
      message: `Session reset successfully. Data ${retainData ? 'retained' : 'deleted'}.`,
      session: sessionDetails,
      dataset: datasetSummary,
      dataRetained: retainData,
    });
  } catch (error) {
    console.error('[Session Reset] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
