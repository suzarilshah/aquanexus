'use client';

import { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  Activity,
  Server,
  RefreshCw,
  Clock,
  HardDrive,
  Gauge,
  Signal,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthcheckData {
  id: string;
  deviceId: string;
  // Device info
  deviceName: string | null;
  deviceType: string | null;
  macAddress: string | null;
  firmwareVersion: string | null;
  boardType: string | null;
  chipId: string | null;
  // System status
  freeHeap: number | null;
  heapSize: number | null;
  minFreeHeap: number | null;
  uptimeMs: number | null;
  cpuFrequency: number | null;
  // WiFi status
  wifiConnected: boolean | null;
  wifiSsid: string | null;
  wifiRssi: number | null;
  wifiIp: string | null;
  wifiGateway: string | null;
  wifiDns: string | null;
  wifiReconnectCount: number | null;
  // Connection stats
  connectionSuccessCount: number | null;
  connectionFailCount: number | null;
  consecutiveErrors: number | null;
  lastError: string | null;
  // Timestamp
  receivedAt: string;
  createdAt: string;
}

interface DeviceHealthcheckProps {
  deviceId: string;
  className?: string;
}

function formatUptime(ms: number | null): string {
  if (ms === null) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getRssiQuality(rssi: number | null): { label: string; color: string; percent: number } {
  if (rssi === null) return { label: 'Unknown', color: 'text-gray-400', percent: 0 };
  if (rssi >= -50) return { label: 'Excellent', color: 'text-green-500', percent: 100 };
  if (rssi >= -60) return { label: 'Good', color: 'text-green-400', percent: 80 };
  if (rssi >= -70) return { label: 'Fair', color: 'text-yellow-500', percent: 60 };
  if (rssi >= -80) return { label: 'Weak', color: 'text-orange-500', percent: 40 };
  return { label: 'Poor', color: 'text-red-500', percent: 20 };
}

function getHeapUsagePercent(freeHeap: number | null, heapSize: number | null): number {
  if (freeHeap === null || heapSize === null || heapSize === 0) return 0;
  return Math.round(((heapSize - freeHeap) / heapSize) * 100);
}

export function DeviceHealthcheck({ deviceId, className }: DeviceHealthcheckProps) {
  const [healthcheck, setHealthcheck] = useState<HealthcheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealthcheck = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/devices/${deviceId}/healthcheck?limit=1`);
      if (!response.ok) {
        throw new Error('Failed to fetch healthcheck data');
      }
      const data = await response.json();
      setHealthcheck(data.latestHealthcheck);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthcheck();
    // Refresh every 60 seconds
    const interval = setInterval(fetchHealthcheck, 60000);
    return () => clearInterval(interval);
  }, [deviceId]);

  if (loading) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          <span className="ml-2 text-gray-500">Loading healthcheck data...</span>
        </div>
      </div>
    );
  }

  if (!healthcheck) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Activity className="h-5 w-5 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Device Healthcheck</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-gray-500">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>No healthcheck data available yet. The device will send diagnostics when connected.</span>
        </div>
      </div>
    );
  }

  const rssiQuality = getRssiQuality(healthcheck.wifiRssi);
  const heapUsage = getHeapUsagePercent(healthcheck.freeHeap, healthcheck.heapSize);
  const lastUpdated = new Date(healthcheck.receivedAt).toLocaleString();

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-teal-50 border-b border-gray-200 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Activity className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Device Healthcheck</h3>
            <p className="text-xs text-gray-500">Last updated: {lastUpdated}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchHealthcheck();
            }}
            disabled={refreshing}
            className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4 text-gray-600', refreshing && 'animate-spin')} />
          </button>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-6">
          {/* Device Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-4 w-4 text-gray-500" />
              <h4 className="font-medium text-gray-700">Device Information</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem label="Device Name" value={healthcheck.deviceName} />
              <InfoItem label="Device Type" value={healthcheck.deviceType} />
              <InfoItem label="MAC Address" value={healthcheck.macAddress} mono />
              <InfoItem label="Firmware Version" value={healthcheck.firmwareVersion} />
              <InfoItem label="Board Type" value={healthcheck.boardType} />
              <InfoItem label="Chip ID" value={healthcheck.chipId} mono />
            </div>
          </div>

          {/* System Status */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="h-4 w-4 text-gray-500" />
              <h4 className="font-medium text-gray-700">System Status</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Heap Usage</span>
                  <span className="text-xs font-medium">{heapUsage}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      heapUsage > 80 ? 'bg-red-500' : heapUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${heapUsage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatBytes(healthcheck.freeHeap)} free / {formatBytes(healthcheck.heapSize)} total
                </div>
              </div>
              <InfoItem
                label="Min Free Heap"
                value={formatBytes(healthcheck.minFreeHeap)}
                icon={<HardDrive className="h-3 w-3" />}
              />
              <InfoItem
                label="Uptime"
                value={formatUptime(healthcheck.uptimeMs)}
                icon={<Clock className="h-3 w-3" />}
              />
              <InfoItem
                label="CPU Frequency"
                value={healthcheck.cpuFrequency ? `${healthcheck.cpuFrequency} MHz` : null}
                icon={<Gauge className="h-3 w-3" />}
              />
            </div>
          </div>

          {/* WiFi Status */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="h-4 w-4 text-gray-500" />
              <h4 className="font-medium text-gray-700">WiFi Status</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {healthcheck.wifiConnected ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {healthcheck.wifiConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {healthcheck.wifiSsid && (
                  <div className="text-xs text-gray-500 mt-1">SSID: {healthcheck.wifiSsid}</div>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Signal Strength</span>
                  <span className={cn('text-xs font-medium', rssiQuality.color)}>
                    {rssiQuality.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <div
                      key={bar}
                      className={cn(
                        'w-2 rounded-sm transition-all',
                        bar * 20 <= rssiQuality.percent ? 'bg-cyan-500' : 'bg-gray-200'
                      )}
                      style={{ height: `${bar * 4 + 4}px` }}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-2">
                    {healthcheck.wifiRssi !== null ? `${healthcheck.wifiRssi} dBm` : 'N/A'}
                  </span>
                </div>
              </div>
              <InfoItem
                label="IP Address"
                value={healthcheck.wifiIp}
                icon={<Signal className="h-3 w-3" />}
                mono
              />
              <InfoItem label="Gateway" value={healthcheck.wifiGateway} mono />
              <InfoItem label="DNS" value={healthcheck.wifiDns} mono />
              <InfoItem
                label="Reconnects"
                value={healthcheck.wifiReconnectCount?.toString() ?? null}
                icon={<RefreshCw className="h-3 w-3" />}
              />
            </div>
          </div>

          {/* Connection Stats */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-gray-500" />
              <h4 className="font-medium text-gray-700">Connection Statistics</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Successful"
                value={healthcheck.connectionSuccessCount}
                color="text-green-600"
                bgColor="bg-green-50"
              />
              <StatCard
                label="Failed"
                value={healthcheck.connectionFailCount}
                color="text-red-600"
                bgColor="bg-red-50"
              />
              <StatCard
                label="Consecutive Errors"
                value={healthcheck.consecutiveErrors}
                color={healthcheck.consecutiveErrors && healthcheck.consecutiveErrors > 0 ? 'text-orange-600' : 'text-gray-600'}
                bgColor={healthcheck.consecutiveErrors && healthcheck.consecutiveErrors > 0 ? 'bg-orange-50' : 'bg-gray-50'}
              />
              <div className="bg-gray-50 rounded-lg p-3 col-span-2 md:col-span-1">
                <span className="text-xs text-gray-500">Last Error</span>
                <div className="text-sm font-medium text-gray-700 truncate" title={healthcheck.lastError || 'None'}>
                  {healthcheck.lastError || 'None'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className={cn('text-sm font-medium text-gray-700', mono && 'font-mono text-xs')}>
        {value || 'N/A'}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  bgColor,
}: {
  label: string;
  value: number | null;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={cn('rounded-lg p-3', bgColor)}>
      <span className="text-xs text-gray-500">{label}</span>
      <div className={cn('text-2xl font-bold', color)}>{value ?? 0}</div>
    </div>
  );
}
