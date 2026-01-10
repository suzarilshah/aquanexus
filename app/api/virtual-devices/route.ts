import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { virtualDeviceConfig, devices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// GET - Fetch virtual device configuration
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing config
    const [config] = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.userId, session.userId))
      .limit(1);

    // Get virtual devices
    const userDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.userId, session.userId));

    const fishDevice = userDevices.find(
      (d) => d.deviceType === 'fish' && d.deviceMac.startsWith('VIRTUAL:')
    );
    const plantDevice = userDevices.find(
      (d) => d.deviceType === 'plant' && d.deviceMac.startsWith('VIRTUAL:')
    );

    return NextResponse.json({
      config: config || null,
      fishDevice: fishDevice
        ? { id: fishDevice.id, name: fishDevice.deviceName, mac: fishDevice.deviceMac }
        : null,
      plantDevice: plantDevice
        ? { id: plantDevice.id, name: plantDevice.deviceName, mac: plantDevice.deviceMac }
        : null,
    });
  } catch (error) {
    console.error('[Virtual Devices API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update virtual device configuration
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enabled, dataSource = 'training', speedMultiplier = 1 } = body;

    // Get existing config
    const [existingConfig] = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.userId, session.userId))
      .limit(1);

    // Get or create virtual devices
    let fishDeviceId: string | null = null;
    let plantDeviceId: string | null = null;

    if (enabled) {
      // Check for existing virtual fish device
      const [existingFish] = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.userId, session.userId),
            eq(devices.deviceType, 'fish'),
            // Use deviceMac starting with VIRTUAL:
          )
        );

      const virtualFish = existingFish?.deviceMac?.startsWith('VIRTUAL:') ? existingFish : null;

      if (!virtualFish) {
        // Create virtual fish device
        const fishApiKey = `vfish_${randomUUID().replace(/-/g, '').substring(0, 24)}`;
        const [newFishDevice] = await db
          .insert(devices)
          .values({
            userId: session.userId,
            deviceName: 'Virtual Fish Sensor',
            deviceMac: 'VIRTUAL:FISH:001',
            deviceType: 'fish',
            apiKey: fishApiKey,
            status: 'online',
          })
          .returning();
        fishDeviceId = newFishDevice.id;
      } else {
        fishDeviceId = virtualFish.id;
        // Update status to online
        await db
          .update(devices)
          .set({ status: 'online', lastSeen: new Date() })
          .where(eq(devices.id, virtualFish.id));
      }

      // Check for existing virtual plant device
      const [existingPlant] = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.userId, session.userId),
            eq(devices.deviceType, 'plant'),
          )
        );

      const virtualPlant = existingPlant?.deviceMac?.startsWith('VIRTUAL:') ? existingPlant : null;

      if (!virtualPlant) {
        // Create virtual plant device
        const plantApiKey = `vplant_${randomUUID().replace(/-/g, '').substring(0, 24)}`;
        const [newPlantDevice] = await db
          .insert(devices)
          .values({
            userId: session.userId,
            deviceName: 'Virtual Plant Sensor',
            deviceMac: 'VIRTUAL:PLANT:001',
            deviceType: 'plant',
            apiKey: plantApiKey,
            status: 'online',
          })
          .returning();
        plantDeviceId = newPlantDevice.id;
      } else {
        plantDeviceId = virtualPlant.id;
        // Update status to online
        await db
          .update(devices)
          .set({ status: 'online', lastSeen: new Date() })
          .where(eq(devices.id, virtualPlant.id));
      }
    }

    // Create or update config
    if (existingConfig) {
      await db
        .update(virtualDeviceConfig)
        .set({
          enabled,
          fishDeviceId: enabled ? fishDeviceId : existingConfig.fishDeviceId,
          plantDeviceId: enabled ? plantDeviceId : existingConfig.plantDeviceId,
          dataSource,
          speedMultiplier,
          updatedAt: new Date(),
        })
        .where(eq(virtualDeviceConfig.id, existingConfig.id));
    } else {
      await db.insert(virtualDeviceConfig).values({
        userId: session.userId,
        enabled,
        fishDeviceId,
        plantDeviceId,
        dataSource,
        speedMultiplier,
      });
    }

    // If disabling, set devices to offline
    if (!enabled && existingConfig) {
      if (existingConfig.fishDeviceId) {
        await db
          .update(devices)
          .set({ status: 'offline' })
          .where(eq(devices.id, existingConfig.fishDeviceId));
      }
      if (existingConfig.plantDeviceId) {
        await db
          .update(devices)
          .set({ status: 'offline' })
          .where(eq(devices.id, existingConfig.plantDeviceId));
      }
    }

    return NextResponse.json({
      success: true,
      message: enabled ? 'Virtual devices enabled' : 'Virtual devices disabled',
    });
  } catch (error) {
    console.error('[Virtual Devices API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove virtual devices and their data
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get config
    const [config] = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.userId, session.userId))
      .limit(1);

    if (config) {
      // Delete config
      await db
        .delete(virtualDeviceConfig)
        .where(eq(virtualDeviceConfig.id, config.id));
    }

    // Find and delete virtual devices
    const userDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.userId, session.userId));

    for (const device of userDevices) {
      if (device.deviceMac.startsWith('VIRTUAL:')) {
        await db.delete(devices).where(eq(devices.id, device.id));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Virtual devices removed',
    });
  } catch (error) {
    console.error('[Virtual Devices API] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
