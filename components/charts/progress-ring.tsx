'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  label?: string;
  sublabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function ProgressRing({
  value,
  maxValue,
  size = 120,
  strokeWidth = 10,
  color = '#10b981',
  backgroundColor = '#e5e7eb',
  showPercentage = true,
  label,
  sublabel,
  icon,
  className,
}: ProgressRingProps) {
  const { percentage, circumference, strokeDashoffset } = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * radius;
    const pct = Math.min(100, Math.max(0, (value / maxValue) * 100));
    const offset = circ - (pct / 100) * circ;

    return {
      percentage: pct,
      circumference: circ,
      strokeDashoffset: offset,
    };
  }, [value, maxValue, size, strokeWidth]);

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
          />

          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon && <div className="mb-1">{icon}</div>}
          {showPercentage && (
            <span
              className="font-bold"
              style={{
                fontSize: size / 5,
                color: color,
              }}
            >
              {percentage.toFixed(0)}%
            </span>
          )}
          {sublabel && (
            <span className="text-xs text-gray-500 mt-0.5">{sublabel}</span>
          )}
        </div>
      </div>
      {label && <p className="text-sm font-medium text-gray-600 mt-2">{label}</p>}
    </div>
  );
}
