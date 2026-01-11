import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { virtualDeviceConfig, devices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// DEPRECATED: This API has been retired in favor of the multi-environment system.
// Use /api/virtual-devices/environments instead.
// This endpoint remains for backward compatibility and to support the legacy Settings UI section.

// GET - Fetch virtual device configuration and available devices (DEPRECATED)
export async function GET() {
  console.warn('[DEPRECATED] Legacy /api/virtual-devices GET called. Use /api/virtual-devices/environments instead.');
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

    // Get ALL user devices for selection
    const userDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.userId, session.userId));

    // Separate devices by type for dropdowns
    const fishDevices = userDevices
      .filter((d) => d.deviceType === 'fish')
      .map((d) => ({
        id: d.id,
        name: d.deviceName,
        mac: d.deviceMac,
        status: d.status,
        isVirtual: d.deviceMac.startsWith('VIRTUAL:'),
      }));

    const plantDevices = userDevices
      .filter((d) => d.deviceType === 'plant')
      .map((d) => ({
        id: d.id,
        name: d.deviceName,
        mac: d.deviceMac,
        status: d.status,
        isVirtual: d.deviceMac.startsWith('VIRTUAL:'),
      }));

    // Find currently selected devices
    const selectedFishDevice = config?.fishDeviceId
      ? fishDevices.find((d) => d.id === config.fishDeviceId)
      : null;
    const selectedPlantDevice = config?.plantDeviceId
      ? plantDevices.find((d) => d.id === config.plantDeviceId)
      : null;

    return NextResponse.json({
      config: config
        ? {
            enabled: config.enabled,
            fishEnabled: config.enabled && !!config.fishDeviceId,
            plantEnabled: config.enabled && !!config.plantDeviceId,
            dataSource: config.dataSource,
            speedMultiplier: config.speedMultiplier,
            fishDeviceId: config.fishDeviceId,
            plantDeviceId: config.plantDeviceId,
          }
        : null,
      fishDevices,
      plantDevices,
      selectedFishDevice,
      selectedPlantDevice,
    });
  } catch (error) {
    console.error('[Virtual Devices API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update virtual device configuration with user-selected devices
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      enabled = false,
      fishDeviceId = null,
      plantDeviceId = null,
      dataSource = 'validation',
      speedMultiplier = 1,
    } = body;

    // Validate that selected devices exist and belong to user
    if (fishDeviceId) {
      const [fishDevice] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, fishDeviceId))
        .limit(1);

      if (!fishDevice || fishDevice.userId !== session.userId) {
        return NextResponse.json(
          { error: 'Invalid fish device selection' },
          { status: 400 }
        );
      }

      if (fishDevice.deviceType !== 'fish') {
        return NextResponse.json(
          { error: 'Selected device is not a fish sensor' },
          { status: 400 }
        );
      }
    }

    if (plantDeviceId) {
      const [plantDevice] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, plantDeviceId))
        .limit(1);

      if (!plantDevice || plantDevice.userId !== session.userId) {
        return NextResponse.json(
          { error: 'Invalid plant device selection' },
          { status: 400 }
        );
      }

      if (plantDevice.deviceType !== 'plant') {
        return NextResponse.json(
          { error: 'Selected device is not a plant sensor' },
          { status: 400 }
        );
      }
    }

    // Get existing config
    const [existingConfig] = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.userId, session.userId))
      .limit(1);

    // Update device statuses based on selection
    if (enabled) {
      if (fishDeviceId) {
        await db
          .update(devices)
          .set({ status: 'online', lastSeen: new Date() })
          .where(eq(devices.id, fishDeviceId));
      }
      if (plantDeviceId) {
        await db
          .update(devices)
          .set({ status: 'online', lastSeen: new Date() })
          .where(eq(devices.id, plantDeviceId));
      }
    }

    // Set old devices to offline if they were previously selected but now changed
    if (existingConfig) {
      if (existingConfig.fishDeviceId && existingConfig.fishDeviceId !== fishDeviceId) {
        await db
          .update(devices)
          .set({ status: 'offline' })
          .where(eq(devices.id, existingConfig.fishDeviceId));
      }
      if (existingConfig.plantDeviceId && existingConfig.plantDeviceId !== plantDeviceId) {
        await db
          .update(devices)
          .set({ status: 'offline' })
          .where(eq(devices.id, existingConfig.plantDeviceId));
      }
    }

    // Create or update config
    if (existingConfig) {
      await db
        .update(virtualDeviceConfig)
        .set({
          enabled,
          fishDeviceId,
          plantDeviceId,
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

    // If disabling, set selected devices to offline
    if (!enabled) {
      if (fishDeviceId) {
        await db
          .update(devices)
          .set({ status: 'offline' })
          .where(eq(devices.id, fishDeviceId));
      }
      if (plantDeviceId) {
        await db
          .update(devices)
          .set({ status: 'offline' })
          .where(eq(devices.id, plantDeviceId));
      }
    }

    const enabledCount = (fishDeviceId ? 1 : 0) + (plantDeviceId ? 1 : 0);
    const message = enabled
      ? `Virtual streaming enabled for ${enabledCount} device(s)`
      : 'Virtual streaming disabled';

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('[Virtual Devices API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Clear virtual device configuration (doesn't delete devices)
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
      // Set selected devices to offline
      if (config.fishDeviceId) {
        await db
          .update(devices)
          .set({ status: 'offline' })
          .where(eq(devices.id, config.fishDeviceId));
      }
      if (config.plantDeviceId) {
        await db
          .update(devices)
          .set({ status: 'offline' })
          .where(eq(devices.id, config.plantDeviceId));
      }

      // Delete config
      await db
        .delete(virtualDeviceConfig)
        .where(eq(virtualDeviceConfig.id, config.id));
    }

    return NextResponse.json({
      success: true,
      message: 'Virtual device configuration cleared',
    });
  } catch (error) {
    console.error('[Virtual Devices API] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
