'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlantSensorCards } from '@/components/plants/sensor-cards';
import { PlantCharts } from '@/components/plants/charts';
import { RealTimeIndicator } from '@/components/dashboard/realtime-indicator';
import { DeviceSelector } from '@/components/dashboard/device-selector';
import { Leaf, Radio, Sprout } from 'lucide-react';

interface Device {
  id: string;
  deviceName: string;
  deviceMac: string;
  status: string;
}

interface Alert {
  id: string;
  alertType: string;
  severity: string;
  message: string;
}

interface Reading {
  timestamp: string;
  height: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
}

interface PlantDashboardClientProps {
  device: Device | null;
  readings: Reading[];
  activeAlerts: Alert[];
  allDevices: Device[];
  latestReading: Reading;
  selectedDeviceId: string | null;
}

export function PlantDashboardClient({
  device,
  readings,
  activeAlerts,
  allDevices,
  latestReading,
  selectedDeviceId,
}: PlantDashboardClientProps) {
  const router = useRouter();

  const handleDeviceSelect = (deviceId: string | null) => {
    if (deviceId) {
      router.push(`/dashboard/plants?device=${deviceId}`);
    } else {
      router.push('/dashboard/plants');
    }
  };

  const isVirtualDevice = device?.deviceMac?.startsWith('VIRTUAL:');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Leaf className="h-7 w-7 text-green-500" />
            Plant Environment
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time monitoring of your growing environment
          </p>
        </div>
        <div className="flex items-center gap-4">
          {allDevices.length > 0 && (
            <DeviceSelector
              devices={allDevices.map((d) => ({
                id: d.id,
                name: d.deviceName,
                mac: d.deviceMac,
                status: d.status,
              }))}
              selectedId={selectedDeviceId}
              onSelect={handleDeviceSelect}
              deviceType="plant"
            />
          )}
          <RealTimeIndicator />
        </div>
      </div>

      {!device ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4">
              <Sprout className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No Plant Monitor Registered</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Register an ESP32 device or enable the virtual simulator to start monitoring your plant environment.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <a
                href="/dashboard/devices"
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
              >
                Add Plant Monitor
              </a>
              <a
                href="/dashboard/settings"
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Radio className="h-4 w-4 mr-2" />
                Enable Virtual Device
              </a>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Device Info */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-emerald-100">
                {isVirtualDevice ? (
                  <Radio className="h-6 w-6 text-purple-600" />
                ) : (
                  <Leaf className="h-6 w-6 text-green-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{device.deviceName}</p>
                  {isVirtualDevice && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                      Virtual
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-mono">{device.deviceMac}</p>
              </div>
            </div>
            <div className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-sm font-medium ${
              device.status === 'online'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                device.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className="capitalize">{device.status}</span>
            </div>
          </div>

          {/* Alerts Banner */}
          {activeAlerts.length > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-amber-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-amber-800">
                  {activeAlerts.length} active alert{activeAlerts.length > 1 ? 's' : ''} require attention
                </span>
              </div>
            </div>
          )}

          {/* Sensor Cards */}
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-xl" />}>
            <PlantSensorCards
              height={latestReading.height}
              temperature={latestReading.temperature}
              humidity={latestReading.humidity}
              pressure={latestReading.pressure}
            />
          </Suspense>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-green-500" />
                  Plant Height History
                </CardTitle>
                <CardDescription>Growth tracking over last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="height" />
                </Suspense>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
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

            <Card className="shadow-sm">
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

            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Atmospheric Pressure</CardTitle>
                <CardDescription>Pressure readings in hPa</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="pressure" />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
