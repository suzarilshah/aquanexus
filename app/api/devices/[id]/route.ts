import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

    await db.delete(devices).where(eq(devices.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete device error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
