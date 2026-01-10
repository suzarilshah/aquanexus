import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, fishReadings, alerts } from '@/lib/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FishSensorCards } from '@/components/fish/sensor-cards';
import { FishCharts } from '@/components/fish/charts';
import { RealTimeIndicator } from '@/components/dashboard/realtime-indicator';
import { FishDashboardClient } from './client';

async function getFishData(userId: string, selectedDeviceId?: string) {
  // Get all fish devices
  const fishDevices = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.userId, userId),
        eq(devices.deviceType, 'fish')
      )
    );

  if (fishDevices.length === 0) {
    return { device: null, readings: [], alerts: [], allDevices: [] };
  }

  // Use selected device or first device
  const device = selectedDeviceId
    ? fishDevices.find((d) => d.id === selectedDeviceId) || fishDevices[0]
    : fishDevices[0];

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get recent readings
  const readings = await db
    .select()
    .from(fishReadings)
    .where(
      and(
        eq(fishReadings.deviceId, device.id),
        gte(fishReadings.timestamp, twentyFourHoursAgo)
      )
    )
    .orderBy(desc(fishReadings.timestamp))
    .limit(100);

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
      temperature: r.temperature ? parseFloat(r.temperature) : null,
      ph: r.ph ? parseFloat(r.ph) : null,
      ecValue: r.ecValue ? parseFloat(r.ecValue) : null,
      turbidity: r.turbidity ? parseFloat(r.turbidity) : null,
      tds: r.tds ? parseFloat(r.tds) : null,
    })),
    alerts: activeAlerts,
    allDevices: fishDevices,
  };
}

export default async function FishEnvironmentPage({
  searchParams,
}: {
  searchParams: Promise<{ device?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const params = await searchParams;
  const { device, readings, alerts: activeAlerts, allDevices } = await getFishData(
    session.userId,
    params.device
  );

  // Get latest reading for current values
  const latestReading = readings[0] || {
    temperature: null,
    ph: null,
    ecValue: null,
    turbidity: null,
    tds: null,
  };

  return (
    <FishDashboardClient
      device={device}
      readings={readings}
      activeAlerts={activeAlerts}
      allDevices={allDevices}
      latestReading={latestReading}
      selectedDeviceId={params.device || null}
    />
  );
}
