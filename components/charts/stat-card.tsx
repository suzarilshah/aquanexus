'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { Sparkline } from './sparkline';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  sparklineData?: number[];
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  status?: 'normal' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  unit,
  trend,
  sparklineData,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  status = 'normal',
  subtitle,
  className,
}: StatCardProps) {
  const statusStyles = {
    normal: {
      border: 'border-gray-200',
      bg: 'bg-white',
      value: 'text-gray-900',
    },
    warning: {
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      value: 'text-amber-700',
    },
    danger: {
      border: 'border-red-200',
      bg: 'bg-red-50',
      value: 'text-red-700',
    },
    info: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      value: 'text-blue-700',
    },
  };

  const styles = statusStyles[status];

  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 transition-all hover:shadow-md',
        styles.border,
        styles.bg,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBgColor)}>
                <Icon className={cn('h-4 w-4', iconColor)} />
              </div>
            )}
            <p className="text-sm font-medium text-gray-500">{title}</p>
          </div>

          <div className="mt-3 flex items-baseline gap-1">
            <span className={cn('text-2xl font-bold', styles.value)}>{value}</span>
            {unit && <span className="text-sm font-normal text-gray-400">{unit}</span>}
          </div>

          {subtitle && (
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          )}

          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <TrendIcon className={cn('h-3.5 w-3.5', trendColors[trend.direction])} />
              <span className={cn('text-xs font-medium', trendColors[trend.direction])}>
                {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-400 ml-1">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="ml-4">
            <Sparkline
              data={sparklineData}
              width={70}
              height={35}
              color={
                status === 'danger'
                  ? '#ef4444'
                  : status === 'warning'
                    ? '#f59e0b'
                    : '#10b981'
              }
              showArea
              showDot
            />
          </div>
        )}
      </div>

      {/* Status indicator dot */}
      {status !== 'normal' && (
        <div
          className={cn(
            'absolute top-3 right-3 h-2 w-2 rounded-full',
            status === 'warning' && 'bg-amber-500 animate-pulse',
            status === 'danger' && 'bg-red-500 animate-pulse',
            status === 'info' && 'bg-blue-500'
          )}
        />
      )}
    </div>
  );
}
