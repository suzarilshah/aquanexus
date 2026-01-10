'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FishSensorCards } from '@/components/fish/sensor-cards';
import { FishCharts, WaterQualityRadar } from '@/components/fish/charts';
import { RealTimeIndicator } from '@/components/dashboard/realtime-indicator';
import { DeviceSelector } from '@/components/dashboard/device-selector';
import { PeriodSelector, PeriodInfo, TimePeriod, getPeriodLabel } from '@/components/dashboard/period-selector';
import { RadialGauge } from '@/components/charts/radial-gauge';
import { Fish, Radio, Droplets, Thermometer, Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, BarChart3 } from 'lucide-react';

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
  temperature: number | null;
  ph: number | null;
  ecValue: number | null;
  turbidity: number | null;
  tds: number | null;
}

interface FishDashboardClientProps {
  device: Device | null;
  readings: Reading[];
  activeAlerts: Alert[];
  allDevices: Device[];
  latestReading: Reading;
  selectedDeviceId: string | null;
  selectedPeriod: TimePeriod;
}

// Calculate statistics from readings
function calculateStats(readings: Reading[], key: keyof Omit<Reading, 'timestamp'>) {
  const values = readings.map(r => r[key]).filter((v): v is number => v !== null);
  if (values.length === 0) return { min: null, max: null, avg: null, trend: 'neutral' as const };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Calculate trend
  const halfIndex = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, halfIndex);
  const secondHalf = values.slice(halfIndex);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
  const trend = secondAvg > firstAvg * 1.02 ? 'up' : secondAvg < firstAvg * 0.98 ? 'down' : 'neutral';

  return { min, max, avg, trend };
}

