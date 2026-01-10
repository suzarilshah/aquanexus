'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Calendar, Clock } from 'lucide-react';
import { TimePeriod, periods, getPeriodLabel } from '@/lib/utils/period';

// Re-export for convenience
export type { TimePeriod } from '@/lib/utils/period';
export { getPeriodLabel, getPeriodMilliseconds, getPeriodReadingLimit } from '@/lib/utils/period';

interface PeriodSelectorProps {
  selectedPeriod: TimePeriod;
  className?: string;
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
