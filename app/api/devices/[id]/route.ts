import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  devices,
  virtualDeviceConfig,
  fishReadings,
  plantReadings,
  plantGrowth,
  predictions,
  alerts,
  aiAnalyses,
  hourlyAggregates,
  deviceStreamingSessions,
  streamingEventLogs,
  deviceHealthchecks
} from '@/lib/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { generateApiKey } from '@/lib/utils';

// Helper function for detailed error logging
function logError(operation: string, error: unknown, context?: Record<string, unknown>) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[Device API] ${operation} failed:`, {
    message: errorMessage,
    stack: errorStack,
    context,
    timestamp: new Date().toISOString(),
  });

  return errorMessage;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    const session = await getSession();

    if (!session) {
      console.log(`[Device API] GET /${params.id} - Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const device = await db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.id, params.id),
          eq(devices.userId, session.userId)
        )
      )
      .limit(1);

    if (device.length === 0) {
      console.log(`[Device API] GET /${params.id} - Device not found for user ${session.userId}`);
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    console.log(`[Device API] GET /${params.id} - Success (${Date.now() - startTime}ms)`);
    return NextResponse.json({ device: device[0] });
  } catch (error) {
    const errorMessage = logError('GET device', error, { deviceId: params.id });
    return NextResponse.json(
      {
        error: 'Failed to fetch device',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    const session = await getSession();

    if (!session) {
      console.log(`[Device API] PATCH /${params.id} - Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let updates;
    try {
      updates = await request.json();
    } catch (parseError) {
      console.log(`[Device API] PATCH /${params.id} - Invalid JSON body`);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Expected valid JSON' },
        { status: 400 }
      );
    }

    // Verify device belongs to user
    const existingDevice = await db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.id, params.id),
          eq(devices.userId, session.userId)
        )
      )
      .limit(1);

    if (existingDevice.length === 0) {
      console.log(`[Device API] PATCH /${params.id} - Device not found for user ${session.userId}`);
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Only allow updating certain fields
    const allowedUpdates: Record<string, unknown> = {};
    if (updates.deviceName) allowedUpdates.deviceName = updates.deviceName;
    if (updates.readingInterval) allowedUpdates.readingInterval = updates.readingInterval;
    if (updates.regenerateApiKey) allowedUpdates.apiKey = generateApiKey();

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided', details: 'Allowed fields: deviceName, readingInterval, regenerateApiKey' },
        { status: 400 }
      );
    }

    const updatedDevice = await db
      .update(devices)
      .set(allowedUpdates)
      .where(eq(devices.id, params.id))
      .returning();

    console.log(`[Device API] PATCH /${params.id} - Success, updated fields: ${Object.keys(allowedUpdates).join(', ')} (${Date.now() - startTime}ms)`);
    return NextResponse.json({
      success: true,
      device: updatedDevice[0],
    });
  } catch (error) {
    const errorMessage = logError('PATCH device', error, { deviceId: params.id });
    return NextResponse.json(
      {
        error: 'Failed to update device',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const deletionLog: string[] = [];

  try {
    const session = await getSession();

    if (!session) {
      console.log(`[Device API] DELETE /${params.id} - Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Device API] DELETE /${params.id} - Starting deletion for user ${session.userId}`);

    // Verify device belongs to user
    const existingDevice = await db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.id, params.id),
          eq(devices.userId, session.userId)
        )
      )
      .limit(1);

    if (existingDevice.length === 0) {
      console.log(`[Device API] DELETE /${params.id} - Device not found for user ${session.userId}`);
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const device = existingDevice[0];
    deletionLog.push(`Found device: ${device.deviceName} (${device.deviceType})`);

    // Check if this device is used as a virtual device
    const virtualConfig = await db
      .select()
      .from(virtualDeviceConfig)
      .where(
        and(
          eq(virtualDeviceConfig.userId, session.userId),
          or(
            eq(virtualDeviceConfig.fishDeviceId, params.id),
            eq(virtualDeviceConfig.plantDeviceId, params.id)
          )
        )
      )
      .limit(1);

    if (virtualConfig.length > 0 && virtualConfig[0].enabled) {
      console.log(`[Device API] DELETE /${params.id} - Blocked: Device is active virtual device`);
      return NextResponse.json(
        {
          error: 'Cannot delete virtual device',
          code: 'VIRTUAL_DEVICE_ACTIVE',
          message: 'This device is configured as a virtual ESP32 device. Please disable virtual devices in Settings first before deleting.',
        },
        { status: 400 }
      );
    }

    // Start deletion process - order matters due to foreign key constraints

    // 1. If virtual config exists, handle session cleanup first
    if (virtualConfig.length > 0) {
      const config = virtualConfig[0];
      const sessionIdsToDelete: string[] = [];

      // Collect session IDs that need to be deleted
      if (config.fishDeviceId === params.id && config.fishSessionId) {
        sessionIdsToDelete.push(config.fishSessionId);
      }
      if (config.plantDeviceId === params.id && config.plantSessionId) {
        sessionIdsToDelete.push(config.plantSessionId);
      }

      // Delete streaming event logs for these sessions
      if (sessionIdsToDelete.length > 0) {
        try {
          await db
            .delete(streamingEventLogs)
            .where(inArray(streamingEventLogs.sessionId, sessionIdsToDelete));
          deletionLog.push(`Deleted streaming event logs for ${sessionIdsToDelete.length} sessions`);
        } catch (e) {
          console.warn(`[Device API] Warning: Could not delete streaming event logs:`, e);
        }

        // Delete the streaming sessions
        try {
          await db
            .delete(deviceStreamingSessions)
            .where(inArray(deviceStreamingSessions.id, sessionIdsToDelete));
          deletionLog.push(`Deleted ${sessionIdsToDelete.length} streaming sessions`);
        } catch (e) {
          console.warn(`[Device API] Warning: Could not delete streaming sessions:`, e);
        }
      }

      // Clear the device reference from virtual config
      const updates: Partial<typeof virtualDeviceConfig.$inferInsert> = {};
      if (config.fishDeviceId === params.id) {
        updates.fishDeviceId = null;
        updates.fishSessionId = null;
      }
      if (config.plantDeviceId === params.id) {
        updates.plantDeviceId = null;
        updates.plantSessionId = null;
      }

      await db
        .update(virtualDeviceConfig)
        .set(updates)
        .where(eq(virtualDeviceConfig.id, config.id));
      deletionLog.push(`Cleared virtual device config references`);
    }

    // 2. Delete device readings based on device type
    try {
      if (device.deviceType === 'fish') {
        await db.delete(fishReadings).where(eq(fishReadings.deviceId, params.id));
        deletionLog.push(`Deleted fish readings`);
      } else {
        await db.delete(plantReadings).where(eq(plantReadings.deviceId, params.id));
        deletionLog.push(`Deleted plant readings`);

        await db.delete(plantGrowth).where(eq(plantGrowth.deviceId, params.id));
        deletionLog.push(`Deleted plant growth records`);
      }
    } catch (e) {
      const errorMsg = logError('Delete readings', e, { deviceId: params.id, deviceType: device.deviceType });
      return NextResponse.json(
        {
          error: 'Failed to delete device readings',
          details: errorMsg,
          deletionLog
        },
        { status: 500 }
      );
    }

    // 3. Delete AI analyses
    try {
      await db.delete(aiAnalyses).where(eq(aiAnalyses.deviceId, params.id));
      deletionLog.push(`Deleted AI analyses`);
    } catch (e) {
      console.warn(`[Device API] Warning: Could not delete AI analyses:`, e);
      // Non-critical, continue
    }

    // 4. Delete hourly aggregates
    try {
      await db.delete(hourlyAggregates).where(eq(hourlyAggregates.deviceId, params.id));
      deletionLog.push(`Deleted hourly aggregates`);
    } catch (e) {
      console.warn(`[Device API] Warning: Could not delete hourly aggregates:`, e);
      // Non-critical, continue
    }

    // 5. Delete predictions
    try {
      await db.delete(predictions).where(eq(predictions.deviceId, params.id));
      deletionLog.push(`Deleted predictions`);
    } catch (e) {
      console.warn(`[Device API] Warning: Could not delete predictions:`, e);
      // Non-critical, continue
    }

    // 6. Delete alerts
    try {
      await db.delete(alerts).where(eq(alerts.deviceId, params.id));
      deletionLog.push(`Deleted alerts`);
    } catch (e) {
      console.warn(`[Device API] Warning: Could not delete alerts:`, e);
      // Non-critical, continue
    }

    // 7. Delete healthchecks
    try {
      await db.delete(deviceHealthchecks).where(eq(deviceHealthchecks.deviceId, params.id));
      deletionLog.push(`Deleted healthchecks`);
    } catch (e) {
      console.warn(`[Device API] Warning: Could not delete healthchecks:`, e);
      // Non-critical, continue
    }

    // 8. Finally delete the device itself
    try {
      await db.delete(devices).where(eq(devices.id, params.id));
      deletionLog.push(`Deleted device`);
    } catch (e) {
      const errorMsg = logError('Delete device record', e, { deviceId: params.id });
      return NextResponse.json(
        {
          error: 'Failed to delete device record',
          details: errorMsg,
          deletionLog,
          hint: 'There may be additional database constraints preventing deletion. Please contact support.'
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Device API] DELETE /${params.id} - Success (${duration}ms)`, { deletionLog });

    return NextResponse.json({
      success: true,
      message: `Device "${device.deviceName}" and all associated data deleted successfully`,
      deletionLog,
      duration: `${duration}ms`
    });
  } catch (error) {
    const errorMessage = logError('DELETE device', error, {
      deviceId: params.id,
      deletionLog
    });

    return NextResponse.json(
      {
        error: 'Failed to delete device',
        details: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred',
        deletionLog,
        hint: 'Check server logs for more details'
      },
      { status: 500 }
    );
  }
}
