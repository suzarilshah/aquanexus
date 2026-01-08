import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, plantReadings, alerts } from '@/lib/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlantSensorCards } from '@/components/plants/sensor-cards';
import { PlantCharts } from '@/components/plants/charts';
import { RealTimeIndicator } from '@/components/dashboard/realtime-indicator';

async function getPlantData(userId: string) {
  // Get plant devices
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
    return { device: null, readings: [], alerts: [] };
  }

  const device = plantDevices[0];
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get recent readings
  const readings = await db
    .select()
    .from(plantReadings)
    .where(
      and(
        eq(plantReadings.deviceId, device.id),
        gte(plantReadings.timestamp, twentyFourHoursAgo)
      )
    )
    .orderBy(desc(plantReadings.timestamp))
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
      soilMoisture: r.soilMoisture ? parseFloat(r.soilMoisture) : null,
      lightLevel: r.lightLevel ? parseFloat(r.lightLevel) : null,
      temperature: r.temperature ? parseFloat(r.temperature) : null,
      humidity: r.humidity ? parseFloat(r.humidity) : null,
    })),
    alerts: activeAlerts,
  };
}

export default async function PlantEnvironmentPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const { device, readings, alerts: activeAlerts } = await getPlantData(session.userId);

  // Get latest reading for current values
  const latestReading = readings[0] || {
    soilMoisture: null,
    lightLevel: null,
    temperature: null,
    humidity: null,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plant Environment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time monitoring of your growing environment
          </p>
        </div>
        <RealTimeIndicator />
      </div>

      {!device ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Plant Monitor Registered</h3>
            <p className="mt-2 text-sm text-gray-500">
              Register an ESP32 device to start monitoring your plant environment.
            </p>
            <a
              href="/dashboard/devices"
              className="mt-4 inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
            >
              Add Plant Monitor
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Device Info */}
          <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">{device.deviceName}</p>
                <p className="text-sm text-gray-500">{device.deviceMac}</p>
              </div>
            </div>
            <div className={`flex items-center space-x-2 rounded-full px-3 py-1 text-sm ${
              device.status === 'online'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                device.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'
              }`} />
              <span className="font-medium capitalize">{device.status}</span>
            </div>
          </div>

          {/* Alerts Banner */}
          {activeAlerts.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-amber-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-amber-800">
                  {activeAlerts.length} active alert{activeAlerts.length > 1 ? 's' : ''} require attention
                </span>
              </div>
            </div>
          )}

          {/* Sensor Cards */}
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-lg" />}>
            <PlantSensorCards
              soilMoisture={latestReading.soilMoisture}
              lightLevel={latestReading.lightLevel}
              temperature={latestReading.temperature}
              humidity={latestReading.humidity}
            />
          </Suspense>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Soil Moisture History</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="soilMoisture" />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Light Level History</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="lightLevel" />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Temperature History</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="temperature" />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Humidity History</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="humidity" />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
