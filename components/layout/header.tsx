'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Menu, User, Bell, Search, Command, AlertTriangle, CheckCircle2, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  resolved: boolean;
  createdAt: string;
  deviceName?: string;
}

interface HeaderProps {
  user: {
    name: string;
    email: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch recent alerts
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/alerts?limit=5&unresolved=true');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.alerts || []);
        setUnreadCount(data.unresolvedCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Failed to logout');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get user initials
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle, iconColor: 'text-red-500' };
      case 'high':
        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: AlertTriangle, iconColor: 'text-orange-500' };
      case 'medium':
        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Info, iconColor: 'text-amber-500' };
      default:
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Info, iconColor: 'text-blue-500' };
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b border-gray-100 bg-white/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-600 hover:text-gray-900 lg:hidden transition-colors"
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden ml-4" />

      {/* Main content area */}
      <div className="flex flex-1 items-center justify-between gap-x-4 lg:gap-x-6">
        {/* Search bar - left side */}
        <div className="relative flex flex-1 items-center max-w-md">
          <div className="relative w-full group">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-[#007CF0] transition-colors" />
            <input
              type="search"
              placeholder="Search devices, alerts..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#007CF0] focus:ring-2 focus:ring-[#007CF0]/20 focus:outline-none transition-all"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-gray-400">
              <kbd className="flex h-5 items-center gap-1 rounded border border-gray-200 bg-white px-1.5 font-medium">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right side items - User profile and notifications */}
        <div className="flex items-center gap-x-2 lg:gap-x-4">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" />
              {/* Notification badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0080] opacity-75"></span>
                  <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-[#FF0080] text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-200/50 z-20 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      <p className="text-xs text-gray-500">{unreadCount} unresolved alerts</p>
                    </div>
                    <Link
                      href="/dashboard/alerts"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-[#007CF0] hover:text-[#0066CC] font-medium flex items-center gap-1"
                    >
                      View All
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {loading ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">All clear!</p>
                        <p className="text-xs text-gray-400">No unresolved alerts</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((alert) => {
                          const config = getSeverityConfig(alert.severity);
                          const Icon = config.icon;
                          return (
                            <Link
                              key={alert.id}
                              href="/dashboard/alerts"
                              onClick={() => setShowNotifications(false)}
                              className={cn(
                                'flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors',
                                config.bg
                              )}
                            >
                              <div className={cn('p-1.5 rounded-lg', config.bg)}>
                                <Icon className={cn('h-4 w-4', config.iconColor)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium truncate', config.text)}>
                                  {alert.alertType.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                  {alert.message}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {alert.deviceName && (
                                    <span className="text-xs text-gray-400">{alert.deviceName}</span>
                                  )}
                                  <span className="text-xs text-gray-400">{formatTimeAgo(alert.createdAt)}</span>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-100 bg-gray-50">
                    <Link
                      href="/dashboard/alerts"
                      onClick={() => setShowNotifications(false)}
                      className="block w-full text-center text-sm text-[#007CF0] hover:text-[#0066CC] font-medium py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      View All Alerts
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#007CF0] to-[#7928CA] text-white text-sm font-medium shadow-lg shadow-blue-500/20">
                {initials}
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-200/50 z-20 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/dashboard/settings');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      {isLoggingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
