import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, fishReadings, plantReadings } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { DeviceList } from '@/components/devices/device-list';
import { RegisterDeviceButton } from '@/components/devices/register-device-button';
import {
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  Activity,
  Radio,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

async function getDevicesData(userId: string) {
  const userDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId))
    .orderBy(desc(devices.createdAt));

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

  const totalDevices = devicesData.length;
  const onlineDevices = devicesData.filter((d) => d.status === 'online').length;
  const offlineDevices = devicesData.filter((d) => d.status === 'offline').length;
  const warningDevices = devicesData.filter((d) => d.status === 'warning').length;
  const virtualDevices = devicesData.filter((d) => d.deviceMac.startsWith('VIRTUAL:')).length;
  const totalReadings = devicesData.reduce((sum, d) => sum + d.readingCount, 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Device Fleet
          </h1>
          <p className="text-gray-500">
            Monitor and manage your aquaponics sensor network
          </p>
        </div>
        <RegisterDeviceButton />
      </div>

      {/* Stats Overview - Premium Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Devices */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total</span>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold text-white tabular-nums">{totalDevices}</p>
              <p className="text-sm text-gray-400">Registered devices</p>
            </div>
          </div>
        </div>

        {/* Online Devices */}
        <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 transition-all duration-300 hover:shadow-xl hover:border-emerald-100">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-100">
                <Wifi className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Live</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold text-gray-900 tabular-nums">{onlineDevices}</p>
              <p className="text-sm text-gray-500">Online & reporting</p>
            </div>
          </div>
        </div>

        {/* Offline Devices */}
        <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 transition-all duration-300 hover:shadow-xl hover:border-gray-200">
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gray-100">
                <WifiOff className="h-5 w-5 text-gray-500" />
              </div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Idle</span>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold text-gray-900 tabular-nums">{offlineDevices}</p>
              <p className="text-sm text-gray-500">Currently offline</p>
            </div>
          </div>
        </div>

        {/* Virtual Devices */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-400/20 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-400/20 via-transparent to-transparent" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm">
                <Radio className="h-5 w-5 text-purple-300" />
              </div>
              <span className="text-xs font-medium text-purple-300 uppercase tracking-wider">Simulated</span>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold text-white tabular-nums">{virtualDevices}</p>
              <p className="text-sm text-purple-300">Virtual devices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      {totalDevices > 0 && (
        <div className="flex flex-wrap items-center gap-6 p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-100">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{totalReadings.toLocaleString()}</span> total readings
            </span>
          </div>
          {warningDevices > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-amber-600">{warningDevices}</span> need attention
              </span>
            </div>
          )}
          {virtualDevices > 0 && (
            <Link
              href="/dashboard/simulator"
              className="ml-auto flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>Manage Virtual Streaming</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Device List */}
      {devicesData.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-50 via-white to-gray-50 border border-gray-100 p-12 text-center">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-100/50 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6 shadow-lg shadow-blue-100">
              <Cpu className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Devices Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Register your first ESP32 device to start monitoring your aquaponics system with real-time sensor data.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <RegisterDeviceButton />
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-200 text-purple-700 font-medium hover:bg-purple-50 transition-colors"
              >
                <Radio className="h-4 w-4" />
                Enable Virtual Devices
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          }
        >
          <DeviceList devices={devicesData} />
        </Suspense>
      )}
    </div>
  );
}
