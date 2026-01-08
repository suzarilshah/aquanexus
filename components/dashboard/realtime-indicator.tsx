'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

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
    <div className="flex items-center space-x-2">
      <div
        className={cn(
          'flex items-center space-x-2 rounded-full px-3 py-1.5 text-sm',
          isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
        )}
      >
        {isConnected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="h-4 w-4" />
            <span className="font-medium">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="font-medium">Offline</span>
          </>
        )}
      </div>
      {lastUpdate && (
        <span className="text-xs text-gray-400 flex items-center">
          <RefreshCw className="h-3 w-3 mr-1" />
          {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
