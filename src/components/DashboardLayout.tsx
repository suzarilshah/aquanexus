import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import {
  BarChart3,
  Brain,
  Database,
  Download,
  Droplets,
  FileText,
  Fish,
  FolderOpen,
  Home,
  Leaf,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Upload,
  User,
  Waves,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, importedDatasets } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard' || location.pathname === '/'
    },
    {
      name: 'Fish Environment',
      href: '/fish-environment',
      icon: Fish,
      current: location.pathname === '/fish-environment'
    },
    {
      name: 'Plant Environment',
      href: '/plant-environment',
      icon: Leaf,
      current: location.pathname === '/plant-environment'
    },
    {
      name: 'AI Analysis',
      href: '/ai-analysis',
      icon: Brain,
      current: location.pathname === '/ai-analysis'
    },
    {
      name: 'Data Import',
      href: '/data-import',
      icon: Upload,
      current: location.pathname === '/data-import'
    },
    {
      name: 'ESP32 Download',
      href: '/esp32-download',
      icon: Download,
      current: location.pathname === '/esp32-download'
    },
    {
      name: 'Devices',
      href: '/projects',
      icon: Settings,
      current: location.pathname === '/projects'
    },
    {
      name: 'Project Settings',
      href: '/project-settings',
      icon: Settings,
      current: location.pathname === '/project-settings'
    }
  ];

  const importedDataItems = [
    {
      name: 'Fish Data',
      href: '/imported/fish',
      icon: Fish,
      current: location.pathname === '/imported/fish',
      count: importedDatasets.filter(d => d.type === 'fish').length
    },
    {
      name: 'Plant Data',
      href: '/imported/plants',
      icon: Leaf,
      current: location.pathname === '/imported/plants',
      count: importedDatasets.filter(d => d.type === 'plant').length
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Waves className="h-6 w-6 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-black">
              AquaNexus
            </h1>
            <p className="text-xs text-gray-600">
              IoT Aquaponics Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  item.current
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-black hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Imported Data Section */}
        {importedDatasets.length > 0 && (
          <div className="pt-6">
            <div className="flex items-center px-3 mb-2">
              <Database className="h-4 w-4 text-gray-600 mr-2" />
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Imported Data
              </h3>
            </div>
            <div className="space-y-1">
              {importedDataItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      item.current
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-black hover:bg-gray-100'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="flex items-center">
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </div>
                    {item.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {item.count}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="bg-gray-200 p-2 rounded-full">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-black">
              {user?.name}
            </p>
            <p className="text-xs text-gray-600">
              {user?.email}
            </p>
            {user?.isDemo && (
              <Badge variant="outline" className="text-xs mt-1">
                Demo Account
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="ml-4 lg:ml-0">
                <h2 className="text-lg font-semibold text-black">
                  {navigationItems.find(item => item.current)?.name || 
                   importedDataItems.find(item => item.current)?.name || 
                   'Dashboard'}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Operational Mode Indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <div className="flex items-center px-2 py-1 rounded-full bg-blue-100">
                        {useStore(state => state.operationalMode) === 'online' && <Wifi className="h-4 w-4 text-blue-600 mr-1" />}
                        {useStore(state => state.operationalMode) === 'data-import' && <Upload className="h-4 w-4 text-purple-600 mr-1" />}
                        {useStore(state => state.operationalMode) === 'demo' && <BarChart3 className="h-4 w-4 text-orange-600 mr-1" />}
                        <span className="text-xs font-medium text-black capitalize">
                          {useStore(state => state.operationalMode).replace('-', ' ')} Mode
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Current operational mode: {useStore(state => state.operationalMode).replace('-', ' ')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* System Status Indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <div className="flex items-center px-2 py-1 rounded-full bg-gray-100">
                        {useStore(state => state.isConnected) ? (
                          <Wifi className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className="text-xs font-medium text-black">
                          System {useStore(state => state.isConnected) ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p>Devices: {useStore(state => state.systemStatus.totalDevices)} total</p>
                      <p>Online: {useStore(state => state.systemStatus.onlineDevices)}</p>
                      <p>Alerts: {useStore(state => state.systemStatus.criticalAlerts)} critical</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Theme Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleTheme}
                      className="p-2"
                      aria-label="Toggle theme"
                    >
                      {theme === 'dark' ? (
                        <Sun className="h-5 w-5 text-yellow-400" />
                      ) : (
                        <Moon className="h-5 w-5 text-black" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* User Menu */}
              <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 p-2"
                  >
                    <div className="bg-gray-200 p-1 rounded-full">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="hidden md:block text-sm font-medium text-black">
                      {user?.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-gray-600">{user?.email}</p>
                      {user?.isDemo && (
                        <Badge variant="outline" className="text-xs mt-1 w-fit">
                          Demo Account
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/onboarding')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Setup ESP32</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Logout Button (Always visible) */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="p-2 text-red-600 hover:text-red-700"
                      aria-label="Logout"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;