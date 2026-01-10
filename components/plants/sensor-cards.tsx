'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Ruler, Thermometer, CloudRain, Gauge, TrendingUp, TrendingDown, Minus, Sprout } from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';

interface PlantSensorCardsProps {
  height: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  historicalData?: Array<{
    height: number | null;
    temperature: number | null;
    humidity: number | null;
    pressure: number | null;
  }>;
}

const THRESHOLDS = {
  height: { min: 0, max: 200, unit: 'cm', optimal: null, dangerLow: null, dangerHigh: null },
  temperature: { min: 18, max: 32, unit: '°C', optimal: 25, dangerLow: 10, dangerHigh: 40 },
  humidity: { min: 40, max: 80, unit: '%', optimal: 60, dangerLow: 20, dangerHigh: 95 },
  pressure: { min: 95000, max: 105000, unit: 'Pa', optimal: 101325, dangerLow: 90000, dangerHigh: 110000 },
};

function getStatus(value: number | null, threshold: typeof THRESHOLDS.temperature, noStatusCheck: boolean = false) {
  if (noStatusCheck) return 'growth';
  if (value === null) return 'unknown';
  if (threshold.dangerLow !== null && value < threshold.dangerLow) return 'danger';
  if (threshold.dangerHigh !== null && value > threshold.dangerHigh) return 'danger';
  if (value < threshold.min || value > threshold.max) return 'warning';
  return 'normal';
}

function getTrend(historical: (number | null)[]): { direction: 'up' | 'down' | 'neutral'; percentage: number } {
  const validData = historical.filter((v): v is number => v !== null);
  if (validData.length < 4) return { direction: 'neutral', percentage: 0 };

  const halfIndex = Math.floor(validData.length / 2);
  const oldAvg = validData.slice(0, halfIndex).reduce((a, b) => a + b, 0) / halfIndex;
  const newAvg = validData.slice(halfIndex).reduce((a, b) => a + b, 0) / (validData.length - halfIndex);

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
        glow: 'shadow-emerald-100'
      };
    case 'warning':
      return {
        bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        glow: 'shadow-amber-100'
      };
    case 'danger':
      return {
        bg: 'bg-gradient-to-br from-red-50 to-rose-50',
        border: 'border-red-200',
        text: 'text-red-700',
        glow: 'shadow-red-100'
      };
    case 'growth':
      return {
        bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
        border: 'border-green-300',
        text: 'text-green-700',
        glow: 'shadow-green-100'
      };
    default:
      return {
        bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
        border: 'border-gray-200',
        text: 'text-gray-500',
        glow: 'shadow-gray-100'
      };
  }
}

function formatValue(value: number | null, isPressure: boolean = false) {
  if (value === null) return '--';
  if (isPressure) {
    return (value / 100).toFixed(1);
  }
  return value.toFixed(1);
}

function calculateGrowthRate(historical: (number | null)[]): number | null {
  const validData = historical.filter((v): v is number => v !== null);
  if (validData.length < 2) return null;

  const first = validData[validData.length - 1]; // oldest
  const last = validData[0]; // newest
  const growthCm = last - first;

  return growthCm;
}

export function PlantSensorCards({
  height,
  temperature,
  humidity,
  pressure,
  historicalData = [],
}: PlantSensorCardsProps) {
  const growthRate = useMemo(() => calculateGrowthRate(historicalData.map(d => d.height)), [historicalData]);

  const sensors = useMemo(() => [
    {
      name: 'Plant Height',
      value: height,
      icon: Sprout,
      threshold: THRESHOLDS.height,
      color: '#22c55e',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      noStatusCheck: true,
      isPressure: false,
      displayUnit: 'cm',
      historical: historicalData.map(d => d.height),
      isGrowth: true,
    },
    {
      name: 'Air Temperature',
      value: temperature,
      icon: Thermometer,
      threshold: THRESHOLDS.temperature,
      color: '#f97316',
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      noStatusCheck: false,
      isPressure: false,
      displayUnit: '°C',
      historical: historicalData.map(d => d.temperature),
      isGrowth: false,
    },
    {
      name: 'Humidity',
      value: humidity,
      icon: CloudRain,
      threshold: THRESHOLDS.humidity,
      color: '#06b6d4',
      bgColor: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      noStatusCheck: false,
      isPressure: false,
      displayUnit: '%',
      historical: historicalData.map(d => d.humidity),
      isGrowth: false,
    },
    {
      name: 'Pressure',
      value: pressure,
      icon: Gauge,
      threshold: THRESHOLDS.pressure,
      color: '#8b5cf6',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      noStatusCheck: false,
      isPressure: true,
      displayUnit: 'hPa',
      historical: historicalData.map(d => d.pressure),
      isGrowth: false,
    },
  ], [height, temperature, humidity, pressure, historicalData]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {sensors.map((sensor) => {
        const status = getStatus(sensor.value, sensor.threshold as typeof THRESHOLDS.temperature, sensor.noStatusCheck);
        const styles = getStatusStyles(status);
        const trend = getTrend(sensor.historical);
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
              {!sensor.noStatusCheck && status !== 'unknown' && (
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

            {/* Value */}
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-500 mb-1">{sensor.name}</p>
              <div className="flex items-baseline gap-1">
                <span className={cn('text-2xl font-bold tabular-nums', styles.text)}>
                  {formatValue(sensor.value, sensor.isPressure)}
                </span>
                <span className="text-sm font-normal text-gray-400">
                  {sensor.displayUnit}
                </span>
              </div>
            </div>

            {/* Growth Rate for Height */}
            {sensor.isGrowth && growthRate !== null && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">24h growth:</span>
                <span className={cn(
                  'text-xs font-semibold',
                  growthRate > 0 ? 'text-green-600' : growthRate < 0 ? 'text-red-600' : 'text-gray-500'
                )}>
                  {growthRate > 0 ? '+' : ''}{growthRate.toFixed(2)} cm
                </span>
              </div>
            )}

            {/* Optimal Range for non-growth sensors */}
            {!sensor.noStatusCheck && sensor.threshold.optimal && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Range: {sensor.isPressure ? (sensor.threshold.min / 100).toFixed(0) : sensor.threshold.min} - {sensor.isPressure ? (sensor.threshold.max / 100).toFixed(0) : sensor.threshold.max}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: sensor.value !== null
                        ? `${Math.max(0, Math.min(100, ((sensor.value - sensor.threshold.min) / (sensor.threshold.max - sensor.threshold.min)) * 100))}%`
                        : '0%',
                      backgroundColor: status === 'danger' ? '#ef4444' : status === 'warning' ? '#f59e0b' : sensor.color
                    }}
                  />
                </div>
              </div>
            )}

            {/* Sparkline & Trend */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
              {sparklineData.length > 3 ? (
                <Sparkline
                  data={sparklineData}
                  width={60}
                  height={24}
                  color={sensor.isGrowth ? '#22c55e' : status === 'danger' ? '#ef4444' : status === 'warning' ? '#f59e0b' : sensor.color}
                  showArea={true}
                  showDot={false}
                />
              ) : (
                <span className="text-xs text-gray-400">No trend</span>
              )}

              {trend.direction !== 'neutral' && (
                <div className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  sensor.isGrowth
                    ? (trend.direction === 'up' ? 'text-green-600' : 'text-gray-500')
                    : (trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600')
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
