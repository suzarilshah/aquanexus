'use client';

import Link from 'next/link';
import { cn, formatDate } from '@/lib/utils';
import { Alert } from '@/lib/db/schema';
import { AlertTriangle, AlertCircle, Info, XCircle, CheckCircle } from 'lucide-react';

interface RecentAlertsProps {
  alerts: Alert[];
}

export function RecentAlerts({ alerts }: RecentAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="text-sm font-medium text-gray-900">All systems normal</h3>
        <p className="mt-1 text-sm text-gray-500">
          No alerts to display at this time.
        </p>
      </div>
    );
  }

  const getSeverityStyles = (severity: string, resolved: boolean) => {
    if (resolved) {
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: CheckCircle,
        iconColor: 'text-gray-400',
      };
    }

    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: XCircle,
          iconColor: 'text-red-600',
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: AlertCircle,
          iconColor: 'text-amber-600',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: Info,
          iconColor: 'text-blue-600',
        };
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const styles = getSeverityStyles(alert.severity, alert.resolved);
        const Icon = styles.icon;

        return (
          <div
            key={alert.id}
            className={cn(
              'rounded-lg border p-3',
              styles.bg,
              styles.border,
              alert.resolved && 'opacity-60'
            )}
          >
            <div className="flex items-start space-x-3">
              <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', styles.iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn(
                    'text-sm font-medium',
                    alert.resolved ? 'text-gray-500' : 'text-gray-900'
                  )}>
                    {alert.alertType}
                  </p>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    alert.resolved
                      ? 'bg-gray-200 text-gray-600'
                      : alert.severity === 'critical'
                      ? 'bg-red-200 text-red-700'
                      : alert.severity === 'high'
                      ? 'bg-orange-200 text-orange-700'
                      : alert.severity === 'medium'
                      ? 'bg-amber-200 text-amber-700'
                      : 'bg-blue-200 text-blue-700'
                  )}>
                    {alert.resolved ? 'Resolved' : alert.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {alert.message}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatDate(alert.createdAt)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <Link
        href="/dashboard/alerts"
        className="block text-center text-sm text-blue-600 hover:text-blue-500 font-medium pt-2"
      >
        View all alerts
      </Link>
    </div>
  );
}
