'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw, Radio, CircleSlash } from 'lucide-react';

interface RealTimeIndicatorProps {
  totalDevices?: number;
  onlineDevices?: number;
}

export function RealTimeIndicator({ totalDevices = 0, onlineDevices = 0 }: RealTimeIndicatorProps) {
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

  // Determine what to show based on device status
  const getStatusDisplay = () => {
    // No devices registered
    if (totalDevices === 0) {
      return {
        icon: CircleSlash,
        text: 'No Devices',
        subtext: 'Register a device to start streaming',
        bgClass: 'bg-gray-100 text-gray-600 border border-gray-200',
        showPing: false,
      };
    }

    // Has devices but none online
    if (onlineDevices === 0) {
      return {
        icon: WifiOff,
        text: 'Devices Offline',
        subtext: `${totalDevices} device${totalDevices > 1 ? 's' : ''} registered`,
        bgClass: 'bg-amber-50 text-amber-700 border border-amber-200/50',
        showPing: false,
      };
    }

    // SSE connection active with online devices
    if (isConnected && onlineDevices > 0) {
      return {
        icon: Radio,
        text: 'Live Streaming',
        subtext: `${onlineDevices}/${totalDevices} online`,
        bgClass: 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200/50',
        showPing: true,
      };
    }

    // SSE disconnected but has online devices
    return {
      icon: WifiOff,
      text: 'Reconnecting...',
      subtext: 'Connection interrupted',
      bgClass: 'bg-gray-100 text-gray-600 border border-gray-200',
      showPing: false,
    };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-3">
      {/* Connection Status */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300',
          status.bgClass
        )}
      >
        {status.showPing && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        )}
        <StatusIcon className="h-4 w-4" />
        <span>{status.text}</span>
      </div>

      {/* Last Update Time - only show if we have devices and are streaming */}
      {lastUpdate && isConnected && onlineDevices > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="tabular-nums">{lastUpdate.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
