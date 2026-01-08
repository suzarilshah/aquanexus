'use client';

import { cn } from '@/lib/utils';
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Analysis {
  id: string;
  deviceId: string;
  agreementScore: number;
  errorMargin: number;
  timeRange: string;
  createdAt: Date;
  consensusVerdict: {
    verdict: string;
    confidence: number;
    metrics: { healthScore: number; riskLevel: string };
  } | null;
}

interface Device {
  id: string;
  name: string;
}

interface AIAnalysisHistoryProps {
  analyses: Analysis[];
  devices: Device[];
}

export function AIAnalysisHistory({ analyses, devices }: AIAnalysisHistoryProps) {
  const getDeviceName = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    return device?.name || 'Unknown Device';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'high':
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-100 text-emerald-700';
    if (score >= 0.6) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Device
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time Range
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Health Score
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Agreement
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Risk
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {analyses.map((analysis) => (
            <tr key={analysis.id} className="hover:bg-gray-50">
              <td className="py-3 px-4">
                <span className="text-sm font-medium text-gray-900">
                  {getDeviceName(analysis.deviceId)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center text-sm text-gray-600">
                  <Clock className="mr-1 h-3 w-3" />
                  {analysis.timeRange}
                </span>
              </td>
              <td className="py-3 px-4">
                {analysis.consensusVerdict ? (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      analysis.consensusVerdict.metrics.healthScore >= 70
                        ? 'bg-emerald-100 text-emerald-700'
                        : analysis.consensusVerdict.metrics.healthScore >= 50
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {analysis.consensusVerdict.metrics.healthScore}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">--</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    getScoreColor(analysis.agreementScore)
                  )}
                >
                  {(analysis.agreementScore * 100).toFixed(0)}%
                </span>
              </td>
              <td className="py-3 px-4">
                {analysis.consensusVerdict && (
                  <div className="flex items-center space-x-1">
                    {getRiskIcon(analysis.consensusVerdict.metrics.riskLevel)}
                    <span className="text-sm text-gray-600 capitalize">
                      {analysis.consensusVerdict.metrics.riskLevel}
                    </span>
                  </div>
                )}
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-500">{formatDate(analysis.createdAt)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
