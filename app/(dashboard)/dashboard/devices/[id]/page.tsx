import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, fishReadings, plantReadings, alerts } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceSettings } from '@/components/devices/device-settings';
import { DeviceHealthcheck } from '@/components/devices/device-healthcheck';
import Link from 'next/link';
import { ChevronLeft, Fish, Leaf, Activity, AlertTriangle, Clock, Cpu } from 'lucide-react';
import { formatReadingInterval } from '@/lib/utils/device-intervals';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getDeviceData(deviceId: string, userId: string) {
  const device = await db
    .select()
    .from(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)))
    .limit(1);

  if (device.length === 0) {
    return null;
  }

  // Get reading count
  let readingCount = 0;
  if (device[0].deviceType === 'fish') {
    const result = await db
      .select({ count: count() })
      .from(fishReadings)
      .where(eq(fishReadings.deviceId, deviceId));
    readingCount = result[0]?.count || 0;
  } else {
    const result = await db
      .select({ count: count() })
      .from(plantReadings)
      .where(eq(plantReadings.deviceId, deviceId));
    readingCount = result[0]?.count || 0;
  }

  // Get alert count
  const alertResult = await db
    .select({ count: count() })
    .from(alerts)
    .where(and(eq(alerts.deviceId, deviceId), eq(alerts.resolved, false)));
  const alertCount = alertResult[0]?.count || 0;

  // Get recent alerts
  const recentAlerts = await db
    .select()
    .from(alerts)
    .where(eq(alerts.deviceId, deviceId))
    .orderBy(desc(alerts.createdAt))
    .limit(5);

  return {
    device: device[0],
    stats: {
      readingCount,
      alertCount,
    },
    recentAlerts,
  };
}

export default async function DeviceDetailPage({ params }: PageProps) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    return null;
  }

  const data = await getDeviceData(id, session.userId);

  if (!data) {
    notFound();
  }

  const { device, stats, recentAlerts } = data;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/devices"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to Devices
      </Link>

      {/* Device Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xl ${
              device.deviceType === 'fish' ? 'bg-blue-100' : 'bg-green-100'
            }`}
          >
            {device.deviceType === 'fish' ? (
              <Fish className="h-7 w-7 text-blue-600" />
            ) : (
              <Leaf className="h-7 w-7 text-green-600" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{device.deviceName}</h1>
            <p className="text-sm text-gray-500 font-mono">{device.deviceMac}</p>
          </div>
        </div>
        <div
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            device.status === 'online'
              ? 'bg-emerald-50 text-emerald-700'
              : device.status === 'warning'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <span
            className={`mr-2 h-2 w-2 rounded-full ${
              device.status === 'online'
                ? 'bg-emerald-500'
                : device.status === 'warning'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-gray-400'
            }`}
          />
          {device.status}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Activity className="mr-2 h-4 w-4" />
              Total Readings
            </CardDescription>
            <CardTitle className="text-2xl">{stats.readingCount.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Active Alerts
            </CardDescription>
            <CardTitle className={`text-2xl ${stats.alertCount > 0 ? 'text-amber-600' : ''}`}>
              {stats.alertCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Reading Interval
            </CardDescription>
            <CardTitle className="text-2xl">{formatReadingInterval(device.readingInterval)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Cpu className="mr-2 h-4 w-4" />
              Device Type
            </CardDescription>
            <CardTitle className="text-2xl capitalize">{device.deviceType}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Device Healthcheck */}
      <DeviceHealthcheck deviceId={device.id} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Device Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Device Settings</CardTitle>
            <CardDescription>Configure device behavior and thresholds</CardDescription>
          </CardHeader>
          <CardContent>
            <DeviceSettings
              deviceId={device.id}
              deviceName={device.deviceName}
              deviceMac={device.deviceMac}
              readingInterval={device.readingInterval}
            />
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Latest alerts from this device</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No alerts recorded</p>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg ${
                      alert.severity === 'critical'
                        ? 'bg-red-50'
                        : alert.severity === 'high'
                        ? 'bg-amber-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 mt-0.5 ${
                        alert.severity === 'critical'
                          ? 'text-red-500'
                          : alert.severity === 'high'
                          ? 'text-amber-500'
                          : 'text-gray-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(alert.createdAt)} • {alert.resolved ? 'Resolved' : 'Active'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link
              href={device.deviceType === 'fish' ? '/dashboard/fish' : '/dashboard/plants'}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              View Dashboard
            </Link>
            <Link
              href="/dashboard/ai"
              className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Run AI Analysis
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
