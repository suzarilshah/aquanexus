'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw, Radio } from 'lucide-react';

export function RealTimeIndicator() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Connect to SSE endpoint for real-time updates
    const eventSource = new EventSource('/api/sse');

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      setLastUpdate(new Date());
      // Handle real-time data updates
      try {
        const data = JSON.parse(event.data);
        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('sensor-update', { detail: data }));
      } catch {
        // Ignore parse errors for heartbeat messages
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // Auto-reconnect is handled by EventSource
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Connection Status */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300',
          isConnected
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200/50'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        )}
      >
        {isConnected ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Radio className="h-4 w-4" />
            <span>Live Streaming</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Reconnecting...</span>
          </>
        )}
      </div>

      {/* Last Update Time */}
      {lastUpdate && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="tabular-nums">{lastUpdate.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
