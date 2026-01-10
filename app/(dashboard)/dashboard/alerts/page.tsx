import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { alerts, devices, streamingEventLogs, cronExecutionLogs, deviceStreamingSessions } from '@/lib/db/schema';
import { eq, desc, and, or, sql, gte } from 'drizzle-orm';
import { AlertsClient } from './alerts-client';

async function getAlertsData(userId: string) {
  // Get user's devices
  const userDevices = await db
    .select({
      id: devices.id,
      deviceName: devices.deviceName,
      deviceType: devices.deviceType,
    })
    .from(devices)
    .where(eq(devices.userId, userId));

  const deviceIds = userDevices.map(d => d.id);

  if (deviceIds.length === 0) {
    return {
      alerts: [],
      devices: [],
      streamingErrors: [],
      cronRuns: [],
      stats: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        unresolved: 0,
      },
    };
  }

  // Fetch alerts with device info
  const alertsData = await db
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
    .where(or(...deviceIds.map(id => eq(alerts.deviceId, id))))
    .orderBy(desc(alerts.createdAt))
    .limit(100);

  // Get alert statistics
  const stats = {
    total: alertsData.length,
    critical: alertsData.filter(a => a.severity === 'critical').length,
    high: alertsData.filter(a => a.severity === 'high').length,
    medium: alertsData.filter(a => a.severity === 'medium').length,
    low: alertsData.filter(a => a.severity === 'low').length,
    unresolved: alertsData.filter(a => !a.resolved).length,
  };

  // Get recent streaming errors (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let streamingErrors: {
    id: string;
    sessionId: string;
    eventType: string;
    eventDetails: unknown;
    createdAt: Date;
    deviceType: string | null;
  }[] = [];

  try {
    // Get sessions for user's devices
    const sessions = await db
      .select({
        id: deviceStreamingSessions.id,
        deviceType: deviceStreamingSessions.deviceType,
      })
      .from(deviceStreamingSessions)
      .innerJoin(
        devices,
        and(
          eq(deviceStreamingSessions.configId, devices.id),
          eq(devices.userId, userId)
        )
      );

    if (sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const errorLogs = await db
        .select({
          id: streamingEventLogs.id,
          sessionId: streamingEventLogs.sessionId,
          eventType: streamingEventLogs.eventType,
          eventDetails: streamingEventLogs.eventDetails,
          createdAt: streamingEventLogs.createdAt,
        })
        .from(streamingEventLogs)
        .where(
          and(
            or(...sessionIds.map(id => eq(streamingEventLogs.sessionId, id))),
            eq(streamingEventLogs.eventType, 'error_occurred'),
            gte(streamingEventLogs.createdAt, sevenDaysAgo)
          )
        )
        .orderBy(desc(streamingEventLogs.createdAt))
        .limit(20);

      streamingErrors = errorLogs.map(log => ({
        ...log,
        deviceType: sessions.find(s => s.id === log.sessionId)?.deviceType || null,
      }));
    }
  } catch (error) {
    console.error('Error fetching streaming errors:', error);
  }

  // Get recent cron runs
  let cronRuns: typeof cronExecutionLogs.$inferSelect[] = [];
  try {
    cronRuns = await db
      .select()
      .from(cronExecutionLogs)
      .orderBy(desc(cronExecutionLogs.startedAt))
      .limit(10);
  } catch (error) {
    console.error('Error fetching cron runs:', error);
  }

  return {
    alerts: alertsData,
    devices: userDevices,
    streamingErrors,
    cronRuns,
    stats,
  };
}

export default async function AlertsPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const data = await getAlertsData(session.userId);

  return <AlertsClient initialData={data} />;
}
