'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Cpu, Radio } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  mac: string;
  status?: string;
}

interface DeviceSelectorProps {
  devices: Device[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  deviceType: 'fish' | 'plant';
}

export function DeviceSelector({
  devices,
  selectedId,
  onSelect,
  deviceType,
}: DeviceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDevice = devices.find((d) => d.id === selectedId);
  const isVirtual = (mac: string) => mac.startsWith('VIRTUAL:');

  const getDeviceTypeColor = () => {
    return deviceType === 'fish'
      ? { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', hover: 'hover:bg-cyan-100' }
      : { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', hover: 'hover:bg-green-100' };
  };

  const colors = getDeviceTypeColor();

  if (devices.length === 0) {
    return null;
  }

  if (devices.length === 1) {
    return (
      <div className={cn('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium', colors.bg, colors.border, 'border')}>
        <Cpu className="h-4 w-4" />
        <span>{devices[0].name}</span>
        {isVirtual(devices[0].mac) && (
          <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
            <Radio className="h-3 w-3" />
            Virtual
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm font-medium min-w-[200px] transition-colors',
          colors.bg,
          colors.border,
          colors.hover
        )}
      >
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          <span>{selectedDevice?.name || 'All Devices'}</span>
          {selectedDevice && isVirtual(selectedDevice.mac) && (
            <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
              <Radio className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 z-20 w-full min-w-[240px] rounded-lg border bg-white shadow-lg">
            <div className="p-1">
              {/* All Devices Option */}
              <button
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors',
                  !selectedId ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-gray-500" />
                  <span>All Devices</span>
                  <span className="text-xs text-gray-400">({devices.length})</span>
                </div>
                {!selectedId && <Check className="h-4 w-4 text-green-500" />}
              </button>

              {/* Divider */}
              <div className="h-px bg-gray-100 my-1" />

              {/* Device Options */}
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => {
                    onSelect(device.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors',
                    selectedId === device.id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {isVirtual(device.mac) ? (
                        <Radio className="h-4 w-4 text-purple-500" />
                      ) : (
                        <Cpu className="h-4 w-4 text-gray-500" />
                      )}
                      <span>{device.name}</span>
                    </div>
                    {isVirtual(device.mac) && (
                      <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
                        Virtual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {device.status === 'online' && (
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    )}
                    {selectedId === device.id && <Check className="h-4 w-4 text-green-500" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
