'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Thermometer, Droplets, Zap, Activity, Wind, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';

interface FishSensorCardsProps {
  temperature: number | null;
  ph: number | null;
  ecValue: number | null;
  turbidity: number | null;
  tds: number | null;
  historicalData?: Array<{
    temperature: number | null;
    ph: number | null;
    ecValue: number | null;
    turbidity: number | null;
    tds: number | null;
  }>;
}

const THRESHOLDS = {
  temperature: { min: 22, max: 28, unit: '°C', optimal: 25, dangerLow: 18, dangerHigh: 32 },
  ph: { min: 6.5, max: 8.0, unit: '', optimal: 7.2, dangerLow: 5.5, dangerHigh: 9.0 },
  ecValue: { min: 200, max: 800, unit: 'µS/cm', optimal: 400, dangerLow: 100, dangerHigh: 1200 },
  turbidity: { min: 0, max: 20, unit: 'NTU', optimal: 5, dangerLow: 0, dangerHigh: 50 },
  tds: { min: 100, max: 500, unit: 'ppm', optimal: 250, dangerLow: 50, dangerHigh: 800 },
};

function getStatus(value: number | null, threshold: typeof THRESHOLDS.temperature) {
  if (value === null) return 'unknown';
  if (value < threshold.dangerLow || value > threshold.dangerHigh) return 'danger';
  if (value < threshold.min || value > threshold.max) return 'warning';
  return 'normal';
}

function getTrend(current: number | null, historical: (number | null)[]): { direction: 'up' | 'down' | 'neutral'; percentage: number } {
  const validData = historical.filter((v): v is number => v !== null);
  if (!current || validData.length < 2) return { direction: 'neutral', percentage: 0 };

  const oldAvg = validData.slice(0, Math.floor(validData.length / 2)).reduce((a, b) => a + b, 0) / (validData.length / 2);
  const newAvg = validData.slice(Math.floor(validData.length / 2)).reduce((a, b) => a + b, 0) / (validData.length / 2);

  const change = ((newAvg - oldAvg) / oldAvg) * 100;

  if (Math.abs(change) < 1) return { direction: 'neutral', percentage: 0 };
  return { direction: change > 0 ? 'up' : 'down', percentage: Math.abs(change) };
}

function getStatusStyles(status: string) {
  switch (status) {
    case 'normal':
      return {
        bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-700',
        glow: 'shadow-emerald-100'
      };
    case 'warning':
      return {
        bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700',
        glow: 'shadow-amber-100'
      };
    case 'danger':
      return {
        bg: 'bg-gradient-to-br from-red-50 to-rose-50',
        border: 'border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
        glow: 'shadow-red-100'
      };
    default:
      return {
        bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
        border: 'border-gray-200',
        text: 'text-gray-500',
        badge: 'bg-gray-100 text-gray-500',
        glow: 'shadow-gray-100'
      };
  }
}

function getOptimalDistance(value: number | null, threshold: typeof THRESHOLDS.temperature): number {
  if (value === null) return 0;
  const distance = Math.abs(value - threshold.optimal);
  const maxDistance = Math.max(threshold.optimal - threshold.dangerLow, threshold.dangerHigh - threshold.optimal);
  return Math.max(0, 100 - (distance / maxDistance) * 100);
}

export function FishSensorCards({
  temperature,
  ph,
  ecValue,
  turbidity,
  tds,
  historicalData = [],
}: FishSensorCardsProps) {
  const sensors = useMemo(() => [
    {
      name: 'Water Temperature',
      shortName: 'Temp',
      value: temperature,
      icon: Thermometer,
      threshold: THRESHOLDS.temperature,
      color: '#06b6d4',
      bgColor: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      historical: historicalData.map(d => d.temperature),
      description: 'Fish metabolism rate',
    },
    {
      name: 'pH Level',
      shortName: 'pH',
      value: ph,
      icon: Droplets,
      threshold: THRESHOLDS.ph,
      color: '#10b981',
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      historical: historicalData.map(d => d.ph),
      description: 'Acidity balance',
    },
    {
      name: 'EC Value',
      shortName: 'EC',
      value: ecValue,
      icon: Zap,
      threshold: THRESHOLDS.ecValue,
      color: '#3b82f6',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      historical: historicalData.map(d => d.ecValue),
      description: 'Electrical conductivity',
    },
    {
      name: 'Turbidity',
      shortName: 'Turb',
      value: turbidity,
      icon: Activity,
      threshold: THRESHOLDS.turbidity,
      color: '#8b5cf6',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      historical: historicalData.map(d => d.turbidity),
      description: 'Water clarity',
    },
    {
      name: 'TDS',
      shortName: 'TDS',
      value: tds,
      icon: Wind,
      threshold: THRESHOLDS.tds,
      color: '#f97316',
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      historical: historicalData.map(d => d.tds),
      description: 'Dissolved solids',
    },
  ], [temperature, ph, ecValue, turbidity, tds, historicalData]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {sensors.map((sensor) => {
        const status = getStatus(sensor.value, sensor.threshold);
        const styles = getStatusStyles(status);
        const trend = getTrend(sensor.value, sensor.historical);
        const optimalScore = getOptimalDistance(sensor.value, sensor.threshold);
        const sparklineData = sensor.historical.filter((v): v is number => v !== null).slice(-20);

        const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;

        return (
          <div
            key={sensor.name}
            className={cn(
              'relative rounded-xl border p-4 transition-all hover:shadow-lg hover:-translate-y-0.5',
              styles.bg,
              styles.border,
              styles.glow
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', sensor.bgColor)}>
                <sensor.icon className={cn('h-5 w-5', sensor.iconColor)} />
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {status !== 'unknown' && (
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      status === 'normal' && 'bg-emerald-500',
                      status === 'warning' && 'bg-amber-500 animate-pulse',
                      status === 'danger' && 'bg-red-500 animate-pulse'
                    )}
                  />
                )}
              </div>
            </div>

            {/* Value */}
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-500 mb-1">{sensor.name}</p>
              <div className="flex items-baseline gap-1">
                <span className={cn('text-2xl font-bold tabular-nums', styles.text)}>
                  {sensor.value !== null ? sensor.value.toFixed(1) : '--'}
                </span>
                <span className="text-sm font-normal text-gray-400">
                  {sensor.threshold.unit}
                </span>
              </div>
            </div>

            {/* Optimal Range Progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Optimal: {sensor.threshold.optimal}{sensor.threshold.unit}</span>
                <span>{optimalScore.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${optimalScore}%`,
                    backgroundColor: status === 'danger' ? '#ef4444' : status === 'warning' ? '#f59e0b' : sensor.color
                  }}
                />
              </div>
            </div>

            {/* Sparkline & Trend */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
              {sparklineData.length > 3 ? (
                <Sparkline
                  data={sparklineData}
                  width={60}
                  height={24}
                  color={status === 'danger' ? '#ef4444' : status === 'warning' ? '#f59e0b' : sensor.color}
                  showArea={true}
                  showDot={false}
                />
              ) : (
                <span className="text-xs text-gray-400">No trend</span>
              )}

              {trend.direction !== 'neutral' && (
                <div className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
                )}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{trend.percentage.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
