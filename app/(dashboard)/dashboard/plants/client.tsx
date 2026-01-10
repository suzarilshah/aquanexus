'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlantSensorCards } from '@/components/plants/sensor-cards';
import { PlantCharts, EnvironmentRadar, GrowthProgressRing } from '@/components/plants/charts';
import { RealTimeIndicator } from '@/components/dashboard/realtime-indicator';
import { DeviceSelector } from '@/components/dashboard/device-selector';
import { PeriodSelector, TimePeriod, getPeriodLabel } from '@/components/dashboard/period-selector';
import { Sparkline } from '@/components/charts/sparkline';
import {
  Leaf,
  Radio,
  Sprout,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Thermometer,
  Droplets,
  Gauge,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  selectedPeriod: TimePeriod;
}

// Calculate statistics from readings
function calculateStats(readings: Reading[]) {
  const validTemps = readings.map(r => r.temperature).filter((v): v is number => v !== null);
  const validHumidity = readings.map(r => r.humidity).filter((v): v is number => v !== null);
  const validPressure = readings.map(r => r.pressure).filter((v): v is number => v !== null);
  const validHeight = readings.map(r => r.height).filter((v): v is number => v !== null);

  const calcMinMaxAvg = (arr: number[]) => {
    if (arr.length === 0) return { min: null, max: null, avg: null };
    return {
      min: Math.min(...arr),
      max: Math.max(...arr),
      avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    };
  };

  return {
    temperature: calcMinMaxAvg(validTemps),
    humidity: calcMinMaxAvg(validHumidity),
    pressure: calcMinMaxAvg(validPressure.map(p => p / 100)), // Convert to hPa
    height: calcMinMaxAvg(validHeight),
    growthRate: validHeight.length >= 2 ? validHeight[0] - validHeight[validHeight.length - 1] : null,
  };
}

// Calculate environment health score
function calculateHealthScore(reading: Reading): number {
  const calculateScore = (value: number | null, optimal: number, min: number, max: number): number => {
    if (value === null) return 0;
    const distance = Math.abs(value - optimal);
    const maxDistance = Math.max(optimal - min, max - optimal);
    return Math.max(0, Math.min(100, 100 - (distance / maxDistance) * 100));
  };

  const scores = [
    calculateScore(reading.temperature, 25, 10, 40),
    calculateScore(reading.humidity, 60, 20, 95),
    calculateScore(reading.pressure ? reading.pressure / 100 : null, 1013, 950, 1050),
  ];

  const validScores = scores.filter(s => s > 0);
  return validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
}

