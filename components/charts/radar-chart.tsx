'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface RadarDataPoint {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  fillColor?: string;
  strokeColor?: string;
  showLabels?: boolean;
  showValues?: boolean;
  className?: string;
}

export function RadarChart({
  data,
  size = 200,
  fillColor = 'rgba(16, 185, 129, 0.2)',
  strokeColor = '#10b981',
  showLabels = true,
  showValues = false,
  className,
}: RadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) - 30;
  const angleStep = (2 * Math.PI) / data.length;

  const { polygonPoints, labelPositions, gridLevels } = useMemo(() => {
    // Calculate polygon points for data
    const points = data.map((item, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const normalizedValue = item.value / item.maxValue;
      const x = center + radius * normalizedValue * Math.cos(angle);
      const y = center + radius * normalizedValue * Math.sin(angle);
      return { x, y, ...item };
    });

    // Calculate label positions
    const labels = data.map((item, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const labelRadius = radius + 20;
      return {
        x: center + labelRadius * Math.cos(angle),
        y: center + labelRadius * Math.sin(angle),
        label: item.label,
        value: item.value,
        angle,
      };
    });

    // Generate grid levels (5 levels)
    const levels = [0.2, 0.4, 0.6, 0.8, 1].map((level) => {
      return data.map((_, index) => {
        const angle = index * angleStep - Math.PI / 2;
        const x = center + radius * level * Math.cos(angle);
        const y = center + radius * level * Math.sin(angle);
        return { x, y };
      });
    });

    return { polygonPoints: points, labelPositions: labels, gridLevels: levels };
  }, [data, size, center, radius, angleStep]);

  const polygonPath = polygonPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid lines */}
        {gridLevels.map((level, levelIndex) => (
          <polygon
            key={levelIndex}
            points={level.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {data.map((_, index) => {
          const angle = index * angleStep - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={polygonPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
          className="transition-all duration-500"
        />

        {/* Data points */}
        {polygonPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={point.color || strokeColor}
            stroke="white"
            strokeWidth={2}
          />
        ))}

        {/* Labels */}
        {showLabels &&
          labelPositions.map((label, index) => (
            <g key={index}>
              <text
                x={label.x}
                y={label.y}
                textAnchor={
                  Math.abs(label.angle + Math.PI / 2) < 0.1
                    ? 'middle'
                    : label.x > center
                      ? 'start'
                      : 'end'
                }
                dominantBaseline={
                  label.y < center ? 'auto' : label.y > center ? 'hanging' : 'middle'
                }
                className="text-xs font-medium"
                fill="#6b7280"
              >
                {label.label}
              </text>
              {showValues && (
                <text
                  x={label.x}
                  y={label.y + 12}
                  textAnchor={
                    Math.abs(label.angle + Math.PI / 2) < 0.1
                      ? 'middle'
                      : label.x > center
                        ? 'start'
                        : 'end'
                  }
                  className="text-xs font-bold"
                  fill={strokeColor}
                >
                  {label.value.toFixed(1)}
                </text>
              )}
            </g>
          ))}
      </svg>
    </div>
  );
}
