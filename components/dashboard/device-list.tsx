'use client';

import Link from 'next/link';
import { cn, formatDate } from '@/lib/utils';
import { Device } from '@/lib/db/schema';
import { Fish, Leaf, Wifi, WifiOff } from 'lucide-react';

interface DeviceListProps {
  devices: Device[];
}

export function DeviceList({ devices }: DeviceListProps) {
  if (devices.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Wifi className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-900">No devices registered</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by registering your first ESP32 device.
        </p>
        <Link
          href="/dashboard/devices"
          className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          Add Device
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {devices.map((device) => (
        <Link
          key={device.id}
          href={`/dashboard/devices/${device.id}`}
          className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                device.deviceType === 'fish' ? 'bg-cyan-100' : 'bg-green-100'
              )}
            >
              {device.deviceType === 'fish' ? (
                <Fish className="h-5 w-5 text-cyan-600" />
              ) : (
                <Leaf className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{device.deviceName}</p>
              <p className="text-xs text-gray-500">{device.deviceMac}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                  device.status === 'online'
                    ? 'bg-emerald-50 text-emerald-700'
                    : device.status === 'warning'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {device.status === 'online' ? (
                  <Wifi className="mr-1 h-3 w-3" />
                ) : (
                  <WifiOff className="mr-1 h-3 w-3" />
                )}
                {device.status}
              </div>
              {device.lastSeen && (
                <p className="mt-1 text-xs text-gray-400">
                  {formatDate(device.lastSeen)}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
