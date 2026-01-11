import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, deviceHealthchecks } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the 'limit' query param (default to 10)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Verify device belongs to user
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

    // Get latest healthcheck records
    const healthchecks = await db
      .select()
      .from(deviceHealthchecks)
      .where(eq(deviceHealthchecks.deviceId, params.id))
      .orderBy(desc(deviceHealthchecks.receivedAt))
      .limit(limit);

    // Get the latest healthcheck for quick access
    const latestHealthcheck = healthchecks.length > 0 ? healthchecks[0] : null;

    return NextResponse.json({
      device: device[0],
      latestHealthcheck,
      healthchecks,
      totalRecords: healthchecks.length,
    });
  } catch (error) {
    console.error('Healthcheck API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch healthcheck data' },
      { status: 500 }
    );
  }
}
