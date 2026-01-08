'use client';

import { cn } from '@/lib/utils';
import { Cpu, Wifi, AlertTriangle, Database } from 'lucide-react';

interface DashboardStatsProps {
  totalDevices: number;
  onlineDevices: number;
  alertCount: number;
  dataPoints: number;
}

export function DashboardStats({
  totalDevices,
  onlineDevices,
  alertCount,
  dataPoints,
}: DashboardStatsProps) {
  const stats = [
    {
      name: 'Total Devices',
      value: totalDevices,
      icon: Cpu,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      name: 'Online',
      value: onlineDevices,
      icon: Wifi,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      suffix: `/ ${totalDevices}`,
    },
    {
      name: 'Active Alerts',
      value: alertCount,
      icon: AlertTriangle,
      color: alertCount > 0 ? 'bg-amber-500' : 'bg-gray-400',
      bgColor: alertCount > 0 ? 'bg-amber-50' : 'bg-gray-50',
      textColor: alertCount > 0 ? 'text-amber-600' : 'text-gray-600',
    },
    {
      name: 'Data Points (24h)',
      value: dataPoints.toLocaleString(),
      icon: Database,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', stat.bgColor)}>
              <stat.icon className={cn('h-6 w-6', stat.textColor)} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                {stat.suffix && (
                  <span className="ml-1 text-sm text-gray-500">{stat.suffix}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
