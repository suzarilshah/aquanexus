'use client';

import { cn } from '@/lib/utils';
import { Thermometer, Droplets, Wind, Activity, Zap } from 'lucide-react';

interface FishSensorCardsProps {
  temperature: number | null;
  ph: number | null;
  dissolvedOxygen: number | null;
  turbidity: number | null;
  tds: number | null;
}

const THRESHOLDS = {
  temperature: { min: 22, max: 28, unit: '°C' },
  ph: { min: 6.5, max: 8.0, unit: '' },
  dissolvedOxygen: { min: 5, max: 12, unit: 'mg/L' },
  turbidity: { min: 0, max: 5, unit: 'NTU' },
  tds: { min: 200, max: 500, unit: 'ppm' },
};

function getStatus(value: number | null, threshold: { min: number; max: number }) {
  if (value === null) return 'unknown';
  if (value < threshold.min * 0.9 || value > threshold.max * 1.1) return 'critical';
  if (value < threshold.min || value > threshold.max) return 'warning';
  return 'normal';
}

function getStatusStyles(status: string) {
  switch (status) {
    case 'normal':
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-500/20' };
    case 'warning':
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-500/20' };
    case 'critical':
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-500/20' };
    default:
      return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', ring: 'ring-gray-500/20' };
  }
}

export function FishSensorCards({
  temperature,
  ph,
  dissolvedOxygen,
  turbidity,
  tds,
}: FishSensorCardsProps) {
  const sensors = [
    {
      name: 'Temperature',
      value: temperature,
      icon: Thermometer,
      threshold: THRESHOLDS.temperature,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
    {
      name: 'pH Level',
      value: ph,
      icon: Droplets,
      threshold: THRESHOLDS.ph,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Dissolved Oxygen',
      value: dissolvedOxygen,
      icon: Wind,
      threshold: THRESHOLDS.dissolvedOxygen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Turbidity',
      value: turbidity,
      icon: Activity,
      threshold: THRESHOLDS.turbidity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'TDS',
      value: tds,
      icon: Zap,
      threshold: THRESHOLDS.tds,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {sensors.map((sensor) => {
        const status = getStatus(sensor.value, sensor.threshold);
        const styles = getStatusStyles(status);

        return (
          <div
            key={sensor.name}
            className={cn(
              'relative rounded-lg border p-4 transition-all hover:shadow-md',
              styles.bg,
              styles.border
            )}
          >
            <div className="flex items-center justify-between">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', sensor.bgColor)}>
                <sensor.icon className={cn('h-5 w-5', sensor.color)} />
              </div>
              {status !== 'unknown' && (
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    status === 'normal' && 'bg-emerald-500',
                    status === 'warning' && 'bg-amber-500 animate-pulse',
                    status === 'critical' && 'bg-red-500 animate-pulse'
                  )}
                />
              )}
            </div>
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-500">{sensor.name}</p>
              <p className={cn('mt-1 text-2xl font-bold', styles.text)}>
                {sensor.value !== null ? sensor.value.toFixed(1) : '--'}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  {sensor.threshold.unit}
                </span>
              </p>
              <div className="mt-2 text-xs text-gray-400">
                Range: {sensor.threshold.min} - {sensor.threshold.max} {sensor.threshold.unit}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
