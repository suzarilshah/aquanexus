import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Fish, 
  Leaf, 
  Brain, 
  Upload, 
  Settings,
  Cog,
  Droplets,
  Activity,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Fish Environment', href: '/fish', icon: Fish },
  { name: 'Plant Environment', href: '/plants', icon: Leaf },
  { name: 'AI Analysis', href: '/ai-analysis', icon: Brain },
  { name: 'Data Import', href: '/import', icon: Upload },
  { name: 'Projects', href: '/projects', icon: Settings },
  { name: 'Project Settings', href: '/settings', icon: Cog },
];

function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { logout, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Droplets className="h-8 w-8 text-sky-500" />
              <span className="text-2xl font-bold text-slate-900">AquaNexus</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Activity className="h-4 w-4 text-green-500" />
              <span>System Online</span>
            </div>
            <div className="flex items-center space-x-3">
              {user && (
                <span className="text-sm text-slate-600">
                  Welcome, {user.name || user.email}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)]">
          <div className="p-4">
            <div className="space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <item.icon className={cn(
                      'h-5 w-5',
                      isActive ? 'text-sky-500' : 'text-slate-400'
                    )} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;