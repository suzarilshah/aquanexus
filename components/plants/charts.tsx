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
  Bar,
  BarChart,
  Line,
  ComposedChart,
  ReferenceLine,
  Legend,
} from 'recharts';

interface PlantChartsProps {
  data: Array<{
    timestamp: string;
    height: number | null;
    temperature: number | null;
    humidity: number | null;
    pressure: number | null;
  }>;
  metric: 'height' | 'temperature' | 'humidity' | 'pressure' | 'growth' | 'environment';
}

const CHART_CONFIG = {
  height: {
    color: '#22c55e',
    gradientId: 'heightGradient',
    label: 'Height (cm)',
    domain: [0, 50] as [number, number],
    optimal: null,
  },
  temperature: {
    color: '#f97316',
    gradientId: 'tempGradient',
    label: 'Temperature (°C)',
    domain: [10, 40] as [number, number],
    optimal: 25,
    warningLow: 18,
    warningHigh: 32,
  },
  humidity: {
    color: '#06b6d4',
    gradientId: 'humidGradient',
    label: 'Humidity (%)',
    domain: [0, 100] as [number, number],
    optimal: 60,
    warningLow: 40,
    warningHigh: 80,
  },
  pressure: {
    color: '#8b5cf6',
    gradientId: 'pressGradient',
    label: 'Pressure (hPa)',
    domain: [950, 1050] as [number, number],
    optimal: 1013,
  },
};

const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (!active || !payload || !payload.length) return null;

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
    </div>
  );
};

