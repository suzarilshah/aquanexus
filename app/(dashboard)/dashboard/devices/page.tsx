import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, fishReadings, plantReadings } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceList } from '@/components/devices/device-list';
import { RegisterDeviceButton } from '@/components/devices/register-device-button';

async function getDevicesData(userId: string) {
  const userDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId))
    .orderBy(desc(devices.createdAt));

  // Get reading counts for each device
  const devicesWithStats = await Promise.all(
    userDevices.map(async (device) => {
      let readingCount = 0;

      if (device.deviceType === 'fish') {
        const result = await db
          .select({ count: count() })
          .from(fishReadings)
          .where(eq(fishReadings.deviceId, device.id));
        readingCount = result[0]?.count || 0;
      } else {
        const result = await db
          .select({ count: count() })
          .from(plantReadings)
          .where(eq(plantReadings.deviceId, device.id));
        readingCount = result[0]?.count || 0;
      }

      return {
        ...device,
        readingCount,
      };
    })
  );

  return devicesWithStats;
}

export default async function DevicesPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const devicesData = await getDevicesData(session.userId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your IoT devices and monitor their status
          </p>
        </div>
        <RegisterDeviceButton />
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Devices</CardDescription>
            <CardTitle className="text-3xl">{devicesData.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Online</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">
              {devicesData.filter((d) => d.status === 'online').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Offline</CardDescription>
            <CardTitle className="text-3xl text-gray-400">
              {devicesData.filter((d) => d.status === 'offline').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Device list */}
      {devicesData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Devices Registered</h3>
            <p className="mt-2 text-sm text-gray-500">
              Register your first ESP32 device to start monitoring your aquaponics system.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-lg" />}>
          <DeviceList devices={devicesData} />
        </Suspense>
      )}
    </div>
  );
}
