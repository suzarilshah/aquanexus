// Time period utilities - can be used on both server and client

export type TimePeriod = '1d' | '1w' | '1m' | '3m' | '1y';

export const periods: { value: TimePeriod; label: string; description: string }[] = [
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
