import { Suspense } from 'react';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, fishReadings, plantReadings, alerts } from '@/lib/db/schema';
import { eq, desc, and, gte, count } from 'drizzle-orm';
import { DashboardStats } from '@/components/dashboard/stats';
import { DeviceList } from '@/components/dashboard/device-list';
import { RecentAlerts } from '@/components/dashboard/recent-alerts';
import { RealTimeIndicator } from '@/components/dashboard/realtime-indicator';
import {
  Plus,
  Fish,
  Leaf,
  Brain,
  ArrowRight,
  Activity,
  Bell,
  Sparkles
} from 'lucide-react';

async function getStats(userId: string) {
  const userDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId));

  const onlineDevices = userDevices.filter((d) => d.status === 'online').length;

  const unresolvedAlerts = await db
    .select({ count: count() })
    .from(alerts)
    .where(
      and(
        eq(alerts.resolved, false),
      )
    );

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const fishDataCount = await db
    .select({ count: count() })
    .from(fishReadings)
    .where(gte(fishReadings.timestamp, twentyFourHoursAgo));

  const plantDataCount = await db
    .select({ count: count() })
    .from(plantReadings)
    .where(gte(plantReadings.timestamp, twentyFourHoursAgo));

  return {
    totalDevices: userDevices.length,
    onlineDevices,
    alertCount: unresolvedAlerts[0]?.count || 0,
    dataPoints: (fishDataCount[0]?.count || 0) + (plantDataCount[0]?.count || 0),
    devices: userDevices,
  };
}

async function getRecentAlerts(userId: string) {
  const userDevices = await db
    .select({ id: devices.id })
    .from(devices)
    .where(eq(devices.userId, userId));

  const deviceIds = userDevices.map((d) => d.id);

  if (deviceIds.length === 0) return [];

  const recentAlerts = await db
    .select()
    .from(alerts)
    .orderBy(desc(alerts.createdAt))
    .limit(5);

  return recentAlerts;
}

const quickActions = [
  {
    name: 'Add Device',
    description: 'Register new ESP32',
    href: '/dashboard/devices',
    icon: Plus,
    gradient: 'from-[#007CF0] to-[#00DFD8]',
    bgGradient: 'from-blue-50 to-cyan-50',
  },
  {
    name: 'Fish Monitor',
    description: 'View fish tank metrics',
    href: '/dashboard/fish',
    icon: Fish,
    gradient: 'from-cyan-400 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50',
  },
  {
    name: 'Plant Monitor',
    description: 'Track plant growth',
    href: '/dashboard/plants',
    icon: Leaf,
    gradient: 'from-emerald-400 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
  },
  {
    name: 'AI Analysis',
    description: 'Get AI insights',
    href: '/dashboard/ai',
    icon: Brain,
    gradient: 'from-[#7928CA] to-[#FF0080]',
    bgGradient: 'from-purple-50 to-pink-50',
  },
];

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const stats = await getStats(session.userId);
  const recentAlerts = await getRecentAlerts(session.userId);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200/50">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </span>
          </div>
          <p className="text-gray-500">
            Real-time overview of your aquaponics systems
          </p>
        </div>
        <RealTimeIndicator />
      </div>

      {/* Stats Cards */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse bg-gray-100 rounded-2xl" />
            ))}
          </div>
        }
      >
        <DashboardStats
          totalDevices={stats.totalDevices}
          onlineDevices={stats.onlineDevices}
          alertCount={Number(stats.alertCount)}
          dataPoints={Number(stats.dataPoints)}
        />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Devices Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Active Devices</h2>
                <p className="text-sm text-gray-500">Your registered monitoring devices</p>
              </div>
              <Link
                href="/dashboard/devices"
                className="flex items-center gap-1 text-sm font-medium text-[#007CF0] hover:text-[#0066CC] transition-colors"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-xl" />}>
              <DeviceList devices={stats.devices} />
            </Suspense>
          </div>
        </div>

        {/* Recent Alerts Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
                  <p className="text-sm text-gray-500">Latest system notifications</p>
                </div>
              </div>
              {Number(stats.alertCount) > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  {stats.alertCount}
                </span>
              )}
            </div>
            <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-xl" />}>
              <RecentAlerts alerts={recentAlerts} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#7928CA]" />
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action, index) => (
            <Link
              key={action.name}
              href={action.href}
              className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${action.bgGradient}`} />

              {/* Content */}
              <div className="relative flex flex-col items-center text-center space-y-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${action.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="h-7 w-7" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-gray-900 group-hover:text-gray-900">
                    {action.name}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {action.description}
                  </span>
                </div>
              </div>

              {/* Arrow on hover */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* AI Insights Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] p-8 text-white">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#007CF0]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#7928CA]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-[#00DFD8]" />
              <h3 className="text-xl font-bold">Dual AI Consensus Engine</h3>
            </div>
            <p className="text-white/70 max-w-md">
              Get intelligent analysis from two AI models working together to provide accurate insights about your aquaponics system.
            </p>
          </div>
          <Link
            href="/dashboard/ai"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors group"
          >
            Try AI Analysis
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
