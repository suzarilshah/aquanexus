'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Fish,
  Leaf,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SessionProgress {
  percentage: number;
  rowsStreamed: number;
  totalRows: number;
  timeRemainingMs: number;
  estimatedCompletion: string;
  timeRemainingFormatted: string;
  lastDataSentAgo: string | null;
}

interface Session {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  deviceType: 'fish' | 'plant';
  totalRows: number;
  lastRowSent: number;
  rowsStreamed: number;
  sessionStartedAt: string;
  expectedCompletionAt: string | null;
  lastDataSentAt: string | null;
  errorCount: number;
  consecutiveErrors: number;
  lastErrorMessage: string | null;
  progress: SessionProgress;
}

interface Device {
  id: string;
  name: string;
  mac: string;
}

interface DatasetInfo {
  totalRows: number;
  firstTimestamp: string;
  lastTimestamp: string;
  durationDays: number;
}

interface StreamingControlPanelProps {
  fishSession: Session | null;
  plantSession: Session | null;
  fishDevice: Device | null;
  plantDevice: Device | null;
  fishDataset: DatasetInfo;
  plantDataset: DatasetInfo;
  isConfigured: boolean;
  isEnabled: boolean;
}

export function StreamingControlPanel({
  fishSession,
  plantSession,
  fishDevice,
  plantDevice,
  fishDataset,
  plantDataset,
  isConfigured,
  isEnabled,
}: StreamingControlPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState<'fish' | 'plant' | null>(null);

  const handleAction = async (
    action: 'start' | 'pause' | 'resume' | 'reset',
    deviceType: 'fish' | 'plant',
    retainData?: boolean
  ) => {
    setActionLoading(`${action}-${deviceType}`);
    setError(null);

    try {
      const endpoint = action === 'reset'
        ? `/api/virtual-devices/session/reset`
        : `/api/virtual-devices/session/${action}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceType,
          ...(action === 'reset' && { retainData }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      // Refresh the page to show updated status
      startTransition(() => {
        router.refresh();
      });

      if (action === 'reset') {
        setShowResetDialog(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isConfigured) {
    return (
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-amber-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Virtual Devices Not Configured</h3>
              <p className="text-sm text-gray-600 mt-1">
                Please enable virtual ESP32 devices in Settings to start streaming data.
              </p>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go to Settings
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Session Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fish Session Card */}
        <SessionCard
          deviceType="fish"
          session={fishSession}
          device={fishDevice}
          dataset={fishDataset}
          actionLoading={actionLoading}
          isPending={isPending}
          onAction={handleAction}
          onResetClick={() => setShowResetDialog('fish')}
        />

        {/* Plant Session Card */}
        <SessionCard
          deviceType="plant"
          session={plantSession}
          device={plantDevice}
          dataset={plantDataset}
          actionLoading={actionLoading}
          isPending={isPending}
          onAction={handleAction}
          onResetClick={() => setShowResetDialog('plant')}
        />
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <ResetConfirmationDialog
          deviceType={showResetDialog}
          isLoading={actionLoading === `reset-${showResetDialog}`}
          onConfirm={(retainData) => handleAction('reset', showResetDialog, retainData)}
          onCancel={() => setShowResetDialog(null)}
        />
      )}
    </div>
  );
}

// Session Card Component
function SessionCard({
  deviceType,
  session,
  device,
  dataset,
  actionLoading,
  isPending,
  onAction,
  onResetClick,
}: {
  deviceType: 'fish' | 'plant';
  session: Session | null;
  device: Device | null;
  dataset: DatasetInfo;
  actionLoading: string | null;
  isPending: boolean;
  onAction: (action: 'start' | 'pause' | 'resume', deviceType: 'fish' | 'plant') => void;
  onResetClick: () => void;
}) {
  const isFish = deviceType === 'fish';
  const Icon = isFish ? Fish : Leaf;
  const colorClass = isFish ? 'blue' : 'green';

  const isLoading = (action: string) => actionLoading === `${action}-${deviceType}` || isPending;

  const getStatusBadge = () => {
    if (!session) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          Not Started
        </span>
      );
    }

    const statusConfig = {
      active: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active' },
      paused: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Paused' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Failed' },
    };

    const config = statusConfig[session.status];

    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', config.bg, config.text)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
        {config.label}
      </span>
    );
  };

  return (
    <Card className={cn(
      'transition-all duration-200',
      device ? `border-${colorClass}-200` : 'border-gray-200 opacity-60'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={cn(
              'p-2 rounded-lg',
              isFish ? 'bg-blue-100' : 'bg-green-100'
            )}>
              <Icon className={cn('h-5 w-5', isFish ? 'text-blue-600' : 'text-green-600')} />
            </div>
            {isFish ? 'Fish' : 'Plant'} Streaming
          </CardTitle>
          {getStatusBadge()}
        </div>
        {device && (
          <CardDescription className="font-mono text-xs">{device.mac}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!device ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No {deviceType} device configured</p>
            <Link
              href="/dashboard/settings"
              className={cn(
                'inline-flex items-center text-xs mt-2',
                isFish ? 'text-blue-600 hover:text-blue-700' : 'text-green-600 hover:text-green-700'
              )}
            >
              Configure in Settings
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </div>
        ) : (
          <>
            {/* Progress Section */}
            {session && (
              <div className="space-y-3">
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{session.progress.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isFish ? 'bg-blue-500' : 'bg-green-500'
                      )}
                      style={{ width: `${session.progress.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Row {session.lastRowSent} of {session.totalRows}</span>
                    <span>{session.progress.rowsStreamed} streamed</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{session.progress.timeRemainingFormatted || 'Calculating...'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(session.sessionStartedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <span>{session.progress.lastDataSentAgo || 'Never'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Database className="h-4 w-4 text-gray-400" />
                    <span>{dataset.totalRows} rows total</span>
                  </div>
                </div>

                {/* Error Display */}
                {session.errorCount > 0 && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{session.errorCount} errors ({session.consecutiveErrors} consecutive)</span>
                    </div>
                    {session.lastErrorMessage && (
                      <p className="text-xs text-red-600 mt-1 truncate">{session.lastErrorMessage}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dataset Info (when no session) */}
            {!session && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Dataset: {dataset.totalRows} readings over {dataset.durationDays} days</span>
                </div>
                <p className="text-xs text-gray-500">
                  Streaming at 1:1 real-time will take approximately {dataset.durationDays} days.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {!session || session.status === 'completed' || session.status === 'failed' ? (
                <button
                  onClick={() => onAction('start', deviceType)}
                  disabled={isLoading('start')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors',
                    isFish ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700',
                    isLoading('start') && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isLoading('start') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Start Streaming
                </button>
              ) : session.status === 'active' ? (
                <button
                  onClick={() => onAction('pause', deviceType)}
                  disabled={isLoading('pause')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
                >
                  {isLoading('pause') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  Pause
                </button>
              ) : session.status === 'paused' ? (
                <button
                  onClick={() => onAction('resume', deviceType)}
                  disabled={isLoading('resume')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors',
                    isFish ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700',
                    isLoading('resume') && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isLoading('resume') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Resume
                </button>
              ) : null}

              {session && (
                <button
                  onClick={onResetClick}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Reset Confirmation Dialog
function ResetConfirmationDialog({
  deviceType,
  isLoading,
  onConfirm,
  onCancel,
}: {
  deviceType: 'fish' | 'plant';
  isLoading: boolean;
  onConfirm: (retainData: boolean) => void;
  onCancel: () => void;
}) {
  const [retainData, setRetainData] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <RotateCcw className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Reset {deviceType === 'fish' ? 'Fish' : 'Plant'} Session</h3>
            <p className="text-sm text-gray-500">Start streaming from the beginning</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-sm text-gray-600">
            This will create a new streaming session starting from row 1 of the dataset.
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="retainData"
                checked={retainData}
                onChange={() => setRetainData(true)}
                className="h-4 w-4 text-purple-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Keep existing data</p>
                <p className="text-xs text-gray-500">Previous readings will remain in the database</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="retainData"
                checked={!retainData}
                onChange={() => setRetainData(false)}
                className="h-4 w-4 text-red-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Delete all data</p>
                <p className="text-xs text-red-500">All readings and logs will be permanently deleted</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(retainData)}
            disabled={isLoading}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2',
              retainData ? 'bg-purple-600 hover:bg-purple-700' : 'bg-red-600 hover:bg-red-700',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Session'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
