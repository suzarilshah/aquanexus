import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { alerts, devices, streamingEventLogs, cronExecutionLogs } from '@/lib/db/schema';
import { eq, desc, and, or, sql, gte, lte } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const unresolved = url.searchParams.get('unresolved') === 'true';
    const severity = url.searchParams.get('severity');
    const deviceId = url.searchParams.get('deviceId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Get user's devices
    const userDevices = await db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.userId, session.userId));

    const deviceIds = userDevices.map(d => d.id);

    if (deviceIds.length === 0) {
      return NextResponse.json({
        alerts: [],
        total: 0,
        unresolvedCount: 0,
      });
    }

    // Build conditions
    const conditions = [
      or(...deviceIds.map(id => eq(alerts.deviceId, id)))!,
    ];

    if (unresolved) {
      conditions.push(eq(alerts.resolved, false));
    }

    if (severity) {
      conditions.push(eq(alerts.severity, severity as 'low' | 'medium' | 'high' | 'critical'));
    }

    if (deviceId && deviceIds.includes(deviceId)) {
      conditions.push(eq(alerts.deviceId, deviceId));
    }

    if (startDate) {
      conditions.push(gte(alerts.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(alerts.createdAt, new Date(endDate)));
    }

    // Fetch alerts with device names
    const alertsWithDevices = await db
      .select({
        id: alerts.id,
        deviceId: alerts.deviceId,
        alertType: alerts.alertType,
        severity: alerts.severity,
        message: alerts.message,
        value: alerts.value,
        threshold: alerts.threshold,
        resolved: alerts.resolved,
        createdAt: alerts.createdAt,
        deviceName: devices.deviceName,
        deviceType: devices.deviceType,
      })
      .from(alerts)
      .leftJoin(devices, eq(alerts.deviceId, devices.id))
      .where(and(...conditions))
      .orderBy(desc(alerts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(and(...conditions));

    // Get unresolved count (for badge)
    const unresolvedConditions = [
      or(...deviceIds.map(id => eq(alerts.deviceId, id)))!,
      eq(alerts.resolved, false),
    ];

    const [unresolvedCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(and(...unresolvedConditions));

    return NextResponse.json({
      alerts: alertsWithDevices,
      total: Number(countResult?.count || 0),
      unresolvedCount: Number(unresolvedCountResult?.count || 0),
    });
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// Mark alert as resolved
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alertId, resolved } = body as { alertId: string; resolved: boolean };

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    // Verify alert belongs to user's device
    const [alert] = await db
      .select({
        id: alerts.id,
        deviceId: alerts.deviceId,
      })
      .from(alerts)
      .where(eq(alerts.id, alertId))
      .limit(1);

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Verify device belongs to user
    const [device] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(
        eq(devices.id, alert.deviceId),
        eq(devices.userId, session.userId)
      ))
      .limit(1);

    if (!device) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update alert
    await db
      .update(alerts)
      .set({ resolved: resolved ?? true })
      .where(eq(alerts.id, alertId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

// Resolve all alerts
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, deviceId } = body as { action: string; deviceId?: string };

    if (action === 'resolve_all') {
      // Get user's devices
      const userDevices = await db
        .select({ id: devices.id })
        .from(devices)
        .where(eq(devices.userId, session.userId));

      const deviceIds = userDevices.map(d => d.id);

      if (deviceIds.length === 0) {
        return NextResponse.json({ success: true, updated: 0 });
      }

      // Build conditions
      const conditions = [
        or(...deviceIds.map(id => eq(alerts.deviceId, id)))!,
        eq(alerts.resolved, false),
      ];

      if (deviceId && deviceIds.includes(deviceId)) {
        conditions.push(eq(alerts.deviceId, deviceId));
      }

      // Resolve all matching alerts
      const result = await db
        .update(alerts)
        .set({ resolved: true })
        .where(and(...conditions))
        .returning({ id: alerts.id });

      return NextResponse.json({ success: true, updated: result.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
