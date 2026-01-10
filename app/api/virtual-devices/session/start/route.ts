import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { virtualDeviceConfig, devices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSession, getSessionWithProgress } from '@/lib/virtual-device/session-service';
import { getDatasetSummary } from '@/lib/virtual-device/csv-parser';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deviceType } = body as { deviceType?: 'fish' | 'plant' };

    if (!deviceType || !['fish', 'plant'].includes(deviceType)) {
      return NextResponse.json(
        { error: 'Invalid device type. Must be "fish" or "plant".' },
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
        { error: 'Virtual device configuration not found. Please enable virtual devices in Settings first.' },
        { status: 404 }
      );
    }

    // Check if device exists
    const deviceId = deviceType === 'fish' ? config.fishDeviceId : config.plantDeviceId;
    if (!deviceId) {
      return NextResponse.json(
        { error: `No ${deviceType} device configured. Please set up virtual devices in Settings first.` },
        { status: 400 }
      );
    }

    // Verify device still exists
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId))
      .limit(1);

    if (!device) {
      return NextResponse.json(
        { error: `${deviceType} device not found. It may have been deleted.` },
        { status: 404 }
      );
    }

    // Check if there's already an active session
    const existingSessionId = deviceType === 'fish' ? config.fishSessionId : config.plantSessionId;
    if (existingSessionId) {
      const existingSession = await getSessionWithProgress(existingSessionId);
      if (existingSession && (existingSession.status === 'active' || existingSession.status === 'paused')) {
        return NextResponse.json(
          {
            error: `A ${existingSession.status} session already exists for this device.`,
            session: existingSession,
          },
          { status: 409 }
        );
      }
    }

    // Create new session
    const newSession = await createSession(config.id, deviceType);
    const sessionDetails = await getSessionWithProgress(newSession.id);

    // Get dataset summary
    const datasetSummary = getDatasetSummary(deviceType);

    // Enable config if not already enabled
    if (!config.enabled) {
      await db
        .update(virtualDeviceConfig)
        .set({
          enabled: true,
          updatedAt: new Date(),
        })
        .where(eq(virtualDeviceConfig.id, config.id));
    }

    return NextResponse.json({
      success: true,
      message: `Started streaming session for ${deviceType} device`,
      session: sessionDetails,
      dataset: datasetSummary,
    });
  } catch (error) {
    console.error('[Session Start] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
