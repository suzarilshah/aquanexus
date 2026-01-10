'use client';

import { cn } from '@/lib/utils';
import { Droplets, Sun, Thermometer, CloudRain, Ruler } from 'lucide-react';

interface PlantSensorCardsProps {
  soilMoisture: number | null;
  lightLevel: number | null;
  temperature: number | null;
  humidity: number | null;
  height?: number | null;
}

const THRESHOLDS = {
  soilMoisture: { min: 30, max: 70, unit: '%' },
  lightLevel: { min: 2000, max: 50000, unit: 'lux' },
  temperature: { min: 18, max: 28, unit: '°C' },
  humidity: { min: 40, max: 70, unit: '%' },
  height: { min: 0, max: 200, unit: 'cm' }, // Height has no warning thresholds
};

function getStatus(value: number | null, threshold: { min: number; max: number }) {
  if (value === null) return 'unknown';
  if (value < threshold.min * 0.8 || value > threshold.max * 1.2) return 'critical';
  if (value < threshold.min || value > threshold.max) return 'warning';
  return 'normal';
}

function getStatusStyles(status: string) {
  switch (status) {
    case 'normal':
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
    case 'warning':
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
    case 'critical':
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
    default:
      return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500' };
  }
}

function formatValue(value: number | null, unit: string, isLux: boolean = false) {
  if (value === null) return '--';
  if (isLux && value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(1);
}

export function PlantSensorCards({
  soilMoisture,
  lightLevel,
  temperature,
  humidity,
  height,
}: PlantSensorCardsProps) {
  const sensors = [
    {
      name: 'Plant Height',
      value: height ?? null,
      icon: Ruler,
      threshold: THRESHOLDS.height,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      isLux: false,
      noStatusCheck: true, // Height doesn't need status warnings
    },
    {
      name: 'Soil Moisture',
      value: soilMoisture,
      icon: Droplets,
      threshold: THRESHOLDS.soilMoisture,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      isLux: false,
      noStatusCheck: false,
    },
    {
      name: 'Light Level',
      value: lightLevel,
      icon: Sun,
      threshold: THRESHOLDS.lightLevel,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      isLux: true,
      noStatusCheck: false,
    },
    {
      name: 'Temperature',
      value: temperature,
      icon: Thermometer,
      threshold: THRESHOLDS.temperature,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      isLux: false,
      noStatusCheck: false,
    },
    {
      name: 'Humidity',
      value: humidity,
      icon: CloudRain,
      threshold: THRESHOLDS.humidity,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      isLux: false,
      noStatusCheck: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {sensors.map((sensor) => {
        const status = sensor.noStatusCheck ? 'normal' : getStatus(sensor.value, sensor.threshold);
        const styles = sensor.noStatusCheck && sensor.value !== null
          ? { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' }
          : getStatusStyles(status);

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
              {!sensor.noStatusCheck && status !== 'unknown' && (
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
                {formatValue(sensor.value, sensor.threshold.unit, sensor.isLux)}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  {sensor.threshold.unit}
                </span>
              </p>
              {!sensor.noStatusCheck && (
                <div className="mt-2 text-xs text-gray-400">
                  Range: {sensor.isLux ? `${sensor.threshold.min/1000}k` : sensor.threshold.min} - {sensor.isLux ? `${sensor.threshold.max/1000}k` : sensor.threshold.max} {sensor.threshold.unit}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
