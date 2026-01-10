'use client';

import { TrendingUp, TrendingDown, Minus, Ruler, Calendar, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GrowthMetrics {
  currentHeight: number;
  predictedHeight: number;
  predictedGrowth: number;
  avgGrowthRate: number;
  unit: string;
  period: string;
}

interface GrowthRateCardProps {
  metrics: GrowthMetrics | null;
  isLoading?: boolean;
}

export function GrowthRateCard({ metrics, isLoading }: GrowthRateCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Growth Metrics</CardTitle>
          <CardDescription>Plant growth predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Growth Metrics</CardTitle>
          <CardDescription>Plant growth predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-400">
            <div className="text-center">
              <Ruler className="mx-auto h-8 w-8 mb-2" />
              <p className="text-sm">No growth data available</p>
              <p className="text-xs mt-1">Make a prediction to see growth metrics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const growthTrend = metrics.predictedGrowth > 0 ? 'up' : metrics.predictedGrowth < 0 ? 'down' : 'neutral';
  const TrendIcon = growthTrend === 'up' ? TrendingUp : growthTrend === 'down' ? TrendingDown : Minus;
  const trendColor = growthTrend === 'up' ? 'text-emerald-600' : growthTrend === 'down' ? 'text-red-600' : 'text-gray-600';
  const trendBg = growthTrend === 'up' ? 'bg-emerald-50' : growthTrend === 'down' ? 'bg-red-50' : 'bg-gray-50';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-600" />
          Growth Metrics
        </CardTitle>
        <CardDescription>Predicted growth over {metrics.period}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Current Height */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Ruler className="h-4 w-4" />
              Current Height
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.currentHeight} <span className="text-base font-normal text-gray-500">{metrics.unit}</span>
            </div>
          </div>

          {/* Predicted Height */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Calendar className="h-4 w-4" />
              Predicted Height
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              {metrics.predictedHeight} <span className="text-base font-normal text-gray-500">{metrics.unit}</span>
            </div>
          </div>

          {/* Expected Growth */}
          <div className={`rounded-lg p-4 ${trendBg}`}>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              Expected Growth
            </div>
            <div className={`text-2xl font-bold ${trendColor}`}>
              {metrics.predictedGrowth > 0 ? '+' : ''}{metrics.predictedGrowth} <span className="text-base font-normal">{metrics.unit}</span>
            </div>
          </div>

          {/* Growth Rate */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Activity className="h-4 w-4" />
              Growth Rate
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.avgGrowthRate > 0 ? '+' : ''}{metrics.avgGrowthRate} <span className="text-base font-normal text-gray-500">{metrics.unit}/day</span>
            </div>
          </div>
        </div>

        {/* Growth Summary */}
        <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
          <p className="text-sm text-green-800">
            {growthTrend === 'up' ? (
              <>Your plant is expected to grow <strong>{Math.abs(metrics.predictedGrowth)} {metrics.unit}</strong> over the next {metrics.period}. Great progress!</>
            ) : growthTrend === 'down' ? (
              <>Growth may slow down. Consider checking environmental conditions.</>
            ) : (
              <>Growth is expected to remain stable over the next {metrics.period}.</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
