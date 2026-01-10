import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, plantReadings, alerts } from '@/lib/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlantSensorCards } from '@/components/plants/sensor-cards';
import { PlantCharts } from '@/components/plants/charts';
import { RealTimeIndicator } from '@/components/dashboard/realtime-indicator';
import { PlantDashboardClient } from './client';
import { TimePeriod, getPeriodMilliseconds, getPeriodReadingLimit } from '@/lib/utils/period';

async function getPlantData(userId: string, selectedDeviceId?: string, period: TimePeriod = '1d') {
  // Get all plant devices
  const plantDevices = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.userId, userId),
        eq(devices.deviceType, 'plant')
      )
    );

  if (plantDevices.length === 0) {
    return { device: null, readings: [], alerts: [], allDevices: [] };
  }

  // Use selected device or first device
  const device = selectedDeviceId
    ? plantDevices.find((d) => d.id === selectedDeviceId) || plantDevices[0]
    : plantDevices[0];

  // Calculate time range based on period
  const periodMs = getPeriodMilliseconds(period);
  const cutoffDate = new Date(Date.now() - periodMs);
  const readingLimit = getPeriodReadingLimit(period);

  // Get recent readings
  const readings = await db
    .select()
    .from(plantReadings)
    .where(
      and(
        eq(plantReadings.deviceId, device.id),
        gte(plantReadings.timestamp, cutoffDate)
      )
    )
    .orderBy(desc(plantReadings.timestamp))
    .limit(readingLimit);

  // Get active alerts
  const activeAlerts = await db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.deviceId, device.id),
        eq(alerts.resolved, false)
      )
    )
    .orderBy(desc(alerts.createdAt))
    .limit(10);

  return {
    device,
    readings: readings.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      height: r.height ? parseFloat(r.height) : null,
      temperature: r.temperature ? parseFloat(r.temperature) : null,
      humidity: r.humidity ? parseFloat(r.humidity) : null,
      pressure: r.pressure ? parseFloat(r.pressure) : null,
    })),
    alerts: activeAlerts,
    allDevices: plantDevices,
  };
}

export default async function PlantEnvironmentPage({
  searchParams,
}: {
  searchParams: Promise<{ device?: string; period?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const params = await searchParams;
  const period = (params.period as TimePeriod) || '1d';

  const { device, readings, alerts: activeAlerts, allDevices } = await getPlantData(
    session.userId,
    params.device,
    period
  );

  // Get latest reading for current values
  const latestReading = readings[0] || {
    height: null,
    temperature: null,
    humidity: null,
    pressure: null,
  };

  return (
    <PlantDashboardClient
      device={device}
      readings={readings}
      activeAlerts={activeAlerts}
      allDevices={allDevices}
      latestReading={latestReading}
      selectedDeviceId={params.device || null}
      selectedPeriod={period}
    />
  );
}
