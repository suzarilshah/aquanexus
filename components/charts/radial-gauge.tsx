'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface RadialGaugeProps {
  value: number | null;
  min: number;
  max: number;
  label: string;
  unit: string;
  thresholds?: {
    danger?: { min?: number; max?: number };
    warning?: { min?: number; max?: number };
  };
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showTicks?: boolean;
  className?: string;
}

export function RadialGauge({
  value,
  min,
  max,
  label,
  unit,
  thresholds,
  size = 'md',
  color = '#06b6d4',
  showTicks = true,
  className,
}: RadialGaugeProps) {
  const sizes = {
    sm: { width: 120, strokeWidth: 8, fontSize: 18, labelSize: 10 },
    md: { width: 160, strokeWidth: 10, fontSize: 24, labelSize: 12 },
    lg: { width: 200, strokeWidth: 12, fontSize: 32, labelSize: 14 },
  };

  const config = sizes[size];
  const radius = (config.width - config.strokeWidth) / 2 - 10;
  const circumference = radius * Math.PI; // Half circle
  const center = config.width / 2;

  const { percentage, displayValue, status } = useMemo(() => {
    if (value === null) {
      return { percentage: 0, displayValue: '--', status: 'unknown' };
    }

    const clampedValue = Math.max(min, Math.min(max, value));
    const pct = ((clampedValue - min) / (max - min)) * 100;

    let currentStatus = 'normal';
    if (thresholds) {
      if (thresholds.danger) {
        if (
          (thresholds.danger.min !== undefined && value < thresholds.danger.min) ||
          (thresholds.danger.max !== undefined && value > thresholds.danger.max)
        ) {
          currentStatus = 'danger';
        }
      }
      if (currentStatus === 'normal' && thresholds.warning) {
        if (
          (thresholds.warning.min !== undefined && value < thresholds.warning.min) ||
          (thresholds.warning.max !== undefined && value > thresholds.warning.max)
        ) {
          currentStatus = 'warning';
        }
      }
    }

    return {
      percentage: pct,
      displayValue: value.toFixed(1),
      status: currentStatus,
    };
  }, [value, min, max, thresholds]);

  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const statusColors = {
    normal: color,
    warning: '#f59e0b',
    danger: '#ef4444',
    unknown: '#9ca3af',
  };

  const activeColor = statusColors[status as keyof typeof statusColors];

  // Generate tick marks
  const ticks = useMemo(() => {
    if (!showTicks) return [];
    const tickCount = 5;
    const tickArray = [];
    for (let i = 0; i <= tickCount; i++) {
      const angle = (Math.PI * i) / tickCount;
      const tickValue = min + ((max - min) * i) / tickCount;
      const x1 = center + (radius + 6) * Math.cos(Math.PI - angle);
      const y1 = center + (radius + 6) * Math.sin(Math.PI - angle);
      const x2 = center + (radius + 12) * Math.cos(Math.PI - angle);
      const y2 = center + (radius + 12) * Math.sin(Math.PI - angle);
      tickArray.push({ x1, y1, x2, y2, value: tickValue, angle });
    }
    return tickArray;
  }, [center, radius, min, max, showTicks]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg width={config.width} height={config.width / 2 + 30} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored zones (optional danger/warning zones) */}
        {thresholds?.danger?.max && (
          <path
            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
            fill="none"
            stroke="#fef2f2"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ((thresholds.danger.max - min) / (max - min)))}
            opacity={0.5}
          />
        )}

        {/* Value arc */}
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke={activeColor}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: status === 'danger' ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))' : 'none',
          }}
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="#d1d5db"
              strokeWidth={1}
            />
          </g>
        ))}

        {/* Center value display */}
        <text
          x={center}
          y={center - 5}
          textAnchor="middle"
          className="font-bold"
          style={{ fontSize: config.fontSize }}
          fill={activeColor}
        >
          {displayValue}
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          className="font-medium"
          style={{ fontSize: config.labelSize }}
          fill="#6b7280"
        >
          {unit}
        </text>

        {/* Min/Max labels */}
        <text
          x={center - radius - 5}
          y={center + 18}
          textAnchor="middle"
          style={{ fontSize: 10 }}
          fill="#9ca3af"
        >
          {min}
        </text>
        <text
          x={center + radius + 5}
          y={center + 18}
          textAnchor="middle"
          style={{ fontSize: 10 }}
          fill="#9ca3af"
        >
          {max}
        </text>
      </svg>
      <p className="text-sm font-medium text-gray-600 -mt-2">{label}</p>
    </div>
  );
}
