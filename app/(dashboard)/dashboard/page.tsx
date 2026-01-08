import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, fishReadings, plantReadings, alerts } from '@/lib/db/schema';
import { eq, desc, and, gte, count } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStats } from '@/components/dashboard/stats';
import { DeviceList } from '@/components/dashboard/device-list';
import { RecentAlerts } from '@/components/dashboard/recent-alerts';
import { RealTimeIndicator } from '@/components/dashboard/realtime-indicator';

async function getStats(userId: string) {
  const userDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId));

  const onlineDevices = userDevices.filter((d) => d.status === 'online').length;

  const unresolvedAlerts = await db
    .select({ count: count() })
    .from(alerts)
    .where(
      and(
        eq(alerts.resolved, false),
        // Filter to only this user's devices
      )
    );

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get data points count (simplified)
  const fishDataCount = await db
    .select({ count: count() })
    .from(fishReadings)
    .where(gte(fishReadings.timestamp, twentyFourHoursAgo));

  const plantDataCount = await db
    .select({ count: count() })
    .from(plantReadings)
    .where(gte(plantReadings.timestamp, twentyFourHoursAgo));

  return {
    totalDevices: userDevices.length,
    onlineDevices,
    alertCount: unresolvedAlerts[0]?.count || 0,
    dataPoints: (fishDataCount[0]?.count || 0) + (plantDataCount[0]?.count || 0),
    devices: userDevices,
  };
}

async function getRecentAlerts(userId: string) {
  // Get user's device IDs first
  const userDevices = await db
    .select({ id: devices.id })
    .from(devices)
    .where(eq(devices.userId, userId));

  const deviceIds = userDevices.map((d) => d.id);

  if (deviceIds.length === 0) return [];

  const recentAlerts = await db
    .select()
    .from(alerts)
    .orderBy(desc(alerts.createdAt))
    .limit(5);

  return recentAlerts;
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const stats = await getStats(session.userId);
  const recentAlerts = await getRecentAlerts(session.userId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time overview of your aquaponics systems
          </p>
        </div>
        <RealTimeIndicator />
      </div>

      {/* Stats cards */}
      <Suspense fallback={<div className="h-32 animate-pulse bg-gray-100 rounded-lg" />}>
        <DashboardStats
          totalDevices={stats.totalDevices}
          onlineDevices={stats.onlineDevices}
          alertCount={Number(stats.alertCount)}
          dataPoints={Number(stats.dataPoints)}
        />
      </Suspense>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Device list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Active Devices</CardTitle>
            <CardDescription>Your registered monitoring devices</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded" />}>
              <DeviceList devices={stats.devices} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Recent alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recent Alerts</CardTitle>
            <CardDescription>Latest system notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded" />}>
              <RecentAlerts alerts={recentAlerts} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <a
              href="/dashboard/devices"
              className="flex flex-col items-center justify-center rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Add Device</span>
            </a>
            <a
              href="/dashboard/fish"
              className="flex flex-col items-center justify-center rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 mb-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Fish Monitor</span>
            </a>
            <a
              href="/dashboard/plants"
              className="flex flex-col items-center justify-center rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 mb-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Plant Monitor</span>
            </a>
            <a
              href="/dashboard/ai"
              className="flex flex-col items-center justify-center rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 mb-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">AI Analysis</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
