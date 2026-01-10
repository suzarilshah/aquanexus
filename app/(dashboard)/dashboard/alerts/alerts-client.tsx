'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Filter,
  RefreshCw,
  Fish,
  Leaf,
  Clock,
  Activity,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Radio,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Alert {
  id: string;
  deviceId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: string | null;
  threshold: string | null;
  resolved: boolean;
  createdAt: Date;
  deviceName: string | null;
  deviceType: string | null;
}

interface Device {
  id: string;
  deviceName: string;
  deviceType: string;
}

interface StreamingError {
  id: string;
  sessionId: string;
  eventType: string;
  eventDetails: unknown;
  createdAt: Date;
  deviceType: string | null;
}

interface CronRun {
  id: string;
  runId: string;
  status: string;
  triggerSource: string | null;
  configsProcessed: number | null;
  sessionsProcessed: number | null;
  readingsSent: number | null;
  errorsEncountered: number | null;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
}

interface AlertsClientProps {
  initialData: {
    alerts: Alert[];
    devices: Device[];
    streamingErrors: StreamingError[];
    cronRuns: CronRun[];
    stats: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      unresolved: number;
    };
  };
}

export function AlertsClient({ initialData }: AlertsClientProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialData.alerts);
  const [activeTab, setActiveTab] = useState<'alerts' | 'streaming' | 'cron'>('alerts');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolvingAll, setResolvingAll] = useState(false);

  const stats = initialData.stats;

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-700',
          icon: XCircle,
          iconColor: 'text-red-500',
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-700',
          icon: AlertTriangle,
          iconColor: 'text-orange-500',
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          badge: 'bg-amber-100 text-amber-700',
          icon: Info,
          iconColor: 'text-amber-500',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          badge: 'bg-blue-100 text-blue-700',
          icon: Info,
          iconColor: 'text-blue-500',
        };
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (deviceFilter !== 'all' && alert.deviceId !== deviceFilter) return false;
    if (!showResolved && alert.resolved) return false;
    return true;
  });

  const handleResolve = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, resolved: true }),
      });

      if (response.ok) {
        setAlerts(alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a));
        toast.success('Alert resolved');
      } else {
        toast.error('Failed to resolve alert');
      }
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  const handleResolveAll = async () => {
    setResolvingAll(true);
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_all' }),
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(alerts.map(a => ({ ...a, resolved: true })));
        toast.success(`Resolved ${data.updated} alerts`);
        router.refresh();
      } else {
        toast.error('Failed to resolve alerts');
      }
    } catch (error) {
      toast.error('Failed to resolve alerts');
    } finally {
      setResolvingAll(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts & Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor system alerts, streaming errors, and cron job status
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
                <p className="text-xs text-red-600">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{stats.high}</p>
                <p className="text-xs text-orange-600">High</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Info className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.medium}</p>
                <p className="text-xs text-amber-600">Medium</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.low}</p>
                <p className="text-xs text-blue-600">Low</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">{stats.unresolved}</p>
                <p className="text-xs text-purple-600">Unresolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('alerts')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
            activeTab === 'alerts'
              ? 'bg-white text-gray-900 border-b-2 border-[#007CF0]'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            System Alerts
            {stats.unresolved > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                {stats.unresolved}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('streaming')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
            activeTab === 'streaming'
              ? 'bg-white text-gray-900 border-b-2 border-[#007CF0]'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Streaming Errors
            {initialData.streamingErrors.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                {initialData.streamingErrors.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('cron')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
            activeTab === 'cron'
              ? 'bg-white text-gray-900 border-b-2 border-[#007CF0]'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Cron Jobs
          </div>
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'alerts' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-lg">System Alerts</CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filters */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="text-sm border rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="all">All Severity</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={deviceFilter}
                    onChange={(e) => setDeviceFilter(e.target.value)}
                    className="text-sm border rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="all">All Devices</option>
                    {initialData.devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.deviceName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show Resolved Toggle */}
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showResolved}
                    onChange={(e) => setShowResolved(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Show Resolved
                </label>

                {/* Resolve All Button */}
                {stats.unresolved > 0 && (
                  <button
                    onClick={handleResolveAll}
                    disabled={resolvingAll}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
                  >
                    {resolvingAll ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Resolve All
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
                <p className="text-sm text-gray-500 mt-1">No alerts matching your filters</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredAlerts.map((alert) => {
                  const config = getSeverityConfig(alert.severity);
                  const Icon = config.icon;
                  const isExpanded = expandedAlert === alert.id;

                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'border rounded-lg p-4 transition-all',
                        config.bg,
                        config.border,
                        alert.resolved && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn('p-2 rounded-lg', config.bg)}>
                            <Icon className={cn('h-5 w-5', config.iconColor)} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-sm font-semibold', config.text)}>
                                {alert.alertType.replace(/_/g, ' ')}
                              </span>
                              <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', config.badge)}>
                                {alert.severity}
                              </span>
                              {alert.resolved && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                  Resolved
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                {alert.deviceType === 'fish' ? (
                                  <Fish className="h-3 w-3" />
                                ) : (
                                  <Leaf className="h-3 w-3" />
                                )}
                                {alert.deviceName}
                              </span>
                              <span>{formatTimeAgo(alert.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!alert.resolved && (
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="Mark as resolved"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Current Value</p>
                              <p className="font-medium">{alert.value || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Threshold</p>
                              <p className="font-medium">{alert.threshold || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Device ID</p>
                              <p className="font-mono text-xs">{alert.deviceId}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Created</p>
                              <p className="font-medium">{new Date(alert.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'streaming' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Radio className="h-5 w-5 text-purple-500" />
              Virtual Device Streaming Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {initialData.streamingErrors.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Streaming Errors</h3>
                <p className="text-sm text-gray-500 mt-1">All virtual devices are operating normally</p>
              </div>
            ) : (
              <div className="space-y-3">
                {initialData.streamingErrors.map((error) => (
                  <div
                    key={error.id}
                    className="border border-red-200 bg-red-50 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-red-700">Streaming Error</span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            {error.deviceType || 'Unknown'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {(error.eventDetails as { error?: string })?.error || 'Unknown error occurred'}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimeAgo(error.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'cron' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Recent Cron Job Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {initialData.cronRuns.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Cron Runs Yet</h3>
                <p className="text-sm text-gray-500 mt-1">Cron job history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {initialData.cronRuns.map((run) => (
                  <div
                    key={run.id}
                    className={cn(
                      'border rounded-lg p-4',
                      run.status === 'completed'
                        ? 'border-green-200 bg-green-50'
                        : run.status === 'failed'
                        ? 'border-red-200 bg-red-50'
                        : 'border-amber-200 bg-amber-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {run.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : run.status === 'failed' ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {run.status === 'completed' ? 'Success' : run.status === 'failed' ? 'Failed' : 'Running'}
                          </p>
                          <p className="text-xs text-gray-500">{run.triggerSource || 'Unknown trigger'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{formatTimeAgo(run.startedAt)}</p>
                    </div>
                    <div className="flex gap-6 mt-3 text-sm">
                      <div>
                        <p className="text-gray-500">Readings Sent</p>
                        <p className="font-medium text-gray-900">{run.readingsSent ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sessions</p>
                        <p className="font-medium text-gray-900">{run.sessionsProcessed ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Errors</p>
                        <p className={cn('font-medium', (run.errorsEncountered ?? 0) > 0 ? 'text-red-600' : 'text-gray-900')}>
                          {run.errorsEncountered ?? 0}
                        </p>
                      </div>
                      {run.durationMs && (
                        <div>
                          <p className="text-gray-500">Duration</p>
                          <p className="font-medium text-gray-900">{run.durationMs}ms</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
