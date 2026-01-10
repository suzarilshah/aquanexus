'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Filter,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventLog {
  id: string;
  sessionId: string;
  eventType: string;
  eventDetails: Record<string, unknown> | null;
  dataRowIndex: number | null;
  csvTimestamp: string | null;
  sensorValues: Record<string, number> | null;
  cronRunId: string | null;
  createdAt: string;
}

interface CronRun {
  id: string;
  runId: string;
  status: string;
  triggerSource: string | null;
  configsProcessed: number;
  sessionsProcessed: number;
  readingsSent: number;
  errorsEncountered: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface StreamingLogsViewerProps {
  fishSessionId?: string;
  plantSessionId?: string;
  initialFishEvents?: EventLog[];
  initialPlantEvents?: EventLog[];
  recentCronRuns?: CronRun[];
}

export function StreamingLogsViewer({
  fishSessionId,
  plantSessionId,
  initialFishEvents = [],
  initialPlantEvents = [],
  recentCronRuns = [],
}: StreamingLogsViewerProps) {
  const [activeTab, setActiveTab] = useState<'fish' | 'plant' | 'cron'>('cron');
  const [fishEvents, setFishEvents] = useState<EventLog[]>(initialFishEvents);
  const [plantEvents, setPlantEvents] = useState<EventLog[]>(initialPlantEvents);
  const [cronRuns, setCronRuns] = useState<CronRun[]>(recentCronRuns);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const eventTypeColors: Record<string, { bg: string; text: string; icon: typeof Activity }> = {
    session_started: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    session_paused: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    session_resumed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Activity },
    session_completed: { bg: 'bg-purple-100', text: 'text-purple-700', icon: CheckCircle2 },
    session_failed: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
    data_sent: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Database },
    data_batch_sent: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Database },
    error_occurred: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
    dataset_reset: { bg: 'bg-amber-100', text: 'text-amber-700', icon: RefreshCw },
  };

  const fetchLogs = async (sessionId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sessionId, limit: '50' });
      if (filterType !== 'all') {
        params.set('eventType', filterType);
      }
      const response = await fetch(`/api/virtual-devices/logs?${params}`);
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (activeTab === 'fish' && fishSessionId) {
      const events = await fetchLogs(fishSessionId);
      setFishEvents(events);
    } else if (activeTab === 'plant' && plantSessionId) {
      const events = await fetchLogs(plantSessionId);
      setPlantEvents(events);
    } else if (activeTab === 'cron') {
      try {
        setLoading(true);
        const response = await fetch('/api/virtual-devices/logs');
        const data = await response.json();
        setCronRuns(data.overview?.recentCronRuns || []);
      } catch (error) {
        console.error('Failed to fetch cron logs:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getEvents = () => {
    if (activeTab === 'fish') return fishEvents;
    if (activeTab === 'plant') return plantEvents;
    return [];
  };

  const filteredEvents = getEvents().filter(
    event => filterType === 'all' || event.eventType === filterType
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-500" />
            Streaming Logs
          </CardTitle>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab('cron')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'cron' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Cron Runs
          </button>
          <button
            onClick={() => setActiveTab('fish')}
            disabled={!fishSessionId}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'fish' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
              !fishSessionId && 'opacity-50 cursor-not-allowed'
            )}
          >
            Fish Events
          </button>
          <button
            onClick={() => setActiveTab('plant')}
            disabled={!plantSessionId}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'plant' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100',
              !plantSessionId && 'opacity-50 cursor-not-allowed'
            )}
          >
            Plant Events
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {activeTab === 'cron' ? (
          <CronRunsList runs={cronRuns} />
        ) : (
          <>
            {/* Filter */}
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1 bg-white"
              >
                <option value="all">All Events</option>
                <option value="data_sent">Data Sent</option>
                <option value="data_batch_sent">Batch Sent</option>
                <option value="session_started">Session Started</option>
                <option value="session_paused">Session Paused</option>
                <option value="session_resumed">Session Resumed</option>
                <option value="session_completed">Session Completed</option>
                <option value="error_occurred">Errors</option>
              </select>
            </div>

            {/* Events List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No events found
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredEvents.map((event) => {
                  const config = eventTypeColors[event.eventType] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: Activity };
                  const Icon = config.icon;
                  const isExpanded = expanded === event.id;

                  return (
                    <div
                      key={event.id}
                      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => setExpanded(isExpanded ? null : event.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('p-1.5 rounded-lg', config.bg)}>
                            <Icon className={cn('h-3.5 w-3.5', config.text)} />
                          </div>
                          <div>
                            <p className={cn('text-sm font-medium', config.text)}>
                              {event.eventType.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span>{formatDate(event.createdAt)}</span>
                              <span>{formatTime(event.createdAt)}</span>
                              {event.dataRowIndex !== null && (
                                <span className="bg-gray-100 px-1.5 rounded">Row {event.dataRowIndex}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t text-xs">
                          {event.sensorValues && (
                            <div className="mb-2">
                              <p className="text-gray-500 mb-1">Sensor Values:</p>
                              <div className="grid grid-cols-2 gap-1">
                                {Object.entries(event.sensorValues).map(([key, value]) => (
                                  <div key={key} className="bg-gray-50 px-2 py-1 rounded">
                                    <span className="text-gray-500">{key}:</span> {value}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {event.csvTimestamp && (
                            <p className="text-gray-500">CSV Timestamp: {event.csvTimestamp}</p>
                          )}
                          {event.eventDetails && Object.keys(event.eventDetails).length > 0 && (
                            <div className="mt-2">
                              <p className="text-gray-500 mb-1">Details:</p>
                              <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(event.eventDetails, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Cron Runs List
function CronRunsList({ runs }: { runs: CronRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No cron runs recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.id}
          className={cn(
            'border rounded-lg p-3',
            run.status === 'completed' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {run.status === 'completed' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium text-gray-900">
                {run.status === 'completed' ? 'Success' : 'Failed'}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(run.startedAt).toLocaleString()}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {run.triggerSource || 'Unknown'}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-600">
            <span>{run.readingsSent} readings sent</span>
            <span>{run.sessionsProcessed} sessions</span>
            {run.errorsEncountered > 0 && (
              <span className="text-red-600">{run.errorsEncountered} errors</span>
            )}
            {run.durationMs && (
              <span>{run.durationMs}ms</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
