'use client';

import { useState } from 'react';
import { Loader2, Brain, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Device {
  id: string;
  name: string;
  type: 'fish' | 'plant';
}

interface AIAnalysisPanelProps {
  devices: Device[];
  isConfigured: boolean;
}

interface AnalysisResult {
  model1: {
    verdict: string;
    confidence: number;
    reasoning: string;
    recommendations: string[];
    metrics: { healthScore: number; riskLevel: string };
  };
  model2: {
    verdict: string;
    confidence: number;
    reasoning: string;
    recommendations: string[];
    metrics: { healthScore: number; riskLevel: string };
  };
  consensus: {
    verdict: string;
    confidence: number;
    reasoning: string;
    recommendations: string[];
    metrics: { healthScore: number; riskLevel: string };
  };
  agreementScore: number;
  errorMargin: number;
  calibrationScore: number;
}

export function AIAnalysisPanel({ devices, isConfigured }: AIAnalysisPanelProps) {
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id || '');
  const [timeRange, setTimeRange] = useState('24h');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const runAnalysis = async () => {
    if (!selectedDevice) return;

    setIsAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDevice,
          timeRange,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'high':
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            disabled={isAnalyzing}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            disabled={isAnalyzing}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || !isConfigured}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Run Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 pt-4 border-t border-gray-200">
          {/* Consensus Overview */}
          <div className="rounded-lg bg-gray-50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Consensus Analysis</h3>
                <p className="mt-1 text-sm text-gray-600">{result.consensus.verdict}</p>
              </div>
              <div className="text-right">
                <div className={cn('text-3xl font-bold', getScoreColor(result.consensus.metrics.healthScore))}>
                  {result.consensus.metrics.healthScore}
                </div>
                <p className="text-xs text-gray-500">Health Score</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {(result.agreementScore * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-gray-500">Agreement</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {(result.errorMargin * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">Error Margin</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg flex flex-col items-center justify-center">
                {getRiskIcon(result.consensus.metrics.riskLevel)}
                <p className="text-xs text-gray-500 mt-1 capitalize">{result.consensus.metrics.riskLevel} Risk</p>
              </div>
            </div>

            {/* Recommendations */}
            {result.consensus.recommendations.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-2">
                  {result.consensus.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600">
                      <span className="mr-2 text-blue-500">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Individual Model Results */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Model 1 */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-900">Model 1</h4>
                <span className="text-sm text-blue-700">
                  {(result.model1.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <p className="text-sm text-blue-800">{result.model1.verdict}</p>
              <div className="mt-3 flex items-center space-x-4 text-sm">
                <span className={cn('font-medium', getScoreColor(result.model1.metrics.healthScore))}>
                  Score: {result.model1.metrics.healthScore}
                </span>
                <span className="capitalize text-gray-600">{result.model1.metrics.riskLevel} risk</span>
              </div>
            </div>

            {/* Model 2 */}
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-purple-900">Model 2</h4>
                <span className="text-sm text-purple-700">
                  {(result.model2.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <p className="text-sm text-purple-800">{result.model2.verdict}</p>
              <div className="mt-3 flex items-center space-x-4 text-sm">
                <span className={cn('font-medium', getScoreColor(result.model2.metrics.healthScore))}>
                  Score: {result.model2.metrics.healthScore}
                </span>
                <span className="capitalize text-gray-600">{result.model2.metrics.riskLevel} risk</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
