'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface FishChartsProps {
  data: Array<{
    timestamp: string;
    temperature: number | null;
    ph: number | null;
    dissolvedOxygen: number | null;
    turbidity: number | null;
    tds: number | null;
  }>;
  metric: 'temperature' | 'ph' | 'dissolvedOxygen' | 'turbidity' | 'tds';
}

const CHART_CONFIG = {
  temperature: {
    color: '#06b6d4',
    label: 'Temperature (°C)',
    domain: [18, 32],
  },
  ph: {
    color: '#10b981',
    label: 'pH',
    domain: [5, 10],
  },
  dissolvedOxygen: {
    color: '#3b82f6',
    label: 'DO (mg/L)',
    domain: [0, 15],
  },
  turbidity: {
    color: '#8b5cf6',
    label: 'Turbidity (NTU)',
    domain: [0, 20],
  },
  tds: {
    color: '#f97316',
    label: 'TDS (ppm)',
    domain: [0, 1000],
  },
};

export function FishCharts({ data, metric }: FishChartsProps) {
  const config = CHART_CONFIG[metric];

  const chartData = useMemo(() => {
    return data
      .filter((d) => d[metric] !== null)
      .map((d) => ({
        time: new Date(d.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        value: d[metric],
      }))
      .reverse(); // Oldest first for proper chart display
  }, [data, metric]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-2 text-sm">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={config.color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={{ stroke: '#e5e7eb' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          domain={config.domain}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={{ stroke: '#e5e7eb' }}
          axisLine={{ stroke: '#e5e7eb' }}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{ color: '#374151', fontWeight: 500 }}
          formatter={(value: number) => [value.toFixed(2), config.label]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={config.color}
          strokeWidth={2}
          fill={`url(#gradient-${metric})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