export function PlantDashboardClient({
  device,
  readings,
  activeAlerts,
  allDevices,
  latestReading,
  selectedDeviceId,
  selectedPeriod,
}: PlantDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDeviceSelect = (deviceId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (deviceId) {
      params.set('device', deviceId);
    } else {
      params.delete('device');
    }
    router.push(`/dashboard/plants?${params.toString()}`);
  };

  const isVirtualDevice = device?.deviceMac?.startsWith('VIRTUAL:');

  // Calculate health score
  const healthScore = useMemo(() => calculateHealthScore(latestReading), [latestReading]);

  // Calculate statistics
  const stats = useMemo(() => calculateStats(readings), [readings]);

  // Get historical data for sparklines
  const historicalData = useMemo(() => ({
    height: readings.map(r => r.height).filter((v): v is number => v !== null).slice(0, 20),
    temperature: readings.map(r => r.temperature).filter((v): v is number => v !== null).slice(0, 20),
    humidity: readings.map(r => r.humidity).filter((v): v is number => v !== null).slice(0, 20),
  }), [readings]);

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
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodSelector selectedPeriod={selectedPeriod} />
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

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Environment Health Score */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-600">Environment Health</span>
                <Activity className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-3xl font-bold",
                  healthScore >= 80 ? "text-green-600" :
                  healthScore >= 60 ? "text-yellow-600" :
                  healthScore >= 40 ? "text-orange-600" : "text-red-600"
                )}>
                  {healthScore.toFixed(0)}
                </span>
                <span className="text-sm text-green-500">/ 100</span>
              </div>
              <div className="mt-2 h-1.5 bg-green-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-green-400 to-emerald-500"
                  style={{ width: `${healthScore}%` }}
                />
              </div>
            </div>

            {/* Reading Count */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-600">{getPeriodLabel(selectedPeriod).replace('Last ', '')} Readings</span>
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-700">{readings.length}</span>
                <span className="text-sm text-blue-500">samples</span>
              </div>
              {historicalData.height.length > 3 && (
                <div className="mt-2">
                  <Sparkline
                    data={historicalData.height.slice().reverse()}
                    width={80}
                    height={20}
                    color="#3b82f6"
                    showArea={true}
                    showDot={false}
                  />
                </div>
              )}
            </div>

            {/* Growth Rate */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-600">{getPeriodLabel(selectedPeriod).replace('Last ', '')} Growth</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-3xl font-bold",
                  stats.growthRate !== null && stats.growthRate > 0 ? "text-emerald-600" :
                  stats.growthRate !== null && stats.growthRate < 0 ? "text-red-600" : "text-gray-600"
                )}>
                  {stats.growthRate !== null ? (
                    <>
                      {stats.growthRate > 0 ? '+' : ''}{stats.growthRate.toFixed(2)}
                    </>
                  ) : '--'}
                </span>
                <span className="text-sm text-emerald-500">cm</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                {stats.growthRate !== null && stats.growthRate > 0 ? (
                  <>
                    <ArrowUp className="h-3 w-3" />
                    <span>Growing healthy</span>
                  </>
                ) : stats.growthRate !== null && stats.growthRate < 0 ? (
                  <>
                    <ArrowDown className="h-3 w-3 text-red-500" />
                    <span className="text-red-500">Check environment</span>
                  </>
                ) : (
                  <span className="text-gray-400">No growth data</span>
                )}
              </div>
            </div>

            {/* Active Alerts */}
            <div className={cn(
              "rounded-xl border p-4 shadow-sm",
              activeAlerts.length > 0
                ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
                : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-xs font-medium",
                  activeAlerts.length > 0 ? "text-amber-600" : "text-gray-600"
                )}>Active Alerts</span>
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  activeAlerts.length > 0 ? "text-amber-500" : "text-gray-400"
                )} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-3xl font-bold",
                  activeAlerts.length > 0 ? "text-amber-700" : "text-gray-700"
                )}>
                  {activeAlerts.length}
                </span>
                <span className={cn(
                  "text-sm",
                  activeAlerts.length > 0 ? "text-amber-500" : "text-gray-400"
                )}>
                  {activeAlerts.length === 1 ? 'alert' : 'alerts'}
                </span>
              </div>
              {activeAlerts.length > 0 ? (
                <p className="mt-2 text-xs text-amber-600 truncate">
                  {activeAlerts[0].message}
                </p>
              ) : (
                <p className="mt-2 text-xs text-gray-400">All systems normal</p>
              )}
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

          {/* Growth Progress & Environment Health Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Growth Progress Ring */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  Growth Progress
                </CardTitle>
                <CardDescription>Current height vs target</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-4">
                <GrowthProgressRing currentHeight={latestReading.height} targetHeight={50} />
              </CardContent>
            </Card>

            {/* Environment Radar */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  Environment Health
                </CardTitle>
                <CardDescription>Multi-metric health overview</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-4">
                <EnvironmentRadar
                  temperature={latestReading.temperature}
                  humidity={latestReading.humidity}
                  pressure={latestReading.pressure}
                />
              </CardContent>
            </Card>

            {/* Period Statistics */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  {getPeriodLabel(selectedPeriod).replace('Last ', '')} Statistics
                </CardTitle>
                <CardDescription>Min / Max / Average</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Temperature Stats */}
                <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700">Temp</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-blue-600">
                      <ArrowDown className="h-3 w-3 inline" />
                      {stats.temperature.min?.toFixed(1) ?? '--'}°
                    </span>
                    <span className="font-medium text-orange-600">
                      {stats.temperature.avg?.toFixed(1) ?? '--'}°
                    </span>
                    <span className="text-red-600">
                      <ArrowUp className="h-3 w-3 inline" />
                      {stats.temperature.max?.toFixed(1) ?? '--'}°
                    </span>
                  </div>
                </div>

                {/* Humidity Stats */}
                <div className="flex items-center justify-between p-2 bg-cyan-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm font-medium text-cyan-700">Humidity</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-blue-600">
                      <ArrowDown className="h-3 w-3 inline" />
                      {stats.humidity.min?.toFixed(0) ?? '--'}%
                    </span>
                    <span className="font-medium text-cyan-600">
                      {stats.humidity.avg?.toFixed(0) ?? '--'}%
                    </span>
                    <span className="text-red-600">
                      <ArrowUp className="h-3 w-3 inline" />
                      {stats.humidity.max?.toFixed(0) ?? '--'}%
                    </span>
                  </div>
                </div>

                {/* Pressure Stats */}
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-purple-700">Pressure</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-blue-600">
                      <ArrowDown className="h-3 w-3 inline" />
                      {stats.pressure.min?.toFixed(0) ?? '--'}
                    </span>
                    <span className="font-medium text-purple-600">
                      {stats.pressure.avg?.toFixed(0) ?? '--'}
                    </span>
                    <span className="text-red-600">
                      <ArrowUp className="h-3 w-3 inline" />
                      {stats.pressure.max?.toFixed(0) ?? '--'}
                    </span>
                  </div>
                </div>

                {/* Height Stats */}
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Height</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-blue-600">
                      <ArrowDown className="h-3 w-3 inline" />
                      {stats.height.min?.toFixed(1) ?? '--'}
                    </span>
                    <span className="font-medium text-green-600">
                      {stats.height.avg?.toFixed(1) ?? '--'}
                    </span>
                    <span className="text-red-600">
                      <ArrowUp className="h-3 w-3 inline" />
                      {stats.height.max?.toFixed(1) ?? '--'}cm
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sensor Cards with Sparklines */}
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-xl" />}>
            <PlantSensorCards
              height={latestReading.height}
              temperature={latestReading.temperature}
              humidity={latestReading.humidity}
              pressure={latestReading.pressure}
              historicalData={readings.slice(0, 24)}
            />
          </Suspense>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Growth Progress Chart */}
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-green-500" />
                  Growth Progress & Rate
                </CardTitle>
                <CardDescription>Plant height tracking with growth rate indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="growth" />
                </Suspense>
              </CardContent>
            </Card>

            {/* Environment Chart */}
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-orange-500" />
                  Environment Conditions
                </CardTitle>
                <CardDescription>Temperature and humidity combined view</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="environment" />
                </Suspense>
              </CardContent>
            </Card>

            {/* Temperature Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-orange-500" />
                  Temperature History
                </CardTitle>
                <CardDescription>{getPeriodLabel(selectedPeriod)} • Optimal: 18-32°C</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="temperature" />
                </Suspense>
              </CardContent>
            </Card>

            {/* Humidity Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-cyan-500" />
                  Humidity History
                </CardTitle>
                <CardDescription>{getPeriodLabel(selectedPeriod)} • Optimal: 40-80%</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <PlantCharts data={readings} metric="humidity" />
                </Suspense>
              </CardContent>
            </Card>

            {/* Pressure Chart */}
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-purple-500" />
                  Atmospheric Pressure
                </CardTitle>
                <CardDescription>Pressure readings in hPa • Normal: ~1013 hPa</CardDescription>
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
