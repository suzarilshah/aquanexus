'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Fish,
  Leaf,
  Brain,
  Upload,
  Settings,
  Cpu,
  ChevronRight,
  Zap,
  CircuitBoard,
  AlertTriangle,
  WifiOff,
  TrendingUp,
  Radio,
  Bell,
} from 'lucide-react';

interface SystemStatus {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
}

interface SidebarProps {
  systemStatus: SystemStatus;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Overview & analytics' },
  { name: 'Alerts', href: '/dashboard/alerts', icon: Bell, description: 'System notifications' },
  { name: 'Fish Environment', href: '/dashboard/fish', icon: Fish, description: 'Monitor fish tanks' },
  { name: 'Plant Environment', href: '/dashboard/plants', icon: Leaf, description: 'Track plant growth' },
  { name: 'Forecast', href: '/dashboard/forecast', icon: TrendingUp, description: 'LSTM predictions' },
  { name: 'AI Analysis', href: '/dashboard/ai', icon: Brain, description: 'Dual AI consensus' },
  { name: 'Devices', href: '/dashboard/devices', icon: Cpu, description: 'ESP32 management' },
  { name: 'Firmware', href: '/dashboard/firmware', icon: CircuitBoard, description: 'Configure & flash' },
  { name: 'Simulator', href: '/dashboard/simulator', icon: Radio, description: 'Virtual ESP32' },
  { name: 'Data Import', href: '/dashboard/import', icon: Upload, description: 'CSV & JSON import' },
];

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Preferences' },
];

function getStatusConfig(systemStatus: SystemStatus) {
  const { totalDevices, onlineDevices, offlineDevices } = systemStatus;

  // No devices registered
  if (totalDevices === 0) {
    return {
      status: 'no-devices',
      title: 'No Devices',
      message: 'Register your first device',
      bgGradient: 'from-gray-50 to-slate-50',
      borderColor: 'border-gray-200',
      iconBg: 'bg-gray-400/10',
      iconColor: 'text-gray-500',
      dotColor: 'bg-gray-400',
      showPing: false,
      Icon: WifiOff,
    };
  }

  // All devices offline
  if (onlineDevices === 0) {
    return {
      status: 'all-offline',
      title: 'All Offline',
      message: `${totalDevices} device${totalDevices > 1 ? 's' : ''} disconnected`,
      bgGradient: 'from-red-50 to-orange-50',
      borderColor: 'border-red-200',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600',
      dotColor: 'bg-red-500',
      showPing: false,
      Icon: AlertTriangle,
    };
  }

  // Some devices offline
  if (offlineDevices > 0) {
    return {
      status: 'partial',
      title: 'Partial Outage',
      message: `${offlineDevices} of ${totalDevices} offline`,
      bgGradient: 'from-amber-50 to-yellow-50',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
      dotColor: 'bg-amber-500',
      showPing: true,
      Icon: AlertTriangle,
    };
  }

  // All devices online
  return {
    status: 'operational',
    title: 'All Operational',
    message: `${totalDevices} device${totalDevices > 1 ? 's' : ''} connected`,
    bgGradient: 'from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-100',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    dotColor: 'bg-emerald-500',
    showPing: true,
    Icon: Zap,
  };
}

export function Sidebar({ systemStatus }: SidebarProps) {
  const pathname = usePathname();
  const statusConfig = getStatusConfig(systemStatus);

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      {/* Sidebar container with subtle gradient */}
      <div className="flex grow flex-col overflow-y-auto border-r border-gray-200/80 bg-gradient-to-b from-white to-gray-50/50 px-6 pb-4">
        {/* Logo Section */}
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#007CF0] to-[#7928CA] flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#007CF0] to-[#7928CA] rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">AquaNexus</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Enterprise</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-[#007CF0]/10 to-[#7928CA]/10 text-[#007CF0]">
                  PRO
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col mt-6">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {/* Main Navigation */}
            <li>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                Main Menu
              </div>
              <ul role="list" className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-[#007CF0]/10 to-[#7928CA]/10 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                        )}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-[#007CF0] to-[#7928CA]" />
                        )}

                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-br from-[#007CF0] to-[#7928CA] text-white shadow-md shadow-blue-500/25'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700'
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              'truncate',
                              isActive ? 'font-semibold' : ''
                            )}>
                              {item.name}
                            </span>
                            <ChevronRight className={cn(
                              'h-4 w-4 text-gray-400 transition-transform duration-200',
                              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                              'group-hover:translate-x-0.5'
                            )} />
                          </div>
                          <span className="text-xs text-gray-400 truncate">
                            {item.description}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Bottom Navigation */}
            <li className="mt-auto">
              {/* Dynamic Status Card */}
              <div className={cn(
                'mb-4 p-4 rounded-xl bg-gradient-to-br border',
                statusConfig.bgGradient,
                statusConfig.borderColor
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', statusConfig.iconBg)}>
                    <statusConfig.Icon className={cn('h-4 w-4', statusConfig.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{statusConfig.title}</span>
                      <span className="relative flex h-2 w-2">
                        {statusConfig.showPing && (
                          <span className={cn('animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75', statusConfig.dotColor)} />
                        )}
                        <span className={cn('relative inline-flex rounded-full h-2 w-2', statusConfig.dotColor)} />
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{statusConfig.message}</span>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <ul role="list" className="space-y-1">
                {bottomNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-[#007CF0]/10 to-[#7928CA]/10 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                        )}
                      >
                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-br from-[#007CF0] to-[#7928CA] text-white shadow-md shadow-blue-500/25'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700'
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </nav>

        {/* Version Badge */}
        <div className="mt-4 pt-4 border-t border-gray-200/80">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>AquaNexus v2.0.0</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Next.js 14
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
