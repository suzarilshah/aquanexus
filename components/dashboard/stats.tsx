'use client';

import { cn } from '@/lib/utils';
import { Cpu, Wifi, AlertTriangle, Database, TrendingUp, ArrowUpRight } from 'lucide-react';

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
      gradient: 'from-[#007CF0] to-[#00DFD8]',
      bgGradient: 'from-blue-50 to-cyan-50',
      iconBg: 'bg-gradient-to-br from-[#007CF0] to-[#00DFD8]',
      trend: '+12%',
      trendUp: true,
    },
    {
      name: 'Online Now',
      value: onlineDevices,
      icon: Wifi,
      gradient: 'from-emerald-400 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
      suffix: `/ ${totalDevices}`,
      trend: onlineDevices === totalDevices ? '100%' : `${Math.round((onlineDevices / totalDevices) * 100)}%`,
      trendUp: true,
    },
    {
      name: 'Active Alerts',
      value: alertCount,
      icon: AlertTriangle,
      gradient: alertCount > 0 ? 'from-amber-400 to-orange-500' : 'from-gray-300 to-gray-400',
      bgGradient: alertCount > 0 ? 'from-amber-50 to-orange-50' : 'from-gray-50 to-gray-100',
      iconBg: alertCount > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gray-400',
      trend: alertCount > 0 ? 'Needs attention' : 'All clear',
      trendUp: alertCount === 0,
    },
    {
      name: 'Data Points (24h)',
      value: dataPoints.toLocaleString(),
      icon: Database,
      gradient: 'from-[#7928CA] to-[#FF0080]',
      bgGradient: 'from-purple-50 to-pink-50',
      iconBg: 'bg-gradient-to-br from-[#7928CA] to-[#FF0080]',
      trend: '+2.4K',
      trendUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={stat.name}
          className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Gradient background on hover */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
            stat.bgGradient
          )} />

          {/* Content */}
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900 tracking-tight">
                    {stat.value}
                  </p>
                  {stat.suffix && (
                    <span className="text-lg text-gray-400 font-medium">{stat.suffix}</span>
                  )}
                </div>
              </div>

              {/* Icon */}
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg',
                stat.iconBg
              )}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>

            {/* Trend indicator */}
            <div className="mt-4 flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1 text-sm font-medium',
                stat.trendUp ? 'text-emerald-600' : 'text-amber-600'
              )}>
                {stat.trendUp ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                <span>{stat.trend}</span>
              </div>
              <span className="text-xs text-gray-400">vs last period</span>
            </div>
          </div>

          {/* Decorative gradient line at bottom */}
          <div className={cn(
            'absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500',
            stat.gradient
          )} />
        </div>
      ))}
    </div>
  );
}
