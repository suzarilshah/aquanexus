'use client';

import { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
  LineChart,
  ComposedChart,
  Bar,
  ReferenceLine,
  Legend,
} from 'recharts';

interface FishChartsProps {
  data: Array<{
    timestamp: string;
    temperature: number | null;
    ph: number | null;
    ecValue: number | null;
    turbidity: number | null;
    tds: number | null;
  }>;
  metric: 'temperature' | 'ph' | 'ecValue' | 'turbidity' | 'tds' | 'combined';
}

const CHART_CONFIG = {
  temperature: {
    color: '#06b6d4',
    gradientId: 'tempGradient',
    label: 'Temperature (°C)',
    domain: [18, 32],
    optimal: 25,
    warningLow: 22,
    warningHigh: 28,
  },
  ph: {
    color: '#10b981',
    gradientId: 'phGradient',
    label: 'pH',
    domain: [5, 10],
    optimal: 7.2,
    warningLow: 6.5,
    warningHigh: 8.0,
  },
  ecValue: {
    color: '#3b82f6',
    gradientId: 'ecGradient',
    label: 'EC (µS/cm)',
    domain: [0, 1000],
    optimal: 400,
    warningLow: 200,
    warningHigh: 800,
  },
  turbidity: {
    color: '#8b5cf6',
    gradientId: 'turbGradient',
    label: 'Turbidity (NTU)',
    domain: [0, 30],
    optimal: 5,
    warningLow: 0,
    warningHigh: 20,
  },
  tds: {
    color: '#f97316',
    gradientId: 'tdsGradient',
    label: 'TDS (ppm)',
    domain: [0, 600],
    optimal: 250,
    warningLow: 100,
    warningHigh: 500,
  },
};

const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (!active || !payload || !payload.length) return null;

  const config = metric !== 'combined' ? CHART_CONFIG[metric as keyof typeof CHART_CONFIG] : null;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(2)}
          </span>
        </div>
      ))}
      {config && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
          Optimal range: {config.warningLow} - {config.warningHigh}
        </div>
      )}
    </div>
  );
};

