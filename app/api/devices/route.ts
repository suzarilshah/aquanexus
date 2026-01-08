import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { generateApiKey } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.userId, session.userId));

    return NextResponse.json({ devices: userDevices });
  } catch (error) {
    console.error('Get devices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceMac, deviceName, deviceType } = await request.json();

    if (!deviceMac || !deviceName || !deviceType) {
      return NextResponse.json(
        { error: 'Missing required fields: deviceMac, deviceName, deviceType' },
        { status: 400 }
      );
    }

    if (!['fish', 'plant'].includes(deviceType)) {
      return NextResponse.json(
        { error: 'Invalid device type. Must be "fish" or "plant"' },
        { status: 400 }
      );
    }

    // Check if device already exists
    const existingDevice = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceMac, deviceMac))
      .limit(1);

    if (existingDevice.length > 0) {
      return NextResponse.json(
        { error: 'Device with this MAC address already registered' },
        { status: 409 }
      );
    }

    // Generate API key for the device
    const apiKey = generateApiKey();

    const newDevice = await db
      .insert(devices)
      .values({
        userId: session.userId,
        deviceMac,
        deviceName,
        deviceType,
        apiKey,
        status: 'offline',
        readingInterval: 300, // 5 minutes default
      })
      .returning();

    return NextResponse.json({
      success: true,
      device: newDevice[0],
    });
  } catch (error) {
    console.error('Create device error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
