'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Cpu, Fish, Leaf, MoreVertical, Trash2, Settings, Eye, Copy } from 'lucide-react';
import Link from 'next/link';

interface Device {
  id: string;
  deviceMac: string;
  deviceName: string;
  deviceType: 'fish' | 'plant';
  status: 'online' | 'offline' | 'warning';
  lastSeen: Date | null;
  readingInterval: number;
  createdAt: Date;
  apiKey: string;
  readingCount: number;
}

interface DeviceListProps {
  devices: Device[];
}

export function DeviceList({ devices }: DeviceListProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyApiKey = async (apiKey: string, deviceId: string) => {
    await navigator.clipboard.writeText(apiKey);
    setCopiedId(deviceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatLastSeen = (lastSeen: Date | null) => {
    if (!lastSeen) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {devices.map((device) => (
        <div
          key={device.id}
          className="relative bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          {/* Device Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  device.deviceType === 'fish' ? 'bg-blue-100' : 'bg-green-100'
                )}
              >
                {device.deviceType === 'fish' ? (
                  <Fish className="h-5 w-5 text-blue-600" />
                ) : (
                  <Leaf className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{device.deviceName}</h3>
                <p className="text-xs text-gray-500">{device.deviceMac}</p>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  device.status === 'online' && 'bg-emerald-50 text-emerald-700',
                  device.status === 'offline' && 'bg-gray-100 text-gray-600',
                  device.status === 'warning' && 'bg-amber-50 text-amber-700'
                )}
              >
                <span
                  className={cn(
                    'mr-1.5 h-1.5 w-1.5 rounded-full',
                    device.status === 'online' && 'bg-emerald-500',
                    device.status === 'offline' && 'bg-gray-400',
                    device.status === 'warning' && 'bg-amber-500'
                  )}
                />
                {device.status}
              </span>

              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setOpenMenu(openMenu === device.id ? null : device.id)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
                {openMenu === device.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenu(null)}
                    />
                    <div className="absolute right-0 z-20 mt-1 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                      <Link
                        href={`/dashboard/devices/${device.id}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Eye className="mr-3 h-4 w-4" />
                        View Details
                      </Link>
                      <button
                        onClick={() => copyApiKey(device.apiKey, device.id)}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Copy className="mr-3 h-4 w-4" />
                        {copiedId === device.id ? 'Copied!' : 'Copy API Key'}
                      </button>
                      <button className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 className="mr-3 h-4 w-4" />
                        Delete Device
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Device Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Readings</p>
              <p className="text-sm font-medium text-gray-900">{device.readingCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Interval</p>
              <p className="text-sm font-medium text-gray-900">{device.readingInterval}s</p>
            </div>
          </div>

          {/* Last Seen */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Last seen</span>
              <span className="font-medium text-gray-700">{formatLastSeen(device.lastSeen)}</span>
            </div>
          </div>

          {/* Quick Link */}
          <Link
            href={device.deviceType === 'fish' ? '/dashboard/fish' : '/dashboard/plants'}
            className="absolute inset-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`View ${device.deviceName} dashboard`}
          />
        </div>
      ))}
    </div>
  );
}
