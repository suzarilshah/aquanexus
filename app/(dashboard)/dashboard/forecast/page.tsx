import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, plantGrowth, plantReadings, fishReadings } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForecastClient } from './ForecastClient';

async function getDevicesAndData(userId: string) {
  // Get all user devices
  const userDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId));

  // Get initial data for the first device (if any)
  let initialHistoricalData: Array<{ timestamp: string; value: number }> = [];
  let selectedDevice = userDevices[0] || null;

  if (selectedDevice) {
    if (selectedDevice.deviceType === 'plant') {
      // Get growth data for height
      const growthData = await db
        .select()
        .from(plantGrowth)
        .where(eq(plantGrowth.deviceId, selectedDevice.id))
        .orderBy(desc(plantGrowth.measuredAt))
        .limit(168); // 7 days hourly

      if (growthData.length > 0) {
        initialHistoricalData = growthData
          .reverse()
          .map(r => ({
            timestamp: r.measuredAt.toISOString(),
            value: parseFloat(r.height),
          }));
      } else {
        // Fallback to plant readings temperature
        const plantData = await db
          .select()
          .from(plantReadings)
          .where(eq(plantReadings.deviceId, selectedDevice.id))
          .orderBy(desc(plantReadings.timestamp))
          .limit(168);

        initialHistoricalData = plantData
          .reverse()
          .filter(r => r.temperature !== null)
          .map(r => ({
            timestamp: r.timestamp.toISOString(),
            value: parseFloat(r.temperature!),
          }));
      }
    } else {
      // Fish device - get temperature data
      const fishData = await db
        .select()
        .from(fishReadings)
        .where(eq(fishReadings.deviceId, selectedDevice.id))
        .orderBy(desc(fishReadings.timestamp))
        .limit(168);

      initialHistoricalData = fishData
        .reverse()
        .filter(r => r.temperature !== null)
        .map(r => ({
          timestamp: r.timestamp.toISOString(),
          value: parseFloat(r.temperature!),
        }));
    }
  }

  return {
    devices: userDevices.map(d => ({
      id: d.id,
      name: d.deviceName,
      type: d.deviceType,
      status: d.status,
    })),
    initialHistoricalData,
    selectedDevice: selectedDevice ? {
      id: selectedDevice.id,
      name: selectedDevice.deviceName,
      type: selectedDevice.deviceType,
    } : null,
  };
}

export default async function ForecastPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const { devices, initialHistoricalData, selectedDevice } = await getDevicesAndData(session.userId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Environment Forecast</h1>
        <p className="mt-1 text-sm text-gray-500">
          LSTM-powered predictions for your aquaponics environment
        </p>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Devices Found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Register a device to start forecasting your aquaponics environment.
            </p>
            <a
              href="/dashboard/devices"
              className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Add Device
            </a>
          </CardContent>
        </Card>
      ) : (
        <Suspense fallback={<ForecastSkeleton />}>
          <ForecastClient
            devices={devices}
            initialHistoricalData={initialHistoricalData}
            initialDevice={selectedDevice}
          />
        </Suspense>
      )}
    </div>
  );
}

function ForecastSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-gray-100 rounded-lg w-full max-w-md" />
      <div className="h-80 bg-gray-100 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-100 rounded-lg" />
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
