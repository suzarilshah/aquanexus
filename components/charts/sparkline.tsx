'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  showDot?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 30,
  color = '#10b981',
  showArea = true,
  showDot = true,
  className,
}: SparklineProps) {
  const { path, areaPath, points, trend } = useMemo(() => {
    if (data.length < 2) {
      return { path: '', areaPath: '', points: [], trend: 'neutral' };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const pointsArray = data.map((value, index) => ({
      x: padding + (index / (data.length - 1)) * chartWidth,
      y: padding + chartHeight - ((value - min) / range) * chartHeight,
    }));

    // Create smooth path using bezier curves
    let pathD = `M ${pointsArray[0].x} ${pointsArray[0].y}`;
    for (let i = 1; i < pointsArray.length; i++) {
      const prev = pointsArray[i - 1];
      const curr = pointsArray[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = prev.x + (2 * (curr.x - prev.x)) / 3;
      const cp2y = curr.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    // Area path
    const areaPathD = `${pathD} L ${pointsArray[pointsArray.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

    // Calculate trend
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trendDirection = secondAvg > firstAvg * 1.02 ? 'up' : secondAvg < firstAvg * 0.98 ? 'down' : 'neutral';

    return {
      path: pathD,
      areaPath: areaPathD,
      points: pointsArray,
      trend: trendDirection,
    };
  }, [data, width, height]);

  if (data.length < 2) {
    return (
      <div
        className={cn('flex items-center justify-center text-gray-300', className)}
        style={{ width, height }}
      >
        <span className="text-xs">No data</span>
      </div>
    );
  }

  const lastPoint = points[points.length - 1];

  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)}>
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {showArea && (
        <path
          d={areaPath}
          fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
        />
      )}

      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {showDot && lastPoint && (
        <>
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={3}
            fill={color}
          />
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={5}
            fill={color}
            opacity={0.3}
            className="animate-ping"
          />
        </>
      )}
    </svg>
  );
}
