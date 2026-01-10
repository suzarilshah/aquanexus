'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForecastChart } from '@/components/forecast/ForecastChart';
import { GrowthRateCard } from '@/components/forecast/GrowthRateCard';
import { PredictionTable } from '@/components/forecast/PredictionTable';
import { ModelStatus } from '@/components/forecast/ModelStatus';
import { Loader2, TrendingUp, Fish, Leaf } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface HistoricalPoint {
  timestamp: string;
  value: number;
}

interface PredictionPoint {
  timestamp: string;
  value: number;
  confidence: number;
  step: number;
  stepLabel: string;
}

interface GrowthMetrics {
  currentHeight: number;
  predictedHeight: number;
  predictedGrowth: number;
  avgGrowthRate: number;
  unit: string;
  period: string;
}

interface ForecastClientProps {
  devices: Device[];
  initialHistoricalData: HistoricalPoint[];
  initialDevice: { id: string; name: string; type: string } | null;
}

const METRIC_OPTIONS: Record<string, { value: string; label: string; unit: string }[]> = {
  plant: [
    { value: 'height', label: 'Plant Height', unit: 'cm' },
    { value: 'soilMoisture', label: 'Soil Moisture', unit: '%' },
    { value: 'temperature', label: 'Temperature', unit: '°C' },
    { value: 'humidity', label: 'Humidity', unit: '%' },
    { value: 'lightLevel', label: 'Light Level', unit: 'lux' },
  ],
  fish: [
    { value: 'temperature', label: 'Temperature', unit: '°C' },
    { value: 'ph', label: 'pH Level', unit: '' },
    { value: 'dissolvedOxygen', label: 'Dissolved Oxygen', unit: 'mg/L' },
    { value: 'turbidity', label: 'Turbidity', unit: 'NTU' },
    { value: 'tds', label: 'TDS', unit: 'ppm' },
  ],
};

export function ForecastClient({ devices, initialHistoricalData, initialDevice }: ForecastClientProps) {
  const [selectedDevice, setSelectedDevice] = useState(initialDevice?.id || devices[0]?.id || '');
  const [selectedMetric, setSelectedMetric] = useState('height');
  const [horizon, setHorizon] = useState<'short' | 'medium'>('short');
  const [isLoading, setIsLoading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalPoint[]>(initialHistoricalData);
  const [predictions, setPredictions] = useState<PredictionPoint[]>([]);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null);
  const [modelInfo, setModelInfo] = useState<{
    version: string;
    method: 'lstm' | 'statistical';
    metrics?: Record<string, number>;
  }>({ version: 'statistical_v1', method: 'statistical' });
  const [error, setError] = useState<string | null>(null);

  // Get current device type
  const currentDevice = devices.find(d => d.id === selectedDevice);
  const deviceType = currentDevice?.type || 'plant';
  const metricOptions = METRIC_OPTIONS[deviceType] || METRIC_OPTIONS.plant;

  // Update metric when device changes
  useEffect(() => {
    const defaultMetric = deviceType === 'plant' ? 'height' : 'temperature';
    setSelectedMetric(defaultMetric);
  }, [deviceType]);

  // Fetch historical data when device or metric changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!selectedDevice) return;

      try {
        const response = await fetch(
          `/api/ml/data?deviceId=${selectedDevice}&type=${deviceType === 'plant' && selectedMetric === 'height' ? 'growth' : deviceType}&metric=${selectedMetric}&limit=168`
        );
        const data = await response.json();

        if (data.success && data.data) {
          setHistoricalData(
            data.data.map((d: Record<string, unknown>) => ({
              timestamp: d.timestamp as string,
              value: d[selectedMetric] as number || d.height as number || 0,
            })).filter((d: HistoricalPoint) => d.value !== null && !isNaN(d.value))
          );
        }
      } catch (err) {
        console.error('Error fetching historical data:', err);
      }
    };

    fetchHistoricalData();
  }, [selectedDevice, selectedMetric, deviceType]);

  // Generate forecast
  const generateForecast = async () => {
    if (!selectedDevice) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDevice,
          metricType: selectedMetric,
          horizon,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPredictions(data.predictions);
        setGrowthMetrics(data.growthMetrics);
        setModelInfo({
          version: data.modelVersion,
          method: data.predictionMethod,
        });
      } else {
        setError(data.error || 'Failed to generate forecast');
      }
    } catch (err) {
      setError('Failed to generate forecast. Please try again.');
      console.error('Forecast error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger model training
  const triggerTraining = async () => {
    if (!selectedDevice) return;

    setIsTraining(true);

    try {
      const response = await fetch('/api/ml/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDevice,
          modelType: selectedMetric,
          horizon,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show training instructions (in production, this would be handled differently)
        alert(`Training job created! ${data.instructions?.manual || ''}`);
      } else {
        setError(data.error || 'Failed to trigger training');
      }
    } catch (err) {
      setError('Failed to trigger training. Please try again.');
      console.error('Training error:', err);
    } finally {
      setIsTraining(false);
    }
  };

  const currentMetricOption = metricOptions.find(m => m.value === selectedMetric);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Device selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.type === 'plant' ? '🌱' : '🐟'} {device.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Metric selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {metricOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Horizon selector */}
            <div className="min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Horizon</label>
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setHorizon('short')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                    horizon === 'short'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  24h
                </button>
                <button
                  onClick={() => setHorizon('medium')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r ${
                    horizon === 'medium'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  7 days
                </button>
              </div>
            </div>

            {/* Generate button */}
            <div className="pt-6">
              <button
                onClick={generateForecast}
                disabled={isLoading || !selectedDevice}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Generate Forecast
                  </>
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Model Status */}
      <ModelStatus
        modelVersion={modelInfo.version}
        predictionMethod={modelInfo.method}
        metrics={modelInfo.metrics}
        isTraining={isTraining}
        onTriggerTraining={triggerTraining}
      />

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {deviceType === 'plant' ? (
              <Leaf className="h-5 w-5 text-green-600" />
            ) : (
              <Fish className="h-5 w-5 text-cyan-600" />
            )}
            {currentMetricOption?.label || 'Metric'} Forecast
          </CardTitle>
          <CardDescription>
            Historical data and {horizon === 'short' ? '24-hour' : '7-day'} predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastChart
            historicalData={historicalData}
            predictions={predictions}
            metricType={selectedMetric}
            horizon={horizon}
          />
        </CardContent>
      </Card>

      {/* Growth Metrics & Prediction Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedMetric === 'height' && deviceType === 'plant' && (
          <GrowthRateCard metrics={growthMetrics} isLoading={isLoading} />
        )}
        <PredictionTable
          predictions={predictions}
          metricType={selectedMetric}
          unit={currentMetricOption?.unit || ''}
          isLoading={isLoading}
        />
      </div>

      {/* Info section */}
      {!predictions.length && !isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center max-w-lg mx-auto">
              <TrendingUp className="mx-auto h-12 w-12 text-indigo-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Forecast</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select your device and metric, then click &quot;Generate Forecast&quot; to see predictions
                based on your historical data.
              </p>
              <div className="text-xs text-gray-400">
                <p>Powered by LSTM neural networks for accurate time-series forecasting.</p>
                <p className="mt-1">Your 6 months of data will be used to train and improve predictions.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