export function FishDashboardClient({
  device,
  readings,
  activeAlerts,
  allDevices,
  latestReading,
  selectedDeviceId,
  selectedPeriod,
}: FishDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDeviceSelect = (deviceId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (deviceId) {
      params.set('device', deviceId);
    } else {
      params.delete('device');
    }
    router.push(`/dashboard/fish?${params.toString()}`);
  };

  const isVirtualDevice = device?.deviceMac?.startsWith('VIRTUAL:');

  // Calculate statistics for all metrics
  const stats = useMemo(() => ({
    temperature: calculateStats(readings, 'temperature'),
    ph: calculateStats(readings, 'ph'),
    ecValue: calculateStats(readings, 'ecValue'),
    turbidity: calculateStats(readings, 'turbidity'),
    tds: calculateStats(readings, 'tds'),
  }), [readings]);

  // Calculate overall water quality score
  const waterQualityScore = useMemo(() => {
    const calculateScore = (value: number | null, optimal: number, min: number, max: number): number => {
      if (value === null) return 0;
      const distance = Math.abs(value - optimal);
      const maxDistance = Math.max(optimal - min, max - optimal);
      return Math.max(0, Math.min(100, 100 - (distance / maxDistance) * 100));
    };

    const scores = [
      calculateScore(latestReading.temperature, 25, 18, 32),
      calculateScore(latestReading.ph, 7.2, 5, 10),
      calculateScore(latestReading.ecValue, 400, 0, 1000),
      calculateScore(latestReading.turbidity, 5, 0, 50),
      calculateScore(latestReading.tds, 250, 0, 600),
    ];

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [latestReading]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
              <Fish className="h-6 w-6 text-white" />
            </div>
            Fish Environment
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time water quality monitoring for your aquatic environment
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
              deviceType="fish"
            />
          )}
          <RealTimeIndicator />
        </div>
      </div>

      {!device ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-6">
              <Fish className="h-10 w-10 text-cyan-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">No Fish Monitor Registered</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Register an ESP32 device or enable the virtual simulator to start monitoring your fish environment.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <a
                href="/dashboard/devices"
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
              >
                Add Fish Monitor
              </a>
              <a
                href="/dashboard/settings"
                className="inline-flex items-center rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Radio className="h-4 w-4 mr-2 text-purple-500" />
                Enable Virtual Device
              </a>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Device Info Bar */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isVirtualDevice ? 'bg-gradient-to-br from-purple-100 to-indigo-100' : 'bg-gradient-to-br from-cyan-100 to-blue-100'}`}>
                {isVirtualDevice ? (
                  <Radio className="h-7 w-7 text-purple-600" />
                ) : (
                  <Fish className="h-7 w-7 text-cyan-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-lg">{device.deviceName}</p>
                  {isVirtualDevice && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2.5 py-1 rounded-full font-semibold">
                      Virtual
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-mono">{device.deviceMac}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Last Reading</p>
                <p className="text-sm font-medium text-gray-600" suppressHydrationWarning>
                  {readings[0]?.timestamp
                    ? new Date(readings[0].timestamp).toLocaleTimeString()
                    : 'No data'}
                </p>
              </div>
              <div className={`flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium ${
                device.status === 'online'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
              }`}>
                <span className={`h-2.5 w-2.5 rounded-full ${
                  device.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="capitalize">{device.status}</span>
              </div>
            </div>
          </div>

          {/* Alerts Banner */}
          {activeAlerts.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-3" />
                <span className="text-sm font-medium text-amber-800">
                  {activeAlerts.length} active alert{activeAlerts.length > 1 ? 's' : ''} require attention
                </span>
              </div>
            </div>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Water Quality Score */}
            <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Water Quality</p>
                    <p className={`text-3xl font-bold ${getScoreColor(waterQualityScore)}`}>
                      {waterQualityScore.toFixed(0)}
                    </p>
                    <p className={`text-xs font-medium ${getScoreColor(waterQualityScore)}`}>
                      {getScoreLabel(waterQualityScore)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-white/80 flex items-center justify-center">
                    {waterQualityScore >= 70 ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-amber-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reading Count */}
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Readings ({getPeriodLabel(selectedPeriod).replace('Last ', '')})</p>
                    <p className="text-3xl font-bold text-gray-900">{readings.length}</p>
                    <p className="text-xs text-gray-400">data points</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card className={activeAlerts.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white'}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Active Alerts</p>
                    <p className={`text-3xl font-bold ${activeAlerts.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {activeAlerts.length}
                    </p>
                    <p className="text-xs text-gray-400">needs attention</p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${activeAlerts.length > 0 ? 'bg-amber-100' : 'bg-gray-50'}`}>
                    <AlertTriangle className={`h-6 w-6 ${activeAlerts.length > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Uptime */}
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Device Status</p>
                    <p className={`text-3xl font-bold ${device.status === 'online' ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {device.status === 'online' ? 'Online' : 'Offline'}
                    </p>
                    <p className="text-xs text-gray-400">connection</p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${device.status === 'online' ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <Clock className={`h-6 w-6 ${device.status === 'online' ? 'text-emerald-500' : 'text-gray-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sensor Cards with Sparklines */}
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-xl" />}>
            <FishSensorCards
              temperature={latestReading.temperature}
              ph={latestReading.ph}
              ecValue={latestReading.ecValue}
              turbidity={latestReading.turbidity}
              tds={latestReading.tds}
              historicalData={readings}
            />
          </Suspense>

          {/* Gauges Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* pH & Temperature Gauges */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-cyan-500" />
                  Key Parameters
                </CardTitle>
                <CardDescription>Current pH and Temperature</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around py-4">
                  <RadialGauge
                    value={latestReading.ph}
                    min={5}
                    max={10}
                    label="pH Level"
                    unit=""
                    thresholds={{
                      warning: { min: 6.5, max: 8.0 },
                      danger: { min: 5.5, max: 9.0 },
                    }}
                    color="#10b981"
                    size="md"
                  />
                  <RadialGauge
                    value={latestReading.temperature}
                    min={15}
                    max={35}
                    label="Temperature"
                    unit="°C"
                    thresholds={{
                      warning: { min: 22, max: 28 },
                      danger: { min: 18, max: 32 },
                    }}
                    color="#06b6d4"
                    size="md"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Water Quality Radar */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  Water Quality Index
                </CardTitle>
                <CardDescription>Multi-parameter health score</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-2">
                <WaterQualityRadar
                  temperature={latestReading.temperature}
                  ph={latestReading.ph}
                  ecValue={latestReading.ecValue}
                  turbidity={latestReading.turbidity}
                  tds={latestReading.tds}
                />
              </CardContent>
            </Card>

            {/* Period Statistics */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  {getPeriodLabel(selectedPeriod).replace('Last ', '')} Statistics
                </CardTitle>
                <CardDescription>Min/Max/Avg values</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Temperature', stats: stats.temperature, unit: '°C', color: 'bg-cyan-500' },
                    { label: 'pH Level', stats: stats.ph, unit: '', color: 'bg-emerald-500' },
                    { label: 'EC Value', stats: stats.ecValue, unit: 'µS/cm', color: 'bg-blue-500' },
                    { label: 'Turbidity', stats: stats.turbidity, unit: 'NTU', color: 'bg-purple-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-1 h-8 rounded-full ${item.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 truncate">{item.label}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400">
                            {item.stats.min?.toFixed(1) ?? '--'} - {item.stats.max?.toFixed(1) ?? '--'}
                          </span>
                          <span className="font-medium text-gray-700">
                            avg: {item.stats.avg?.toFixed(1) ?? '--'}{item.unit}
                          </span>
                          {item.stats.trend !== 'neutral' && (
                            item.stats.trend === 'up' ? (
                              <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Combined Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-cyan-500" />
                Temperature & pH Overview
              </CardTitle>
              <CardDescription>Combined metrics over {getPeriodLabel(selectedPeriod).toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-72 animate-pulse bg-gray-100 rounded" />}>
                <FishCharts data={readings} metric="combined" />
              </Suspense>
            </CardContent>
          </Card>

          {/* Individual Charts Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">EC Value Trend</CardTitle>
                <CardDescription>Electrical Conductivity (µS/cm)</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <FishCharts data={readings} metric="ecValue" />
                </Suspense>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Turbidity Trend</CardTitle>
                <CardDescription>Water clarity (NTU)</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <FishCharts data={readings} metric="turbidity" />
                </Suspense>
              </CardContent>
            </Card>

            <Card className="shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">TDS (Total Dissolved Solids)</CardTitle>
                <CardDescription>Dissolved minerals and salts (ppm)</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                  <FishCharts data={readings} metric="tds" />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
