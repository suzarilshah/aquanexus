'use client';

import { cn } from '@/lib/utils';
import { Ruler, Thermometer, CloudRain, Gauge } from 'lucide-react';

interface PlantSensorCardsProps {
  height: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
}

const THRESHOLDS = {
  height: { min: 0, max: 200, unit: 'cm' },
  temperature: { min: 18, max: 32, unit: '°C' },
  humidity: { min: 40, max: 80, unit: '%' },
  pressure: { min: 95000, max: 105000, unit: 'Pa' },
};

function getStatus(value: number | null, threshold: { min: number; max: number }, noStatusCheck: boolean = false) {
  if (noStatusCheck) return 'normal';
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

function formatValue(value: number | null, isPressure: boolean = false) {
  if (value === null) return '--';
  if (isPressure) {
    // Convert Pa to hPa for display
    return (value / 100).toFixed(1);
  }
  return value.toFixed(1);
}

export function PlantSensorCards({
  height,
  temperature,
  humidity,
  pressure,
}: PlantSensorCardsProps) {
  const sensors = [
    {
      name: 'Plant Height',
      value: height,
      icon: Ruler,
      threshold: THRESHOLDS.height,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      noStatusCheck: true, // Height doesn't need status warnings
      isPressure: false,
      displayUnit: 'cm',
    },
    {
      name: 'Temperature',
      value: temperature,
      icon: Thermometer,
      threshold: THRESHOLDS.temperature,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      noStatusCheck: false,
      isPressure: false,
      displayUnit: '°C',
    },
    {
      name: 'Humidity',
      value: humidity,
      icon: CloudRain,
      threshold: THRESHOLDS.humidity,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      noStatusCheck: false,
      isPressure: false,
      displayUnit: '%',
    },
    {
      name: 'Pressure',
      value: pressure,
      icon: Gauge,
      threshold: THRESHOLDS.pressure,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      noStatusCheck: false,
      isPressure: true,
      displayUnit: 'hPa',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {sensors.map((sensor) => {
        const status = getStatus(sensor.value, sensor.threshold, sensor.noStatusCheck);
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
                {formatValue(sensor.value, sensor.isPressure)}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  {sensor.displayUnit}
                </span>
              </p>
              {!sensor.noStatusCheck && (
                <div className="mt-2 text-xs text-gray-400">
                  Range: {sensor.isPressure ? (sensor.threshold.min / 100).toFixed(0) : sensor.threshold.min} - {sensor.isPressure ? (sensor.threshold.max / 100).toFixed(0) : sensor.threshold.max} {sensor.displayUnit}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