export function PlantCharts({ data, metric }: PlantChartsProps) {
  const chartData = useMemo(() => {
    return data
      .filter((d) => {
        if (metric === 'growth' || metric === 'environment') {
          return d.height !== null || d.temperature !== null;
        }
        return d[metric] !== null;
      })
      .map((d, index, arr) => {
        // Calculate growth rate
        let growthRate = 0;
        if (index < arr.length - 1 && d.height !== null && arr[index + 1].height !== null) {
          growthRate = d.height - (arr[index + 1].height as number);
        }

        return {
          time: new Date(d.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          height: d.height,
          temperature: d.temperature,
          humidity: d.humidity,
          pressure: d.pressure ? d.pressure / 100 : null, // Convert to hPa
          value: metric !== 'growth' && metric !== 'environment'
            ? (metric === 'pressure' ? (d.pressure ? d.pressure / 100 : null) : d[metric])
            : null,
          growthRate: Math.max(0, growthRate),
        };
      })
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
          <p className="mt-1 text-xs text-gray-300">Start streaming to see growth charts</p>
        </div>
      </div>
    );
  }

  // Growth progress chart - shows height over time with growth rate bars
  if (metric === 'growth') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="heightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
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
            yAxisId="height"
            orientation="left"
            domain={[0, 'auto']}
            tick={{ fontSize: 10, fill: '#22c55e' }}
            tickLine={false}
            axisLine={{ stroke: '#22c55e', strokeWidth: 2 }}
            label={{ value: 'cm', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#22c55e' }}
          />
          <YAxis
            yAxisId="growth"
            orientation="right"
            domain={[0, 'auto']}
            tick={{ fontSize: 10, fill: '#10b981' }}
            tickLine={false}
            axisLine={{ stroke: '#10b981', strokeWidth: 2 }}
            label={{ value: 'growth', angle: 90, position: 'insideRight', fontSize: 10, fill: '#10b981' }}
          />
          <Tooltip content={<CustomTooltip metric="growth" />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => <span className="text-gray-600">{value}</span>}
          />
          <Area
            yAxisId="height"
            type="monotone"
            dataKey="height"
            name="Plant Height"
            stroke="#22c55e"
            strokeWidth={2.5}
            fill="url(#heightGradient)"
          />
          <Bar
            yAxisId="growth"
            dataKey="growthRate"
            name="Growth Rate"
            fill="#10b981"
            opacity={0.6}
            radius={[4, 4, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Environment chart - shows temperature and humidity together
  if (metric === 'environment') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
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
            domain={[10, 40]}
            tick={{ fontSize: 10, fill: '#f97316' }}
            tickLine={false}
            axisLine={{ stroke: '#f97316', strokeWidth: 2 }}
            label={{ value: '°C', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#f97316' }}
          />
          <YAxis
            yAxisId="humid"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#06b6d4' }}
            tickLine={false}
            axisLine={{ stroke: '#06b6d4', strokeWidth: 2 }}
            label={{ value: '%', angle: 90, position: 'insideRight', fontSize: 10, fill: '#06b6d4' }}
          />
          <Tooltip content={<CustomTooltip metric="environment" />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => <span className="text-gray-600">{value}</span>}
          />
          <ReferenceLine
            yAxisId="temp"
            y={25}
            stroke="#f97316"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          <ReferenceLine
            yAxisId="humid"
            y={60}
            stroke="#06b6d4"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          <Area
            yAxisId="temp"
            type="monotone"
            dataKey="temperature"
            name="Temperature"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#tempGradient)"
          />
          <Line
            yAxisId="humid"
            type="monotone"
            dataKey="humidity"
            name="Humidity"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Standard single metric charts
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
          width={40}
        />
        <Tooltip content={<CustomTooltip metric={metric} />} />

        {/* Reference lines for optimal ranges */}
        {config.optimal && (
          <ReferenceLine
            y={config.optimal}
            stroke={config.color}
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{ value: 'Optimal', position: 'right', fontSize: 9, fill: config.color }}
          />
        )}

        {'warningLow' in config && config.warningLow && (
          <ReferenceLine
            y={config.warningLow}
            stroke="#fbbf24"
            strokeDasharray="5 5"
            strokeWidth={1}
          />
        )}

        {'warningHigh' in config && config.warningHigh && (
          <ReferenceLine
            y={config.warningHigh}
            stroke="#fbbf24"
            strokeDasharray="5 5"
            strokeWidth={1}
          />
        )}

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

// Environment Health Radar
export function EnvironmentRadar({
  temperature,
  humidity,
  pressure,
}: {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
}) {
  const calculateScore = (value: number | null, optimal: number, min: number, max: number): number => {
    if (value === null) return 0;
    const distance = Math.abs(value - optimal);
    const maxDistance = Math.max(optimal - min, max - optimal);
    return Math.max(0, Math.min(100, 100 - (distance / maxDistance) * 100));
  };

  const scores = [
    { label: 'Temp', value: calculateScore(temperature, 25, 10, 40), maxValue: 100, color: '#f97316' },
    { label: 'Humidity', value: calculateScore(humidity, 60, 20, 95), maxValue: 100, color: '#06b6d4' },
    { label: 'Pressure', value: calculateScore(pressure ? pressure / 100 : null, 1013, 950, 1050), maxValue: 100, color: '#8b5cf6' },
  ];

  const overallScore = scores.reduce((acc, s) => acc + s.value, 0) / scores.length;

  const size = 180;
  const center = size / 2;
  const radius = 60;
  const angleStep = (2 * Math.PI) / scores.length;

  const points = scores.map((score, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const normalizedValue = score.value / 100;
    return {
      x: center + radius * normalizedValue * Math.cos(angle),
      y: center + radius * normalizedValue * Math.sin(angle),
      labelX: center + (radius + 25) * Math.cos(angle),
      labelY: center + (radius + 25) * Math.sin(angle),
      ...score,
    };
  });

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
          fill="rgba(34, 197, 94, 0.2)"
          stroke="#22c55e"
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
            fill={point.color}
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
            fill={point.color}
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
          fill="#22c55e"
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
          Health
        </text>
      </svg>
    </div>
  );
}

// Growth Progress Ring
export function GrowthProgressRing({
  currentHeight,
  targetHeight = 50,
}: {
  currentHeight: number | null;
  targetHeight?: number;
}) {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const percentage = currentHeight !== null
    ? Math.min(100, (currentHeight / targetHeight) * 100)
    : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct < 25) return '#ef4444';
    if (pct < 50) return '#f59e0b';
    if (pct < 75) return '#22c55e';
    return '#10b981';
  };

  const color = getColor(percentage);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
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
              filter: `drop-shadow(0 0 8px ${color}40)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {currentHeight?.toFixed(1) ?? '--'}
          </span>
          <span className="text-xs text-gray-400">cm</span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-medium text-gray-600">Growth Progress</p>
        <p className="text-xs text-gray-400">Target: {targetHeight} cm</p>
      </div>
    </div>
  );
}