export function FishCharts({ data, metric }: FishChartsProps) {
  const chartData = useMemo(() => {
    return data
      .filter((d) => {
        if (metric === 'combined') {
          return d.temperature !== null || d.ph !== null;
        }
        return d[metric] !== null;
      })
      .map((d) => ({
        time: new Date(d.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        fullTime: new Date(d.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        temperature: d.temperature,
        ph: d.ph,
        ecValue: d.ecValue,
        turbidity: d.turbidity,
        tds: d.tds,
        value: metric !== 'combined' ? d[metric] : null,
      }))
      .reverse();
  }, [data, metric]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-2 text-sm">No data available</p>
          <p className="mt-1 text-xs text-gray-300">Start streaming to see real-time charts</p>
        </div>
      </div>
    );
  }

  // Combined multi-metric chart
  if (metric === 'combined') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            yAxisId="temp"
            orientation="left"
            domain={[18, 32]}
            tick={{ fontSize: 10, fill: '#06b6d4' }}
            tickLine={false}
            axisLine={{ stroke: '#06b6d4', strokeWidth: 2 }}
            label={{ value: '°C', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#06b6d4' }}
          />
          <YAxis
            yAxisId="ph"
            orientation="right"
            domain={[5, 10]}
            tick={{ fontSize: 10, fill: '#10b981' }}
            tickLine={false}
            axisLine={{ stroke: '#10b981', strokeWidth: 2 }}
            label={{ value: 'pH', angle: 90, position: 'insideRight', fontSize: 10, fill: '#10b981' }}
          />
          <Tooltip content={<CustomTooltip metric="combined" />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => <span className="text-gray-600">{value}</span>}
          />
          <Area
            yAxisId="temp"
            type="monotone"
            dataKey="temperature"
            name="Temperature"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#tempGradient)"
          />
          <Line
            yAxisId="ph"
            type="monotone"
            dataKey="ph"
            name="pH Level"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Single metric chart with reference lines
  const config = CHART_CONFIG[metric];

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.color} stopOpacity={0.4} />
            <stop offset="50%" stopColor={config.color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={config.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={config.domain}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={35}
        />
        <Tooltip content={<CustomTooltip metric={metric} />} />

        {/* Warning zone reference area */}
        <ReferenceLine
          y={config.warningLow}
          stroke="#fbbf24"
          strokeDasharray="5 5"
          strokeWidth={1}
          label={{ value: 'Min', position: 'right', fontSize: 9, fill: '#fbbf24' }}
        />
        <ReferenceLine
          y={config.warningHigh}
          stroke="#fbbf24"
          strokeDasharray="5 5"
          strokeWidth={1}
          label={{ value: 'Max', position: 'right', fontSize: 9, fill: '#fbbf24' }}
        />

        {/* Optimal line */}
        <ReferenceLine
          y={config.optimal}
          stroke={config.color}
          strokeDasharray="3 3"
          strokeWidth={1}
          label={{ value: 'Optimal', position: 'right', fontSize: 9, fill: config.color }}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke={config.color}
          strokeWidth={2.5}
          fill={`url(#${config.gradientId})`}
          animationDuration={500}
          dot={false}
          activeDot={{
            r: 5,
            stroke: config.color,
            strokeWidth: 2,
            fill: 'white',
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// New: Water Quality Radar component
export function WaterQualityRadar({
  temperature,
  ph,
  ecValue,
  turbidity,
  tds,
}: {
  temperature: number | null;
  ph: number | null;
  ecValue: number | null;
  turbidity: number | null;
  tds: number | null;
}) {
  const calculateScore = (value: number | null, optimal: number, min: number, max: number): number => {
    if (value === null) return 0;
    const distance = Math.abs(value - optimal);
    const maxDistance = Math.max(optimal - min, max - optimal);
    return Math.max(0, Math.min(100, 100 - (distance / maxDistance) * 100));
  };

  const scores = [
    { label: 'Temp', value: calculateScore(temperature, 25, 18, 32), maxValue: 100 },
    { label: 'pH', value: calculateScore(ph, 7.2, 5, 10), maxValue: 100 },
    { label: 'EC', value: calculateScore(ecValue, 400, 0, 1000), maxValue: 100 },
    { label: 'Turb', value: calculateScore(turbidity, 5, 0, 50), maxValue: 100 },
    { label: 'TDS', value: calculateScore(tds, 250, 0, 600), maxValue: 100 },
  ];

  const overallScore = scores.reduce((acc, s) => acc + s.value, 0) / scores.length;

  // SVG Radar chart implementation
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const angleStep = (2 * Math.PI) / scores.length;

  const points = scores.map((score, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const normalizedValue = score.value / 100;
    return {
      x: center + radius * normalizedValue * Math.cos(angle),
      y: center + radius * normalizedValue * Math.sin(angle),
      labelX: center + (radius + 20) * Math.cos(angle),
      labelY: center + (radius + 20) * Math.sin(angle),
      label: score.label,
      value: score.value,
    };
  });

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Grid levels
  const gridLevels = [0.25, 0.5, 0.75, 1].map((level) =>
    scores.map((_, index) => {
      const angle = index * angleStep - Math.PI / 2;
      return {
        x: center + radius * level * Math.cos(angle),
        y: center + radius * level * Math.sin(angle),
      };
    })
  );

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid */}
        {gridLevels.map((level, levelIndex) => (
          <polygon
            key={levelIndex}
            points={level.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {scores.map((_, index) => {
          const angle = index * angleStep - Math.PI / 2;
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(6, 182, 212, 0.2)"
          stroke="#06b6d4"
          strokeWidth={2}
          className="transition-all duration-500"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="#06b6d4"
            stroke="white"
            strokeWidth={2}
          />
        ))}

        {/* Labels */}
        {points.map((point, index) => (
          <text
            key={index}
            x={point.labelX}
            y={point.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-medium"
            fill="#6b7280"
          >
            {point.label}
          </text>
        ))}

        {/* Center score */}
        <text
          x={center}
          y={center - 5}
          textAnchor="middle"
          className="text-xl font-bold"
          fill="#06b6d4"
        >
          {overallScore.toFixed(0)}
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          className="text-xs"
          fill="#9ca3af"
        >
          Quality Score
        </text>
      </svg>
    </div>
  );
}
