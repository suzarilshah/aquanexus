'use client';

import { Brain, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';

interface ModelStatusProps {
  modelVersion: string;
  predictionMethod: 'lstm' | 'statistical';
  lastUpdated?: string;
  metrics?: {
    test_mae?: number;
    mape?: number;
    r2?: number;
  };
  isTraining?: boolean;
  onTriggerTraining?: () => void;
}

export function ModelStatus({
  modelVersion,
  predictionMethod,
  lastUpdated,
  metrics,
  isTraining,
  onTriggerTraining,
}: ModelStatusProps) {
  const isMLModel = predictionMethod === 'lstm';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${isMLModel ? 'bg-indigo-100' : 'bg-amber-100'}`}>
            <Brain className={`h-5 w-5 ${isMLModel ? 'text-indigo-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">Prediction Model</span>
              {isMLModel ? (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  LSTM
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Statistical
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Version: {modelVersion}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            {isTraining ? (
              <>
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-600">Training...</span>
              </>
            ) : isMLModel ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-emerald-600">Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600">Fallback Mode</span>
              </>
            )}
          </div>

          {/* Train button */}
          {onTriggerTraining && (
            <button
              onClick={onTriggerTraining}
              disabled={isTraining}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isTraining ? 'animate-spin' : ''}`} />
              {isTraining ? 'Training...' : 'Retrain'}
            </button>
          )}
        </div>
      </div>

      {/* Model metrics */}
      {metrics && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
          {metrics.test_mae !== undefined && (
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider">MAE</div>
              <div className="text-lg font-semibold text-gray-900">{metrics.test_mae.toFixed(4)}</div>
            </div>
          )}
          {metrics.mape !== undefined && (
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider">MAPE</div>
              <div className="text-lg font-semibold text-gray-900">{metrics.mape.toFixed(2)}%</div>
            </div>
          )}
          {metrics.r2 !== undefined && (
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider">R²</div>
              <div className="text-lg font-semibold text-gray-900">{metrics.r2.toFixed(4)}</div>
            </div>
          )}
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          Last trained: {new Date(lastUpdated).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )}

      {/* Fallback notice */}
      {!isMLModel && (
        <div className="mt-3 p-2 bg-amber-50 rounded text-xs text-amber-700">
          Using statistical forecasting. Train an LSTM model for better accuracy with your 6 months of data.
        </div>
      )}
    </div>
  );
}
