import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, virtualDeviceConfig, fishReadings, plantReadings, plantGrowth, predictions, alerts } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { generateApiKey } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
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
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ device: device[0] });
  } catch (error) {
    console.error('Get device error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

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
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Only allow updating certain fields
    const allowedUpdates: Record<string, unknown> = {};
    if (updates.deviceName) allowedUpdates.deviceName = updates.deviceName;
    if (updates.readingInterval) allowedUpdates.readingInterval = updates.readingInterval;
    if (updates.regenerateApiKey) allowedUpdates.apiKey = generateApiKey();

    const updatedDevice = await db
      .update(devices)
      .set(allowedUpdates)
      .where(eq(devices.id, params.id))
      .returning();

    return NextResponse.json({
      success: true,
      device: updatedDevice[0],
    });
  } catch (error) {
    console.error('Update device error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const device = existingDevice[0];

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
      return NextResponse.json(
        {
          error: 'Cannot delete virtual device',
          code: 'VIRTUAL_DEVICE_ACTIVE',
          message: 'This device is configured as a virtual ESP32 device. Please disable virtual devices in Settings first before deleting.',
        },
        { status: 400 }
      );
    }

    // If virtual config exists but disabled, clear the device reference
    if (virtualConfig.length > 0) {
      const updates: Partial<typeof virtualDeviceConfig.$inferInsert> = {};
      if (virtualConfig[0].fishDeviceId === params.id) {
        updates.fishDeviceId = null;
      }
      if (virtualConfig[0].plantDeviceId === params.id) {
        updates.plantDeviceId = null;
      }
      await db
        .update(virtualDeviceConfig)
        .set(updates)
        .where(eq(virtualDeviceConfig.id, virtualConfig[0].id));
    }

    // Delete related data first (foreign key constraints)
    if (device.deviceType === 'fish') {
      await db.delete(fishReadings).where(eq(fishReadings.deviceId, params.id));
    } else {
      await db.delete(plantReadings).where(eq(plantReadings.deviceId, params.id));
      await db.delete(plantGrowth).where(eq(plantGrowth.deviceId, params.id));
    }

    // Delete predictions and alerts for this device
    await db.delete(predictions).where(eq(predictions.deviceId, params.id));
    await db.delete(alerts).where(eq(alerts.deviceId, params.id));

    // Finally delete the device
    await db.delete(devices).where(eq(devices.id, params.id));

    return NextResponse.json({
      success: true,
      message: `Device "${device.deviceName}" and all associated data deleted successfully`
    });
  } catch (error) {
    console.error('Delete device error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
