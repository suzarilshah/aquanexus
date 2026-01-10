'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Calendar, Clock } from 'lucide-react';

export type TimePeriod = '1d' | '1w' | '1m' | '3m' | '1y';

interface PeriodSelectorProps {
  selectedPeriod: TimePeriod;
  className?: string;
}

const periods: { value: TimePeriod; label: string; description: string }[] = [
  { value: '1d', label: '1D', description: 'Last 24 hours' },
  { value: '1w', label: '1W', description: 'Last 7 days' },
  { value: '1m', label: '1M', description: 'Last 30 days' },
  { value: '3m', label: '3M', description: 'Last 90 days' },
  { value: '1y', label: '1Y', description: 'Last 365 days' },
];

export function getPeriodLabel(period: TimePeriod): string {
  const found = periods.find(p => p.value === period);
  return found?.description || 'Last 24 hours';
}

export function getPeriodMilliseconds(period: TimePeriod): number {
  switch (period) {
    case '1d':
      return 24 * 60 * 60 * 1000;
    case '1w':
      return 7 * 24 * 60 * 60 * 1000;
    case '1m':
      return 30 * 24 * 60 * 60 * 1000;
    case '3m':
      return 90 * 24 * 60 * 60 * 1000;
    case '1y':
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

// Get appropriate reading limit based on period
// With 5-hour intervals: ~5 readings/day
export function getPeriodReadingLimit(period: TimePeriod): number {
  switch (period) {
    case '1d':
      return 10; // ~5 readings/day + buffer
    case '1w':
      return 50; // ~35 readings/week + buffer
    case '1m':
      return 200; // ~150 readings/month + buffer
    case '3m':
      return 500; // ~450 readings/3 months + buffer
    case '1y':
      return 2000; // ~1750 readings/year + buffer
    default:
      return 10;
  }
}

export function PeriodSelector({ selectedPeriod, className }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePeriodChange = (period: TimePeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-gray-100 rounded-xl', className)}>
      <div className="flex items-center gap-1 px-2 text-gray-400">
        <Calendar className="h-3.5 w-3.5" />
      </div>
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => handlePeriodChange(period.value)}
          title={period.description}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200',
            selectedPeriod === period.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

// Display component showing current period info
export function PeriodInfo({ period }: { period: TimePeriod }) {
  const periodData = periods.find(p => p.value === period);

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Clock className="h-3.5 w-3.5" />
      <span>{periodData?.description || 'Last 24 hours'}</span>
      <span className="text-gray-300">|</span>
      <span>5-hour intervals</span>
    </div>
  );
}
