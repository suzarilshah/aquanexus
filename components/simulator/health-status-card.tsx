'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Server,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  lastCronSuccess: Date | string | null;
  lastCronAttempt: Date | string | null;
  timeSinceLastCron: number | null;
  isOverdue: boolean;
  activeDevices: number;
  activeSessions: number;
  orphanedSessions: number;
  consecutiveFailures: number;
  syncStatus: 'synced' | 'out_of_sync' | 'syncing' | 'unknown';
  issues: string[];
}

interface HealthStatusCardProps {
  health: HealthCheckResult | null;
}

export function HealthStatusCard({ health }: HealthStatusCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/virtual-devices/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncResult({
        success: true,
        message: `Synced successfully. Sessions created: ${data.syncResult.actions.sessionsCreated}, cleaned up: ${data.syncResult.actions.sessionsCleanedUp}`,
      });

      // Refresh the page to show updated status
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusConfig = (status: string | undefined) => {
    switch (status) {
      case 'healthy':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-100',
          borderColor: 'border-emerald-200',
          label: 'Healthy',
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'text-amber-500',
          bgColor: 'bg-amber-100',
          borderColor: 'border-amber-200',
          label: 'Degraded',
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          label: 'Failed',
        };
      default:
        return {
          icon: HelpCircle,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          label: 'Unknown',
        };
    }
  };

  const getSyncStatusConfig = (status: string | undefined) => {
    switch (status) {
      case 'synced':
        return { color: 'text-emerald-600', label: 'Synced' };
      case 'out_of_sync':
        return { color: 'text-amber-600', label: 'Out of Sync' };
      case 'syncing':
        return { color: 'text-blue-600', label: 'Syncing...' };
      default:
        return { color: 'text-gray-600', label: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig(health?.status);
  const syncConfig = getSyncStatusConfig(health?.syncStatus);
  const StatusIcon = statusConfig.icon;

  const formatTimestamp = (timestamp: Date | string | null) => {
    if (!timestamp) return 'Never';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString();
  };

  const formatMinutes = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h ago`;
  };

  return (
    <Card className={cn('transition-all duration-200', statusConfig.borderColor)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', statusConfig.bgColor)}>
              <Activity className={cn('h-5 w-5', statusConfig.color)} />
            </div>
            System Health
          </CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                statusConfig.bgColor,
                statusConfig.color
              )}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig.label}
            </span>
            <button
              onClick={handleSync}
              disabled={isSyncing || isPending}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                'bg-purple-100 text-purple-700 hover:bg-purple-200',
                (isSyncing || isPending) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSyncing || isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Now
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sync Result Message */}
        {syncResult && (
          <div
            className={cn(
              'p-3 rounded-lg text-sm',
              syncResult.success
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}
          >
            {syncResult.message}
          </div>
        )}

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Clock className="h-3.5 w-3.5" />
              Last Cron Success
            </div>
            <p className="text-sm font-medium text-gray-900">
              {health?.lastCronSuccess
                ? formatMinutes(health.timeSinceLastCron)
                : 'Never'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Server className="h-3.5 w-3.5" />
              Sync Status
            </div>
            <p className={cn('text-sm font-medium', syncConfig.color)}>
              {syncConfig.label}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Activity className="h-3.5 w-3.5" />
              Active Sessions
            </div>
            <p className="text-sm font-medium text-gray-900">
              {health?.activeSessions ?? 0} / {health?.activeDevices ?? 0} devices
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Failures
            </div>
            <p
              className={cn(
                'text-sm font-medium',
                (health?.consecutiveFailures ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'
              )}
            >
              {health?.consecutiveFailures ?? 0} consecutive
            </p>
          </div>
        </div>

        {/* Issues List */}
        {health?.issues && health.issues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-2">
              <AlertTriangle className="h-4 w-4" />
              Issues Detected
            </div>
            <ul className="space-y-1">
              {health.issues.map((issue, index) => (
                <li key={index} className="text-xs text-amber-700 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Orphaned Sessions Warning */}
        {health?.orphanedSessions && health.orphanedSessions > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {health.orphanedSessions} Orphaned Session{health.orphanedSessions > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-orange-600">
                  Click &quot;Sync Now&quot; to clean up orphaned sessions from deleted devices.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* All Good Message */}
        {health?.status === 'healthy' && health.issues.length === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-emerald-700">
                All systems are running normally. Cron job and virtual devices are synchronized.
              </p>
            </div>
          </div>
        )}

        {/* Detailed Timestamps */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">Last Cron Run:</span>{' '}
              {formatTimestamp(health?.lastCronAttempt ?? null)}
            </div>
            <div>
              <span className="font-medium">Last Success:</span>{' '}
              {formatTimestamp(health?.lastCronSuccess ?? null)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
