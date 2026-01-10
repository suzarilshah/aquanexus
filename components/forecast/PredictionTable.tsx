'use client';

import { Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PredictionPoint {
  timestamp: string;
  value: number;
  confidence: number;
  step: number;
  stepLabel: string;
}

interface PredictionTableProps {
  predictions: PredictionPoint[];
  metricType: string;
  unit: string;
  isLoading?: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let colorClass = 'bg-emerald-100 text-emerald-800';

  if (percentage < 70) {
    colorClass = 'bg-amber-100 text-amber-800';
  } else if (percentage < 85) {
    colorClass = 'bg-blue-100 text-blue-800';
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {percentage}%
    </span>
  );
}

export function PredictionTable({ predictions, metricType, unit, isLoading }: PredictionTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prediction Details</CardTitle>
          <CardDescription>Step-by-step forecast values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prediction Details</CardTitle>
          <CardDescription>Step-by-step forecast values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-400">
            <div className="text-center">
              <Clock className="mx-auto h-8 w-8 mb-2" />
              <p className="text-sm">No predictions yet</p>
              <p className="text-xs mt-1">Generate a forecast to see predictions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format metric label
  const metricLabels: Record<string, string> = {
    height: 'Plant Height',
    temperature: 'Temperature',
    ph: 'pH Level',
    dissolvedOxygen: 'Dissolved Oxygen',
    soilMoisture: 'Soil Moisture',
    lightLevel: 'Light Level',
    humidity: 'Humidity',
    turbidity: 'Turbidity',
    tds: 'TDS',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-600" />
          Prediction Details
        </CardTitle>
        <CardDescription>{metricLabels[metricType] || metricType} forecast values</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Step
                </th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predicted Value
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {predictions.map((prediction, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-3 text-sm text-gray-600">
                    {prediction.stepLabel}
                  </td>
                  <td className="py-2 px-3 text-sm text-gray-900">
                    {new Date(prediction.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 px-3 text-sm text-right font-medium text-gray-900">
                    {prediction.value} {unit}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <ConfidenceBadge confidence={prediction.confidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Min</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.min(...predictions.map(p => p.value)).toFixed(2)} {unit}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Max</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.max(...predictions.map(p => p.value)).toFixed(2)} {unit}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Confidence</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round((predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length) * 100)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
