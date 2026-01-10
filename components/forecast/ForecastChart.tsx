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
  ComposedChart,
  ReferenceLine,
} from 'recharts';

interface PredictionPoint {
  timestamp: string;
  value: number;
  confidence: number;
  step: number;
  stepLabel: string;
}

interface HistoricalPoint {
  timestamp: string;
  value: number;
}

interface ForecastChartProps {
  historicalData: HistoricalPoint[];
  predictions: PredictionPoint[];
  metricType: string;
  horizon: 'short' | 'medium';
}

const METRIC_CONFIG: Record<string, { color: string; predColor: string; label: string; unit: string }> = {
  height: {
    color: '#10b981',
    predColor: '#6366f1',
    label: 'Plant Height',
    unit: 'cm',
  },
  temperature: {
    color: '#f97316',
    predColor: '#8b5cf6',
    label: 'Temperature',
    unit: '°C',
  },
  ph: {
    color: '#06b6d4',
    predColor: '#a855f7',
    label: 'pH Level',
    unit: '',
  },
  dissolvedOxygen: {
    color: '#3b82f6',
    predColor: '#ec4899',
    label: 'Dissolved Oxygen',
    unit: 'mg/L',
  },
  soilMoisture: {
    color: '#84cc16',
    predColor: '#f43f5e',
    label: 'Soil Moisture',
    unit: '%',
  },
  lightLevel: {
    color: '#eab308',
    predColor: '#14b8a6',
    label: 'Light Level',
    unit: 'lux',
  },
  humidity: {
    color: '#06b6d4',
    predColor: '#f59e0b',
    label: 'Humidity',
    unit: '%',
  },
};

export function ForecastChart({ historicalData, predictions, metricType, horizon }: ForecastChartProps) {
  const config = METRIC_CONFIG[metricType] || METRIC_CONFIG.height;

  const chartData = useMemo(() => {
    // Process historical data
    const historical = historicalData.map((d) => ({
      time: new Date(d.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: horizon === 'short' ? '2-digit' : undefined,
      }),
      timestamp: d.timestamp,
      historical: d.value,
      predicted: null as number | null,
      confidence: null as number | null,
      upperBound: null as number | null,
      lowerBound: null as number | null,
      type: 'historical',
    }));

    // Process predictions
    const predicted = predictions.map((d) => ({
      time: new Date(d.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: horizon === 'short' ? '2-digit' : undefined,
      }),
      timestamp: d.timestamp,
      historical: null as number | null,
      predicted: d.value,
      confidence: d.confidence,
      upperBound: d.value * (1 + (1 - d.confidence) * 0.5),
      lowerBound: d.value * (1 - (1 - d.confidence) * 0.5),
      type: 'predicted',
    }));

    // Connect historical to predictions
    if (historical.length > 0 && predicted.length > 0) {
      const lastHistorical = historical[historical.length - 1];
      predicted[0] = {
        ...predicted[0],
        historical: lastHistorical.historical,
      };
    }

    return [...historical, ...predicted];
  }, [historicalData, predictions, horizon]);

  // Find the transition point
  const transitionIndex = historicalData.length;

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-gray-400">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="mt-2 text-sm">No forecast data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-gray-600">Historical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.predColor }} />
          <span className="text-gray-600">Predicted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-8 rounded opacity-30" style={{ backgroundColor: config.predColor }} />
          <span className="text-gray-600">Confidence Band</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={config.color} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.predColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={config.predColor} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.predColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={config.predColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#e5e7eb' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#e5e7eb' }}
            width={50}
            tickFormatter={(value) => `${value}${config.unit ? ` ${config.unit}` : ''}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelStyle={{ color: '#374151', fontWeight: 500, marginBottom: '8px' }}
            formatter={(value: number | null, name: string) => {
              if (value === null) return ['-', name];
              const label = name === 'historical' ? 'Historical' : name === 'predicted' ? 'Predicted' : name;
              return [`${value.toFixed(2)} ${config.unit}`, label];
            }}
          />

          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="none"
            fill="url(#confidenceGradient)"
            fillOpacity={1}
          />
          <Area
            type="monotone"
            dataKey="lowerBound"
            stroke="none"
            fill="white"
            fillOpacity={1}
          />

          {/* Historical data */}
          <Area
            type="monotone"
            dataKey="historical"
            stroke={config.color}
            strokeWidth={2}
            fill="url(#historicalGradient)"
            connectNulls={false}
          />

          {/* Predicted data */}
          <Line
            type="monotone"
            dataKey="predicted"
            stroke={config.predColor}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: config.predColor, strokeWidth: 0, r: 4 }}
            connectNulls={false}
          />

          {/* Transition line */}
          {transitionIndex > 0 && transitionIndex < chartData.length && (
            <ReferenceLine
              x={chartData[transitionIndex - 1]?.time}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              label={{ value: 'Now', position: 'top', fontSize: 10, fill: '#6b7280' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
