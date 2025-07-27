import React, { useState, useEffect } from 'react';
import { 
  Fish, 
  Thermometer, 
  Droplets, 
  Activity, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  Zap,
  Wifi,
  WifiOff,
  Settings,
  RefreshCw,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { toast } from 'sonner';

import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';

// Sample data for demo users
const sampleAlerts = [
  {
    id: 1,
    type: 'warning',
    message: 'TDS levels slightly elevated',
    sensor: 'TDS Sensor',
    time: '2 minutes ago',
    acknowledged: false,
    recommendation: 'Check water filtration system'
  },
  {
    id: 2,
    type: 'info',
    message: 'Temperature within optimal range',
    sensor: 'Temperature Sensor',
    time: '5 minutes ago',
    acknowledged: false,
    recommendation: 'Continue monitoring'
  }
];

const sampleEsp32Status = {
  connected: true,
  deviceId: 'ESP32-FISH-001',
  signalStrength: 85,
  batteryLevel: 92,
  lastSeen: '2 minutes ago',
  lastHeartbeat: '30 seconds ago'
};

const sampleCurrentReadings = {
  temperature: {
    value: 24.5,
    sensor: 'DS18B20',
    calibrated: true,
    accuracy: '±0.1°C'
  },
  ph: {
    value: 7.2,
    sensor: 'pH-4502C',
    calibrated: true,
    accuracy: '±0.02'
  },
  tds: {
    value: 850,
    sensor: 'TDS-3',
    calibrated: true,
    accuracy: '±2%'
  },
  dissolvedOxygen: 8.2,
  turbidity: 2.1,
  lastUpdate: '2 minutes ago'
};

const sampleFishHealth = {
  waterQuality: 92,
  feedingSchedule: 'On track',
  growthRate: 'Normal',
  healthStatus: 'Excellent',
  overallScore: 88,
  activityLevel: 85,
  feedingResponse: 92,
  stressLevel: 15
};

const sampleTemperatureData = [
  { time: '00:00', value: 24.2 },
  { time: '04:00', value: 24.1 },
  { time: '08:00', value: 24.5 },
  { time: '12:00', value: 24.8 },
  { time: '16:00', value: 24.6 },
  { time: '20:00', value: 24.3 }
];

const samplePhData = [
  { time: '00:00', value: 7.1 },
  { time: '04:00', value: 7.2 },
  { time: '08:00', value: 7.0 },
  { time: '12:00', value: 7.3 },
  { time: '16:00', value: 7.2 },
  { time: '20:00', value: 7.1 }
];

const sampleTdsData = [
  { time: '00:00', value: 845 },
  { time: '04:00', value: 850 },
  { time: '08:00', value: 855 },
  { time: '12:00', value: 860 },
  { time: '16:00', value: 852 },
  { time: '20:00', value: 848 }
];

// Water quality thresholds
const qualityThresholds = {
  temperature: { min: 22, max: 26, optimal: [23, 25] as [number, number] },
  ph: { min: 6.8, max: 7.5, optimal: [7.0, 7.3] as [number, number] },
  tds: { min: 800, max: 900, optimal: [820, 880] as [number, number] }
};

function FishEnvironment() {
  const [timeRange, setTimeRange] = useState('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Get data from store
  const { devices, selectedDevice, environmentData, alerts } = useStore();
  const { user } = useAuthStore();
  
  // Get current device data
  const currentDevice = devices.find(d => d.$id === selectedDevice && d.deviceType === 'fish');
  const fishData = environmentData.fish;
  const fishAlerts = alerts.filter(a => {
    const device = devices.find(d => d.deviceMac === a.deviceMac);
    return device?.deviceType === 'fish';
  });
  
  // Check if user is demo to show sample data
  const isDemo = user?.isDemo || false;
  
  // Only show data if user is demo or has actual device data
  const hasData = isDemo || (currentDevice && fishData.temperature.length > 0);
  
  // Use sample data for demo users, real data for others
  const esp32Status = isDemo ? sampleEsp32Status : {
    connected: currentDevice?.status === 'online',
    deviceId: currentDevice?.deviceName || 'No device',
    signalStrength: 0,
    batteryLevel: 0,
    lastSeen: 'Unknown',
    lastHeartbeat: 'Unknown'
  };
  
  const currentReadings = isDemo ? sampleCurrentReadings : {
    temperature: {
      value: fishData.temperature[fishData.temperature.length - 1]?.value || 0,
      sensor: 'Unknown',
      calibrated: false,
      accuracy: 'Unknown'
    },
    ph: {
      value: fishData.ph[fishData.ph.length - 1]?.value || 0,
      sensor: 'Unknown',
      calibrated: false,
      accuracy: 'Unknown'
    },
    tds: {
      value: fishData.dissolvedOxygen[fishData.dissolvedOxygen.length - 1]?.value || 0,
      sensor: 'Unknown',
      calibrated: false,
      accuracy: 'Unknown'
    },
    dissolvedOxygen: fishData.dissolvedOxygen[fishData.dissolvedOxygen.length - 1]?.value || 0,
    turbidity: fishData.turbidity[fishData.turbidity.length - 1]?.value || 0,
    lastUpdate: fishData.temperature[fishData.temperature.length - 1]?.timestamp || 'No data'
  };
  
  const fishHealth = isDemo ? sampleFishHealth : {
    waterQuality: 0,
    feedingSchedule: 'No data',
    growthRate: 'No data',
    healthStatus: 'No data',
    overallScore: 0,
    activityLevel: 0,
    feedingResponse: 0,
    stressLevel: 0
  };
  
  const displayAlerts = isDemo ? sampleAlerts : fishAlerts;
  
  // Chart data
  const temperatureData = hasData ? (isDemo ? sampleTemperatureData : fishData.temperature.map(reading => ({
    time: new Date(reading.timestamp).toLocaleTimeString(),
    value: reading.value
  }))) : [];
  
  const phData = hasData ? (isDemo ? samplePhData : fishData.ph.map(reading => ({
    time: new Date(reading.timestamp).toLocaleTimeString(),
    value: reading.value
  }))) : [];
  
  const tdsData = hasData ? (isDemo ? sampleTdsData : fishData.dissolvedOxygen.map(reading => ({
    time: new Date(reading.timestamp).toLocaleTimeString(),
    value: reading.value
  }))) : [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success('Sensor data refreshed');
  };

  const acknowledgeAlert = (alertId: number | string) => {
    if (isDemo) {
      const alert = sampleAlerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        toast.success('Alert acknowledged');
      }
    } else {
      // For real alerts, use the store's resolveAlert function
      const { resolveAlert } = useStore.getState();
      resolveAlert(alertId.toString());
      toast.success('Alert acknowledged');
    }
  };

  const calibrateSensor = (sensorType: string) => {
    toast.info(`Initiating ${sensorType} calibration...`);
  };

  const getStatusColor = (value: number, min: number, max: number, optimal?: [number, number]) => {
    if (optimal && value >= optimal[0] && value <= optimal[1]) return 'text-green-600';
    if (value >= min && value <= max) return 'text-blue-600';
    if (value < min || value > max) return 'text-red-600';
    return 'text-orange-600';
  };

  const getStatusBg = (value: number, min: number, max: number, optimal?: [number, number]) => {
    if (optimal && value >= optimal[0] && value <= optimal[1]) return 'bg-green-50 border-green-200';
    if (value >= min && value <= max) return 'bg-blue-50 border-blue-200';
    if (value < min || value > max) return 'bg-red-50 border-red-200';
    return 'bg-orange-50 border-orange-200';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBadgeVariant = (type: string) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-white/20 p-3">
              <Fish className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🐠 Fish Environment</h1>
              <p className="text-cyan-100 text-lg">Real-time aquatic monitoring with ESP32 sensors</p>
              <div className="flex items-center space-x-6 mt-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-cyan-100">Live Monitoring</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-cyan-200" />
                  <span className="text-sm text-cyan-100">Water Quality: {fishHealth.waterQuality}%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* ESP32 Status */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                {esp32Status.connected ? (
                  <Wifi className="h-5 w-5 text-green-300" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-300" />
                )}
                <div className="text-sm">
                  <div className="font-semibold text-white">{esp32Status.deviceId}</div>
                  <div className="text-cyan-200">Signal: {esp32Status.signalStrength}%</div>
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh 
                  ? 'bg-cyan-500 hover:bg-cyan-600 text-white' 
                  : 'bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm'
                }
              >
                <Activity className="h-4 w-4 mr-2" />
                Auto Refresh
              </Button>
            </div>
            
            <div className="text-sm text-cyan-100 bg-white/10 rounded-lg px-3 py-2">
              <div className="font-medium">Last updated</div>
              <div className="text-xs">{currentReadings.lastUpdate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ESP32 System Status */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-slate-600 to-blue-700 text-white rounded-t-lg pb-4">
          <CardTitle className="flex items-center space-x-3 text-xl">
            <div className="rounded-full bg-white/20 p-2">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold">🔧 ESP32 System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-4 rounded-xl border border-green-200">
              <div className="flex items-center space-x-3">
                <div className={`h-4 w-4 rounded-full ${esp32Status.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <div className="rounded-full bg-green-200 p-2">
                  {esp32Status.connected ? (
                    <Wifi className="h-5 w-5 text-green-600" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-green-700">Connection Status</div>
                <div className="text-sm text-green-600 font-medium">{esp32Status.connected ? '✅ Connected' : '❌ Disconnected'}</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-blue-200 p-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-blue-700">🔋 Battery Level</div>
                <div className="text-sm text-blue-600 font-medium">{esp32Status.batteryLevel}%</div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-cyan-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${esp32Status.batteryLevel}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-violet-100 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-purple-200 p-2">
                  <Wifi className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-purple-700">📶 Signal Strength</div>
                <div className="text-sm text-purple-600 font-medium">{esp32Status.signalStrength}%</div>
                <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-violet-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${esp32Status.signalStrength}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-100 to-amber-100 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-orange-200 p-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-orange-700">💓 Last Heartbeat</div>
                <div className="text-sm text-orange-600 font-medium">{esp32Status.lastHeartbeat}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Readings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-lg pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-white/20 p-2">
                  <Thermometer className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">🌡️ Water Temperature</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">{currentReadings.temperature.sensor}</Badge>
                    {currentReadings.temperature.calibrated && (
                      <CheckCircle className="h-4 w-4 text-cyan-200" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-cyan-600 mb-2">
                {currentReadings.temperature.value}°C
              </div>
              <div className="w-full bg-cyan-100 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((currentReadings.temperature.value / qualityThresholds.temperature.optimal[1]) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Optimal Range:</span>
                <span className="font-semibold text-cyan-700">{qualityThresholds.temperature.optimal[0]}-{qualityThresholds.temperature.optimal[1]}°C</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Accuracy:</span>
                <span className="font-semibold text-slate-700">{currentReadings.temperature.accuracy}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm bg-cyan-100 px-3 py-1 rounded-full">
                <TrendingUp className="h-4 w-4 text-cyan-600" />
                <span className="text-cyan-700 font-semibold">+0.2°C from yesterday</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calibrateSensor('Temperature')}
                className="bg-white/70 hover:bg-white border-cyan-200 text-cyan-700 hover:text-cyan-800"
              >
                <Settings className="h-4 w-4 mr-1" />
                Calibrate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-white/20 p-2">
                  <Droplets className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">🧪 pH Level</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">{currentReadings.ph.sensor}</Badge>
                    {currentReadings.ph.calibrated && (
                      <CheckCircle className="h-4 w-4 text-green-200" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {currentReadings.ph.value}
              </div>
              <div className="w-full bg-green-100 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((currentReadings.ph.value / qualityThresholds.ph.optimal[1]) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Optimal Range:</span>
                <span className="font-semibold text-green-700">{qualityThresholds.ph.optimal[0]}-{qualityThresholds.ph.optimal[1]}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Accuracy:</span>
                <span className="font-semibold text-slate-700">{currentReadings.ph.accuracy}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm bg-green-100 px-3 py-1 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-green-700 font-semibold">Stable</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calibrateSensor('pH')}
                className="bg-white/70 hover:bg-white border-green-200 text-green-700 hover:text-green-800"
              >
                <Settings className="h-4 w-4 mr-1" />
                Calibrate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-t-lg pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-white/20 p-2">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">⚡ TDS (Total Dissolved Solids)</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">{currentReadings.tds.sensor}</Badge>
                    {currentReadings.tds.calibrated && (
                      <CheckCircle className="h-4 w-4 text-purple-200" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {currentReadings.tds.value} ppm
              </div>
              <div className="w-full bg-purple-100 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-purple-400 to-violet-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((currentReadings.tds.value / qualityThresholds.tds.optimal[1]) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Optimal Range:</span>
                <span className="font-semibold text-purple-700">{qualityThresholds.tds.optimal[0]}-{qualityThresholds.tds.optimal[1]} ppm</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Accuracy:</span>
                <span className="font-semibold text-slate-700">{currentReadings.tds.accuracy}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm bg-purple-100 px-3 py-1 rounded-full">
                <AlertTriangle className="h-4 w-4 text-purple-600" />
                <span className="text-purple-700 font-semibold">Slightly elevated</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calibrateSensor('TDS')}
                className="bg-white/70 hover:bg-white border-purple-200 text-purple-700 hover:text-purple-800"
              >
                <Settings className="h-4 w-4 mr-1" />
                Calibrate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fish Health Overview */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-lg pb-4">
          <CardTitle className="flex items-center space-x-3 text-xl font-bold">
            <div className="rounded-full bg-white/20 p-2">
              <Fish className="h-6 w-6 text-white" />
            </div>
            <span>🐠 Fish Health Overview</span>
          </CardTitle>
          <CardDescription className="text-cyan-100 mt-2">Overall fish health and water quality assessment</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center bg-gradient-to-br from-green-100 to-emerald-200 p-4 rounded-xl border border-green-200">
              <div className="text-4xl font-bold text-green-600 mb-2">{fishHealth.overallScore}%</div>
              <div className="w-full bg-green-200 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${fishHealth.overallScore}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-green-700">💚 Overall Health</p>
            </div>
            <div className="text-center bg-gradient-to-br from-blue-100 to-cyan-200 p-4 rounded-xl border border-blue-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">{fishHealth.activityLevel}</div>
              <div className="w-full bg-blue-200 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-cyan-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `85%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-blue-700">🏊 Activity Level</p>
            </div>
            <div className="text-center bg-gradient-to-br from-purple-100 to-violet-200 p-4 rounded-xl border border-purple-200">
              <div className="text-4xl font-bold text-purple-600 mb-2">{fishHealth.feedingResponse}</div>
              <div className="w-full bg-purple-200 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-purple-400 to-violet-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `90%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-purple-700">🍽️ Feeding Response</p>
            </div>
            <div className="text-center bg-gradient-to-br from-orange-100 to-red-200 p-4 rounded-xl border border-orange-200">
              <div className="text-4xl font-bold text-orange-600 mb-2">{fishHealth.stressLevel}%</div>
              <div className="w-full bg-orange-200 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${fishHealth.stressLevel}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-orange-700">😰 Stress Level</p>
            </div>
          </div>
          <div className="mt-6 bg-gradient-to-r from-cyan-100 to-blue-100 p-4 rounded-xl border border-cyan-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-cyan-700">💧 Water Quality Score</span>
              <span className="text-lg font-bold text-cyan-600">{fishHealth.waterQuality}%</span>
            </div>
            <div className="w-full bg-cyan-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${fishHealth.waterQuality}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Range Selector */}
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">Time Range:</span>
        {['24h', '7d', '30d'].map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
            className={timeRange === range ? 'bg-sky-500 hover:bg-sky-600' : ''}
          >
            {range}
          </Button>
        ))}
      </div>

      {/* Historical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Thermometer className="h-5 w-5 text-sky-500" />
              <span>Temperature Trend</span>
            </CardTitle>
            <CardDescription>Water temperature over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0ea5e9" 
                  fill="#0ea5e9" 
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Droplets className="h-5 w-5 text-sky-500" />
              <span>pH Level Trend</span>
            </CardTitle>
            <CardDescription>pH levels over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={phData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[6.5, 7.8]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-sky-500" />
              <span>TDS Levels</span>
            </CardTitle>
            <CardDescription>Total Dissolved Solids concentration</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={tdsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0ea5e9" 
                  fill="#0ea5e9" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 via-orange-50 to-yellow-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-t-lg pb-4">
          <CardTitle className="flex items-center space-x-3 text-xl font-bold">
            <div className="rounded-full bg-white/20 p-2">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <span>🚨 Recent Alerts</span>
            <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30 text-sm px-3 py-1">
              {isDemo ? sampleAlerts.filter(alert => !alert.acknowledged).length : fishAlerts.filter(alert => !alert.resolved).length} unread
            </Badge>
          </CardTitle>
          <CardDescription className="text-orange-100 mt-2">System notifications and warnings</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {displayAlerts.map((alert) => {
              const typeColors = {
                critical: 'from-red-100 to-pink-200 border-red-300',
                warning: 'from-orange-100 to-yellow-200 border-orange-300',
                info: 'from-blue-100 to-cyan-200 border-blue-300',
                success: 'from-green-100 to-emerald-200 border-green-300'
              };
              const typeTextColors = {
                critical: 'text-red-700',
                warning: 'text-orange-700',
                info: 'text-blue-700',
                success: 'text-green-700'
              };
              return (
                <div key={alert.id} className={`flex items-center space-x-4 p-4 bg-gradient-to-r ${
                  alert.acknowledged 
                    ? 'from-slate-100 to-gray-200 border-slate-300 opacity-75' 
                    : typeColors[alert.type] || 'from-blue-100 to-cyan-200 border-blue-300'
                } border-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300`}>
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-white/70 p-2">
                      {getAlertIcon(alert.type)}
                    </div>
                    <Badge variant={getAlertBadgeVariant(alert.type)} className="text-xs px-3 py-1 font-semibold">
                      {alert.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${
                      alert.acknowledged ? 'text-slate-600' : typeTextColors[alert.type] || 'text-slate-900'
                    }`}>{alert.message}</p>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      📡 {alert.sensor} • ⏰ {alert.time}
                    </p>
                    {alert.recommendation && (
                      <p className="text-xs text-blue-700 mt-1 bg-blue-50 px-2 py-1 rounded-md inline-block">
                        💡 Recommendation: {alert.recommendation}
                      </p>
                    )}
                  </div>
                  {(isDemo ? !alert.acknowledged : !alert.resolved) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="bg-white/70 hover:bg-white border-slate-300 text-slate-700 hover:text-slate-800 font-semibold"
                    >
                      ✓ Acknowledge
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FishEnvironment;