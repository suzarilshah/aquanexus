'use client';

import { cn } from '@/lib/utils';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface MiniBarChartProps {
  data: BarData[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
  showLabels?: boolean;
  horizontal?: boolean;
  className?: string;
}

export function MiniBarChart({
  data,
  maxValue,
  height = 100,
  showValues = true,
  showLabels = true,
  horizontal = false,
  className,
}: MiniBarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  if (horizontal) {
    return (
      <div className={cn('space-y-2', className)}>
        {data.map((item, index) => {
          const percentage = (item.value / max) * 100;
          return (
            <div key={index} className="flex items-center gap-2">
              {showLabels && (
                <span className="text-xs text-gray-500 w-16 truncate">{item.label}</span>
              )}
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color || '#10b981',
                  }}
                />
              </div>
              {showValues && (
                <span className="text-xs font-medium text-gray-700 w-12 text-right">
                  {item.value.toFixed(1)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const barWidth = 100 / data.length;

  return (
    <div className={cn('flex items-end justify-between gap-1', className)} style={{ height }}>
      {data.map((item, index) => {
        const percentage = (item.value / max) * 100;
        return (
          <div
            key={index}
            className="flex flex-col items-center gap-1"
            style={{ width: `${barWidth}%` }}
          >
            {showValues && (
              <span className="text-xs font-medium text-gray-600">
                {item.value.toFixed(0)}
              </span>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${percentage}%`,
                backgroundColor: item.color || '#10b981',
                minHeight: 4,
              }}
            />
            {showLabels && (
              <span className="text-[10px] text-gray-400 truncate max-w-full">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
