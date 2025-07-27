import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Fish, 
  Leaf, 
  Thermometer, 
  Droplets, 
  Activity, 
  AlertTriangle,
  TrendingUp,
  Plus,
  Wifi,
  WifiOff,
  Clock,
  Settings,
  Eye,
  Database,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { useWebSocket, simulateESP32Data, useOperationalModeEffect } from '@/lib/websocket';
import { demoDataService } from '@/lib/demoDataService';

// Mock data for demonstration
const projects = [
  {
    id: 1,
    name: 'Greenhouse System A',
    fishSpecies: 'Tilapia',
    plantSpecies: 'Lettuce',
    status: 'healthy',
    lastUpdate: '2 minutes ago',
    fishTemp: 24.5,
    plantHeight: 12.3,
    ph: 7.2,
    tds: 850
  },
  {
    id: 2,
    name: 'Indoor Farm B',
    fishSpecies: 'Catfish',
    plantSpecies: 'Basil',
    status: 'warning',
    lastUpdate: '5 minutes ago',
    fishTemp: 22.1,
    plantHeight: 8.7,
    ph: 6.8,
    tds: 920
  }
];

const systemStats = {
  totalProjects: 2,
  activeDevices: 4,
  alertsToday: 3,
  dataPoints: 15420
};

function Dashboard() {
  const { devices, systemStatus, alerts, operationalMode, isConnected, environmentData } = useStore();
  const { connect } = useWebSocket();
  
  // Monitor operational mode changes
  useOperationalModeEffect();
  
  // Initialize connection once on mount
  useEffect(() => {
    connect();
  }, []); // Empty dependency array to run only once on mount
  
  // Start simulation for development (only in online mode)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && operationalMode === 'online') {
      simulateESP32Data();
    }
  }, [operationalMode]);
  
  const activeAlerts = alerts.filter(alert => !alert.resolved);
  
  // Get mode-specific status text
  const getModeStatusText = () => {
    switch (operationalMode) {
      case 'online':
        return isConnected ? 'System Online' : 'System Offline';
      case 'demo':
        return demoDataService.isStreamingActive() ? 'Demo Active' : 'Demo Inactive';
      case 'data-import':
        return 'Import Mode';
      default:
        return 'Unknown Mode';
    }
  };
  
  const getModeStatusColor = () => {
    switch (operationalMode) {
      case 'online':
        return isConnected ? 'bg-green-50' : 'bg-red-50';
      case 'demo':
        return demoDataService.isStreamingActive() ? 'bg-orange-50' : 'bg-gray-50';
      case 'data-import':
        return 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  };
  
  const getModeIcon = () => {
    switch (operationalMode) {
      case 'online':
        return isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />;
      case 'demo':
        return <Activity className="h-4 w-4 text-orange-500" />;
      case 'data-import':
        return <Settings className="h-4 w-4 text-purple-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-6 bg-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white">
        <div className="flex items-center space-x-3">
          <Activity className="h-8 w-8 text-slate-600" />
          <div>
            <h1 className="text-3xl font-bold text-black">Dashboard</h1>
            <p className="text-slate-700 mt-1">AquaNexus System Overview</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            isConnected ? 'bg-green-50' : 'bg-red-50'
          }`}>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <div className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className={`text-sm font-medium ${
              isConnected ? 'text-green-700' : 'text-red-700'
            }`}>
              {isConnected ? 'System Online' : 'System Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">Total Devices</CardTitle>
            <Database className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{devices.length}</div>
            <p className="text-xs text-slate-600">
              Monitoring {devices.length} aquaponics systems
            </p>
          </CardContent>
        </Card>
        
        <Card className={getModeStatusColor()}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">System Status</CardTitle>
            {getModeIcon()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {operationalMode === 'online' ? systemStatus.onlineDevices : devices.length}
            </div>
            <p className="text-xs text-slate-600">
              {getModeStatusText()} ({operationalMode} mode)
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              activeAlerts.length > 0 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {activeAlerts.length}
            </div>
            <p className="text-xs text-slate-600">
              {activeAlerts.length > 0 ? 'Require attention' : 'All systems normal'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">Data Points</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {(Object.values(environmentData.fish).reduce((acc, readings) => acc + readings.length, 0) +
                Object.values(environmentData.plant).reduce((acc, readings) => acc + readings.length, 0)).toLocaleString()}
            </div>
            <p className="text-xs text-slate-600">
              Collected data points
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {devices.slice(0, 4).map((device) => {
          const getStatusColor = (status: string) => {
            switch (status) {
              case 'online': return 'bg-green-100 text-green-800';
              case 'offline': return 'bg-red-100 text-red-800';
              case 'warning': return 'bg-orange-100 text-orange-800';
              default: return 'bg-slate-100 text-slate-800';
            }
          };
          
          return (
            <Card key={device.$id} className="bg-white border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-black">
                    <span>{device.deviceName}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                  </CardTitle>
                  <Link to={`/projects`}>
                    <Button variant="outline" size="sm" className="border-slate-300 text-black hover:bg-slate-50">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <CardDescription className="text-slate-600">
                  {device.deviceType === 'fish' ? '🐟' : '🌱'} {device.deviceType.charAt(0).toUpperCase() + device.deviceType.slice(1)} Monitor • MAC: {device.deviceMac}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Device Info */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="font-medium text-black">Device ID</p>
                        <p className="text-sm text-slate-700">{device.deviceId}</p>
                      </div>
                    </div>
                    <div className={`h-3 w-3 rounded-full ${
                      device.status === 'online' ? 'bg-green-500 animate-pulse' : 
                      device.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                    }`} />
                  </div>
                  
                  {/* Reading Interval */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-black">Reading Interval</p>
                        <p className="text-sm text-slate-700">{device.readingInterval}s</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Last Seen */}
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Eye className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium text-black">Last Seen</p>
                        <p className="text-sm text-slate-700">
                          {new Date(device.lastSeen).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {/* Add New Device Card */}
        <Card className="border-dashed border-2 border-slate-300 hover:border-slate-400 transition-colors bg-white">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <div className="rounded-full bg-slate-100 p-4 mb-4">
              <Settings className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">Add New Device</h3>
            <p className="text-slate-700 mb-4">Register a new ESP32 monitoring device</p>
            <Link to="/projects">
              <Button className="bg-green-500 hover:bg-green-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Register Device
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;