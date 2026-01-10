import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, virtualDeviceConfig, deviceStreamingSessions } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StreamingControlPanel } from '@/components/simulator/streaming-control-panel';
import { StreamingLogsViewer } from '@/components/simulator/streaming-logs-viewer';
import { Cpu, Info, Fish, Leaf, ExternalLink, Database, Clock, Activity } from 'lucide-react';
import Link from 'next/link';
import { getDatasetSummary } from '@/lib/virtual-device/csv-parser';
import { getSessionEvents, getRecentCronRuns } from '@/lib/virtual-device/logging-service';
import { calculateProgress, formatDuration } from '@/lib/virtual-device/timing-calculator';

async function getSimulatorData(userId: string) {
  // Get user's virtual device config
  const [config] = await db
    .select()
    .from(virtualDeviceConfig)
    .where(eq(virtualDeviceConfig.userId, userId))
    .limit(1);

  if (!config) {
    return {
      isConfigured: false,
      isEnabled: false,
      fishDevice: null,
      plantDevice: null,
      fishSession: null,
      plantSession: null,
      fishDataset: getDatasetSummary('fish'),
      plantDataset: getDatasetSummary('plant'),
      fishEvents: [],
      plantEvents: [],
      recentCronRuns: [],
    };
  }

  // Get device details
  let fishDevice = null;
  let plantDevice = null;

  if (config.fishDeviceId) {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, config.fishDeviceId))
      .limit(1);
    fishDevice = device ? { id: device.id, name: device.deviceName, mac: device.deviceMac } : null;
  }

  if (config.plantDeviceId) {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, config.plantDeviceId))
      .limit(1);
    plantDevice = device ? { id: device.id, name: device.deviceName, mac: device.deviceMac } : null;
  }

  // Get active sessions
  let fishSession = null;
  let plantSession = null;

  if (config.fishSessionId) {
    const [session] = await db
      .select()
      .from(deviceStreamingSessions)
      .where(eq(deviceStreamingSessions.id, config.fishSessionId))
      .limit(1);

    if (session) {
      const progress = calculateProgress(session);
      fishSession = {
        ...session,
        progress: {
          ...progress,
          timeRemainingFormatted: formatDuration(progress.timeRemainingMs),
          lastDataSentAgo: session.lastDataSentAt
            ? getTimeAgo(new Date(session.lastDataSentAt))
            : null,
        },
      };
    }
  }

  if (config.plantSessionId) {
    const [session] = await db
      .select()
      .from(deviceStreamingSessions)
      .where(eq(deviceStreamingSessions.id, config.plantSessionId))
      .limit(1);

    if (session) {
      const progress = calculateProgress(session);
      plantSession = {
        ...session,
        progress: {
          ...progress,
          timeRemainingFormatted: formatDuration(progress.timeRemainingMs),
          lastDataSentAgo: session.lastDataSentAt
            ? getTimeAgo(new Date(session.lastDataSentAt))
            : null,
        },
      };
    }
  }

  // Get recent events
  let fishEvents: Awaited<ReturnType<typeof getSessionEvents>>['events'] = [];
  let plantEvents: Awaited<ReturnType<typeof getSessionEvents>>['events'] = [];

  if (config.fishSessionId) {
    const { events } = await getSessionEvents(config.fishSessionId, { limit: 10 });
    fishEvents = events;
  }

  if (config.plantSessionId) {
    const { events } = await getSessionEvents(config.plantSessionId, { limit: 10 });
    plantEvents = events;
  }

  // Get recent cron runs
  const recentCronRuns = await getRecentCronRuns(10);

  return {
    isConfigured: true,
    isEnabled: config.enabled,
    fishDevice,
    plantDevice,
    fishSession,
    plantSession,
    fishDataset: getDatasetSummary('fish'),
    plantDataset: getDatasetSummary('plant'),
    fishEvents,
    plantEvents,
    recentCronRuns,
  };
}

function getTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export default async function SimulatorPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const data = await getSimulatorData(session.userId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Virtual ESP32 Streaming</h1>
          <p className="mt-1 text-sm text-gray-500">
            Control server-side data streaming with 1:1 real-time dataset timing
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                This control panel manages <strong>server-side streaming</strong> that persists even when your browser is closed.
                Data is streamed according to the actual timestamps in the CSV dataset (1:1 real-time).
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Database className="h-3.5 w-3.5" />
                  <span>{data.fishDataset.totalRows} fish readings</span>
                </div>
                <div className="flex items-center gap-1">
                  <Database className="h-3.5 w-3.5" />
                  <span>{data.plantDataset.totalRows} plant readings</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>~{data.fishDataset.durationDays} days total duration</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/dashboard/fish"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Fish className="h-4 w-4" />
                  View Fish Dashboard
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <Link
                  href="/dashboard/plants"
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                >
                  <Leaf className="h-4 w-4" />
                  View Plant Dashboard
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streaming Control Panel */}
      <StreamingControlPanel
        fishSession={data.fishSession as any}
        plantSession={data.plantSession as any}
        fishDevice={data.fishDevice}
        plantDevice={data.plantDevice}
        fishDataset={data.fishDataset}
        plantDataset={data.plantDataset}
        isConfigured={data.isConfigured}
        isEnabled={data.isEnabled}
      />

      {/* Streaming Logs */}
      <StreamingLogsViewer
        fishSessionId={data.fishSession?.id}
        plantSessionId={data.plantSession?.id}
        initialFishEvents={data.fishEvents as any[]}
        initialPlantEvents={data.plantEvents as any[]}
        recentCronRuns={data.recentCronRuns as any[]}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-500" />
              Configure Virtual Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              Enable or disable virtual devices and configure streaming settings.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
            >
              Go to Settings
              <ExternalLink className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              View All Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              See all registered devices including virtual ESP32 devices.
            </p>
            <Link
              href="/dashboard/devices"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              View Devices
              <ExternalLink className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              Training Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              CSV datasets with real aquaponics sensor readings.
            </p>
            <div className="text-xs text-gray-600">
              <p>Fish: {data.fishDataset.firstTimestamp.split('T')[0]} to {data.fishDataset.lastTimestamp.split('T')[0]}</p>
              <p>Plant: {data.plantDataset.firstTimestamp.split('T')[0]} to {data.plantDataset.lastTimestamp.split('T')[0]}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
