'use client';

import { useState } from 'react';
import { Save, Loader2, Lock, Info } from 'lucide-react';
import {
  isVirtualDevice,
  formatReadingInterval,
  PHYSICAL_DEVICE_INTERVALS,
  VIRTUAL_DEVICE_INTERVAL,
} from '@/lib/utils/device-intervals';

interface DeviceSettingsProps {
  deviceId: string;
  deviceName: string;
  deviceMac: string;
  readingInterval: number;
}

export function DeviceSettings({ deviceId, deviceName, deviceMac, readingInterval }: DeviceSettingsProps) {
  const [name, setName] = useState(deviceName);
  const [interval, setInterval] = useState(readingInterval);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isVirtual = isVirtualDevice(deviceMac);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // For virtual devices, always use the locked interval
      const intervalToSave = isVirtual ? VIRTUAL_DEVICE_INTERVAL : interval;

      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: name,
          readingInterval: intervalToSave,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update device');
      }

      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reading Interval
        </label>

        {isVirtual ? (
          // Locked display for virtual devices
          <div className="space-y-2">
            <div className="flex items-center gap-2 w-full rounded-md border border-purple-200 bg-purple-50 px-3 py-2.5 text-sm">
              <Lock className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <span className="font-medium text-purple-700">
                {formatReadingInterval(VIRTUAL_DEVICE_INTERVAL)}
              </span>
              <span className="text-purple-500 text-xs ml-auto">Locked</span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-blue-50 border border-blue-100">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Virtual devices use a fixed 5-hour interval to match the CSV dataset timing.
                This ensures accurate 1:1 real-time streaming of historical aquaponics data.
              </p>
            </div>
          </div>
        ) : (
          // Editable select for physical devices
          <>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PHYSICAL_DEVICE_INTERVALS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              How often the device sends sensor readings
            </p>
          </>
        )}
      </div>

      {message && (
        <div
          className={`rounded-md p-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Changes
      </button>
    </div>
  );
}
