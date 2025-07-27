import React, { useState, useEffect } from 'react';
import { 
  Leaf, 
  Thermometer, 
  Droplets, 
  Wind, 
  TrendingUp,
  Calendar,
  BarChart3,
  Activity,
  Zap,
  Wifi,
  WifiOff,
  Settings,
  RefreshCw,
  Bell,
  CheckCircle,
  XCircle,
  Ruler,
  Gauge
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';

// ESP32 Health Check Types
interface ESP32HealthStatus {
  connected: boolean;
  deviceId: string;
  batteryLevel: number;
  signalStrength: number;
  lastHeartbeat: string;
  uptime: string;
  status: 'all_online' | 'some_issues' | 'registered_unhealthy' | 'not_registered';
  statusMessage: string;
}

interface SensorData {
  height: {
    value: number;
    sensor: string;
    distance: number;
    accuracy: string;
    calibrated: boolean;
  };
  temperature: {
    value: number;
    sensor: string;
    accuracy: string;
    calibrated: boolean;
  };
  humidity: {
    value: number;
    sensor: string;
    accuracy: string;
    calibrated: boolean;
  };
  pressure: {
    value: number;
    sensor: string;
    accuracy: string;
    calibrated: boolean;
  };
}

// ESP32 Health Check Function
const checkESP32Health = async (): Promise<ESP32HealthStatus> => {
  try {
    // Simulate API call to check ESP32 status
    // In a real implementation, this would call your backend API
    const response = await fetch('/api/esp32/health-check');
    
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('ESP32 health check failed:', error);
    
    // Return default offline status when health check fails
    return {
      connected: false,
      deviceId: 'ESP32-PLANT-001',
      batteryLevel: 0,
      signalStrength: 0,
      lastHeartbeat: 'Never',
      uptime: '0s',
      status: 'not_registered',
      statusMessage: 'No microcontroller is connected'
    };
  }
};

// Mock function to simulate database retrieval of sensor data
const getSensorDataFromDatabase = async (): Promise<SensorData | null> => {
  try {
    // Simulate API call to get sensor data from database
    const response = await fetch('/api/sensors/current-readings');
    
    if (!response.ok) {
      throw new Error('Failed to fetch sensor data');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch sensor data:', error);
    return null;
  }
};

// Sample data for demo purposes
const sampleGrowthData = [
  { date: '2024-01-01', height: 5.2 },
  { date: '2024-01-02', height: 5.8 },
  { date: '2024-01-03', height: 6.1 },
  { date: '2024-01-04', height: 6.7 },
  { date: '2024-01-05', height: 7.2 },
  { date: '2024-01-06', height: 7.8 },
  { date: '2024-01-07', height: 8.3 }
];

const sampleEnvironmentalData = [
  { time: '00:00', temperature: 22.1, humidity: 65, pressure: 1013.2 },
  { time: '04:00', temperature: 21.8, humidity: 68, pressure: 1013.5 },
  { time: '08:00', temperature: 23.2, humidity: 62, pressure: 1013.8 },
  { time: '12:00', temperature: 24.5, humidity: 58, pressure: 1014.1 },
  { time: '16:00', temperature: 25.1, humidity: 55, pressure: 1014.3 },
  { time: '20:00', temperature: 23.8, humidity: 61, pressure: 1014.0 }
];

// Demo ESP32 status for demo users
const demoESP32Status: ESP32HealthStatus = {
  connected: true,
  deviceId: 'ESP32-PLANT-001',
  batteryLevel: 87,
  signalStrength: -45,
  lastHeartbeat: '2 min ago',
  uptime: '3d 14h 22m',
  status: 'all_online',
  statusMessage: 'All Microcontroller is detected - All System online'
};

// Demo sensor data for demo users
const demoSensorData: SensorData = {
  height: {
    value: 8.3,
    sensor: 'HC-SR04',
    distance: 12.7,
    accuracy: '±0.3cm',
    calibrated: true
  },
  temperature: {
    value: 23.5,
    sensor: 'DHT22',
    accuracy: '±0.5°C',
    calibrated: true
  },
  humidity: {
    value: 62,
    sensor: 'DHT22',
    accuracy: '±2%',
    calibrated: true
  },
  pressure: {
    value: 1014.2,
    sensor: 'BMP280',
    accuracy: '±1hPa',
    calibrated: true
  }
};

const plantHealth = {
  overallScore: 92,
  growthRate: 2.1,
  leafHealth: 88,
  nutrientUptake: 85,
  environmentalStress: 15,
  photosynthesisEfficiency: 91
};

const sampleAlerts = [
  {
    id: 1,
    type: 'warning',
    message: 'Temperature slightly above optimal range',
    sensor: 'DHT22 Temperature',
    time: '10 min ago',
    acknowledged: false,
    recommendation: 'Consider improving ventilation or adjusting room temperature'
  },
  {
    id: 2,
    type: 'success',
    message: 'Plant height increased by 0.5cm in the last 24 hours',
    sensor: 'HC-SR04 Distance',
    time: '1 hour ago',
    acknowledged: true,
    recommendation: null
  },
  {
    id: 3,
    type: 'info',
    message: 'Humidity levels are optimal for plant growth',
    sensor: 'DHT22 Humidity',
    time: '2 hours ago',
    acknowledged: false,
    recommendation: 'Maintain current humidity levels'
  }
];

// Quality thresholds for plant environment
const qualityThresholds = {
  height: {
    min: 5,
    max: 25,
    optimal: [15, 20] as [number, number]
  },
  temperature: {
    min: 18,
    max: 28,
    optimal: [20, 25] as [number, number]
  },
  humidity: {
    min: 50,
    max: 80,
    optimal: [60, 70] as [number, number]
  },
  pressure: {
    min: 1000,
    max: 1030,
    optimal: [1010, 1020] as [number, number]
  }
};



function PlantEnvironment() {
  const [timeRange, setTimeRange] = useState('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [esp32Status, setESP32Status] = useState<ESP32HealthStatus | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  
  // Get data from store
  const { devices, selectedDevice, environmentData, alerts } = useStore();
  const { user } = useAuthStore();
  
  // Get current device data
  const currentDevice = devices.find(d => d.$id === selectedDevice && d.deviceType === 'plant');
  const plantData = environmentData.plant;
  const plantAlerts = alerts.filter(a => {
    const device = devices.find(d => d.deviceMac === a.deviceMac);
    return device?.deviceType === 'plant';
  });
  
  // Check if user is demo to show sample data
  const isDemo = user?.isDemo || false;
  
  // Health check effect
  useEffect(() => {
    const performHealthCheck = async () => {
      setIsLoadingHealth(true);
      
      if (isDemo) {
        // Use demo data for demo users
        setESP32Status(demoESP32Status);
        setSensorData(demoSensorData);
      } else {
        // Perform actual health check for real users
        try {
          const [healthStatus, currentSensorData] = await Promise.all([
            checkESP32Health(),
            getSensorDataFromDatabase()
          ]);
          
          setESP32Status(healthStatus);
          setSensorData(currentSensorData);
        } catch (error) {
          console.error('Health check failed:', error);
          // Set default offline status
          setESP32Status({
            connected: false,
            deviceId: 'ESP32-PLANT-001',
            batteryLevel: 0,
            signalStrength: 0,
            lastHeartbeat: 'Never',
            uptime: '0s',
            status: 'not_registered',
            statusMessage: 'No microcontroller is connected'
          });
          setSensorData(null);
        }
      }
      
      setIsLoadingHealth(false);
    };
    
    performHealthCheck();
    
    // Set up auto-refresh if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(performHealthCheck, 30000); // Check every 30 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isDemo, autoRefresh]);
  
  // Only show data if user is demo, has actual device data, or ESP32 is connected and streaming
  const hasData = isDemo || (esp32Status?.connected && sensorData);
  
  // Use sample data for demo or when no real data is available
  const growthData = hasData ? (isDemo ? sampleGrowthData : plantData.temperature.map((reading, index) => ({
    date: new Date(reading.timestamp).toLocaleDateString(),
    height: reading.value
  }))) : [];
  
  const environmentalData = hasData ? (isDemo ? sampleEnvironmentalData : plantData.temperature.map((reading, index) => ({
     time: new Date(reading.timestamp).toLocaleTimeString(),
     temperature: reading.value,
     humidity: plantData.humidity[index]?.value || 0,
     pressure: 1013.2 // Default pressure value since it's not in plant data
   }))) : [];
  
  const displayAlerts = hasData ? (isDemo ? sampleAlerts : plantAlerts) : [];
  
  // Get status message based on ESP32 status
  const getStatusMessage = (status: ESP32HealthStatus | null): string => {
    if (!status) return 'No microcontroller is connected';
    
    switch (status.status) {
      case 'all_online':
        return 'All Microcontroller is detected - All System online';
      case 'some_issues':
        return 'Some Microcontroller is having an issue';
      case 'registered_unhealthy':
        return 'No Microcontroller is detected - registered but not healthy';
      case 'not_registered':
      default:
        return 'No microcontroller is connected';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    if (isDemo) {
      // Simulate API call delay for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Plant environment data refreshed');
    } else {
      // Perform actual health check and data refresh
      try {
        const [healthStatus, currentSensorData] = await Promise.all([
          checkESP32Health(),
          getSensorDataFromDatabase()
        ]);
        
        setESP32Status(healthStatus);
        setSensorData(currentSensorData);
        toast.success('Plant environment data refreshed');
      } catch (error) {
        console.error('Refresh failed:', error);
        toast.error('Failed to refresh data');
      }
    }
    
    setIsRefreshing(false);
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

  const calibrateSensor = (sensorName: string) => {
    toast.info(`Initiating ${sensorName} sensor calibration...`);
    // Simulate calibration process
    setTimeout(() => {
      toast.success(`${sensorName} sensor calibrated successfully`);
    }, 2000);
  };

  const getStatusColor = (value: number, min: number, max: number, optimal?: [number, number]) => {
    if (optimal && value >= optimal[0] && value <= optimal[1]) {
      return 'text-green-600';
    }
    if (value >= min && value <= max) {
      return 'text-blue-600';
    }
    return 'text-red-600';
  };

  const getStatusBg = (value: number, min: number, max: number, optimal?: [number, number]) => {
    if (optimal && value >= optimal[0] && value <= optimal[1]) {
      return 'bg-green-50 border-green-200';
    }
    if (value >= min && value <= max) {
      return 'bg-blue-50 border-blue-200';
    }
    return 'bg-red-50 border-red-200';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Activity className="h-4 w-4 text-orange-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBadgeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
              <Leaf className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">Plant Environment</h1>
              <p className="text-green-100 mt-2 text-lg">🌱 Growth tracking &amp; environmental monitoring</p>
              <div className="mt-3 flex items-center space-x-4">
                <div className="flex items-center space-x-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
                  <div className="h-2 w-2 rounded-full bg-green-300 animate-pulse"></div>
                  <span className="text-sm font-medium">Live Monitoring</span>
                </div>
                <div className="flex items-center space-x-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Growth Rate: +2.1%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
              {esp32Status?.connected ? (
                <Wifi className="h-5 w-5 text-green-200" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-300" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {isLoadingHealth ? 'Checking...' : getStatusMessage(esp32Status)}
                </span>
                <span className="text-xs text-green-100">{esp32Status?.deviceId || 'No Device'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm transition-all duration-200"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant={autoRefresh ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`${autoRefresh ? 'bg-white text-green-600 hover:bg-white/90' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'} backdrop-blur-sm transition-all duration-200`}
              >
                <Zap className="h-4 w-4 mr-2" />
                Auto
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ESP32 System Status */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-slate-50 to-blue-50">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center space-x-3">
            <div className="rounded-full bg-white/20 p-2">
              <Gauge className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">ESP32 System Status</span>
              <p className="text-blue-100 text-sm font-normal mt-1">🔧 Plant monitoring system hardware status</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200">
              <div className={`h-4 w-4 rounded-full animate-pulse ${
                esp32Status?.connected ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'
              }`} />
              <div>
                <p className="text-sm font-semibold text-slate-700">Connection Status</p>
                <p className={`text-lg font-bold ${
                  esp32Status?.connected ? 'text-green-600' : 'text-red-600'
                }`}>
                  {esp32Status?.connected ? '🟢 Online' : '🔴 Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-100 border border-blue-200">
              <div className="rounded-full bg-blue-500 p-2">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Battery Level</p>
                <p className="text-lg font-bold text-blue-600">🔋 {esp32Status?.batteryLevel || 0}%</p>
                <Progress value={esp32Status?.batteryLevel || 0} className="w-16 h-2 mt-1" />
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-100 border border-purple-200">
              <div className="rounded-full bg-purple-500 p-2">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Signal Strength</p>
                <p className="text-lg font-bold text-purple-600">📶 {esp32Status?.signalStrength || 0} dBm</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-100 border border-orange-200">
              <div className="rounded-full bg-orange-500 p-2">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Last Heartbeat</p>
                <p className="text-lg font-bold text-orange-600">💓 {esp32Status?.lastHeartbeat || 'Never'}</p>
                <p className="text-xs text-slate-500">Uptime: {esp32Status?.uptime || '0s'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Readings - Only show when ESP32 is connected and streaming */}
      {hasData && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-white/20 p-2">
                  <Ruler className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">🌱 Plant Height</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">{sensorData?.height.sensor || demoSensorData.height.sensor}</Badge>
                    {(sensorData?.height.calibrated || demoSensorData.height.calibrated) && (
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
                {sensorData?.height.value || demoSensorData.height.value} cm
              </div>
              <div className="w-full bg-green-100 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((sensorData?.height.value || demoSensorData.height.value) / qualityThresholds.height.optimal[1]) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Target Range:</span>
                <span className="font-semibold text-green-700">{qualityThresholds.height.optimal[0]}-{qualityThresholds.height.optimal[1]} cm</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">📏 Sensor Distance:</span>
                <span className="font-semibold text-slate-700">{sensorData?.height.distance || demoSensorData.height.distance} cm</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Accuracy:</span>
                <span className="font-semibold text-slate-700">{sensorData?.height.accuracy || demoSensorData.height.accuracy}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm bg-green-100 px-3 py-1 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-green-700 font-semibold">+0.8 cm this week</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calibrateSensor('Height')}
                className="bg-white/70 hover:bg-white border-green-200 text-green-700 hover:text-green-800"
              >
                <Settings className="h-4 w-4 mr-1" />
                Calibrate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-lg pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-white/20 p-2">
                  <Thermometer className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">🌡️ Temperature</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">{sensorData?.temperature.sensor || demoSensorData.temperature.sensor}</Badge>
                    {(sensorData?.temperature.calibrated || demoSensorData.temperature.calibrated) && (
                      <CheckCircle className="h-4 w-4 text-orange-200" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-orange-600 mb-2">
                {sensorData?.temperature.value || demoSensorData.temperature.value}°C
              </div>
              <div className="w-full bg-orange-100 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-amber-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((sensorData?.temperature.value || demoSensorData.temperature.value) / qualityThresholds.temperature.optimal[1]) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Optimal Range:</span>
                <span className="font-semibold text-orange-700">{qualityThresholds.temperature.optimal[0]}-{qualityThresholds.temperature.optimal[1]}°C</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Accuracy:</span>
                <span className="font-semibold text-slate-700">{sensorData?.temperature.accuracy || demoSensorData.temperature.accuracy}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm bg-orange-100 px-3 py-1 rounded-full">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span className="text-orange-700 font-semibold">+1.2°C from yesterday</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calibrateSensor('Temperature')}
                className="bg-white/70 hover:bg-white border-orange-200 text-orange-700 hover:text-orange-800"
              >
                <Settings className="h-4 w-4 mr-1" />
                Calibrate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-lg pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-white/20 p-2">
                  <Droplets className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">💧 Humidity</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">{sensorData?.humidity.sensor || demoSensorData.humidity.sensor}</Badge>
                    {(sensorData?.humidity.calibrated || demoSensorData.humidity.calibrated) && (
                      <CheckCircle className="h-4 w-4 text-blue-200" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {sensorData?.humidity.value || demoSensorData.humidity.value}%
              </div>
              <div className="w-full bg-blue-100 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-cyan-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((sensorData?.humidity.value || demoSensorData.humidity.value) / 100) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Optimal Range:</span>
                <span className="font-semibold text-blue-700">{qualityThresholds.humidity.optimal[0]}-{qualityThresholds.humidity.optimal[1]}%</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Accuracy:</span>
                <span className="font-semibold text-slate-700">{sensorData?.humidity.accuracy || demoSensorData.humidity.accuracy}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm bg-blue-100 px-3 py-1 rounded-full">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700 font-semibold">Good level</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calibrateSensor('Humidity')}
                className="bg-white/70 hover:bg-white border-blue-200 text-blue-700 hover:text-blue-800"
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
                  <Wind className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">🌪️ Air Pressure</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">{sensorData?.pressure.sensor || demoSensorData.pressure.sensor}</Badge>
                    {(sensorData?.pressure.calibrated || demoSensorData.pressure.calibrated) && (
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
                {sensorData?.pressure.value || demoSensorData.pressure.value} hPa
              </div>
              <div className="w-full bg-purple-100 rounded-full h-3 mb-3">
                <div 
                  className="bg-gradient-to-r from-purple-400 to-violet-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((sensorData?.pressure.value || demoSensorData.pressure.value) / qualityThresholds.pressure.optimal[1]) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Optimal Range:</span>
                <span className="font-semibold text-purple-700">{qualityThresholds.pressure.optimal[0]}-{qualityThresholds.pressure.optimal[1]} hPa</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="text-slate-600">🎯 Accuracy:</span>
                <span className="font-semibold text-slate-700">{sensorData?.pressure.accuracy || demoSensorData.pressure.accuracy}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm bg-purple-100 px-3 py-1 rounded-full">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-purple-700 font-semibold">Stable</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calibrateSensor('Pressure')}
                className="bg-white/70 hover:bg-white border-purple-200 text-purple-700 hover:text-purple-800"
              >
                <Settings className="h-4 w-4 mr-1" />
                Calibrate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Plant Health Overview - Only show when ESP32 is connected and streaming */}
      {hasData && (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 via-green-50 to-lime-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-t-lg pb-6">
          <CardTitle className="flex items-center space-x-3 text-xl">
            <div className="rounded-full bg-white/20 p-2">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold">🌿 Plant Health Overview</span>
          </CardTitle>
          <CardDescription className="text-green-100 mt-2">Comprehensive plant wellness and growth assessment</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="text-center bg-gradient-to-br from-green-100 to-emerald-100 p-4 rounded-xl border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-2">{plantHealth.overallScore}%</div>
              <div className="w-full bg-green-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${plantHealth.overallScore}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-green-700">💚 Overall Health</p>
            </div>
            <div className="text-center bg-gradient-to-br from-blue-100 to-cyan-100 p-4 rounded-xl border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">{plantHealth.growthRate}%</div>
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${plantHealth.growthRate * 10}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-blue-700">📈 Growth Rate</p>
            </div>
            <div className="text-center bg-gradient-to-br from-purple-100 to-violet-100 p-4 rounded-xl border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">{plantHealth.leafHealth}%</div>
              <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-purple-400 to-violet-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${plantHealth.leafHealth}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-purple-700">🍃 Leaf Health</p>
            </div>
            <div className="text-center bg-gradient-to-br from-orange-100 to-amber-100 p-4 rounded-xl border border-orange-200">
              <div className="text-3xl font-bold text-orange-600 mb-2">{plantHealth.nutrientUptake}%</div>
              <div className="w-full bg-orange-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${plantHealth.nutrientUptake}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-orange-700">🌱 Nutrient Uptake</p>
            </div>
            <div className="text-center bg-gradient-to-br from-red-100 to-pink-100 p-4 rounded-xl border border-red-200">
              <div className="text-3xl font-bold text-red-600 mb-2">{plantHealth.environmentalStress}%</div>
              <div className="w-full bg-red-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-red-400 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${plantHealth.environmentalStress}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-red-700">⚠️ Stress Level</p>
            </div>
            <div className="text-center bg-gradient-to-br from-teal-100 to-cyan-100 p-4 rounded-xl border border-teal-200">
              <div className="text-3xl font-bold text-teal-600 mb-2">{plantHealth.photosynthesisEfficiency}%</div>
              <div className="w-full bg-teal-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-teal-400 to-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${plantHealth.photosynthesisEfficiency}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-teal-700">☀️ Photosynthesis</p>
            </div>
          </div>
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold text-green-800">🌟 Environmental Quality Score</span>
              <span className="text-lg font-bold text-green-600">{plantHealth.overallScore}%</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 h-4 rounded-full transition-all duration-1000 shadow-lg"
                style={{ width: `${plantHealth.overallScore}%` }}
              ></div>
            </div>
            <p className="text-sm text-green-700 mt-2 text-center font-medium">Excellent plant health conditions detected! 🎉</p>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Alerts - Only show when ESP32 is connected and streaming */}
      {hasData && (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-t-lg pb-4">
          <CardTitle className="flex items-center space-x-3 text-xl">
            <div className="rounded-full bg-white/20 p-2">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold">🚨 Recent Alerts</span>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-sm">
              {isDemo ? sampleAlerts.filter(alert => !alert.acknowledged).length : plantAlerts.filter(alert => !alert.resolved).length} unread
            </Badge>
          </CardTitle>
          <CardDescription className="text-orange-100 mt-2">System notifications and recommendations</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {displayAlerts.map((alert) => (
              <div key={alert.id} className={`flex items-center space-x-4 p-4 rounded-xl border-l-4 shadow-md transition-all duration-300 hover:shadow-lg ${
                alert.type === 'critical' 
                  ? 'bg-gradient-to-r from-red-50 to-pink-50 border-l-red-500' 
                  : alert.type === 'warning' 
                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-yellow-500' 
                  : 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-green-500'
              } ${alert.acknowledged ? 'opacity-70' : ''}`}>
                <div className="flex items-center space-x-3">
                  <div className={`rounded-full p-2 ${
                    alert.type === 'critical' 
                      ? 'bg-red-100' 
                      : alert.type === 'warning' 
                      ? 'bg-yellow-100' 
                      : 'bg-green-100'
                  }`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <Badge 
                    variant={getAlertBadgeVariant(alert.type)} 
                    className={`text-sm font-semibold ${
                      alert.type === 'critical' 
                        ? 'bg-red-100 text-red-700 border-red-200' 
                        : alert.type === 'warning' 
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-200' 
                        : 'bg-green-100 text-green-700 border-green-200'
                    }`}
                  >
                    {alert.type.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    alert.acknowledged ? 'text-slate-600' : 'text-slate-900'
                  }`}>{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    📡 {alert.sensor} • ⏰ {alert.time}
                  </p>
                  {alert.recommendation && (
                    <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
                      💡 Recommendation: {alert.recommendation}
                    </p>
                  )}
                </div>
                {!alert.acknowledged && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="bg-white/70 hover:bg-white border-slate-200 text-slate-700 hover:text-slate-800 text-xs"
                  >
                    ✓ Acknowledge
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Time Range Selector - Only show when ESP32 is connected and streaming */}
      {hasData && (
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">Time Range:</span>
        {['24h', '7d', '30d'].map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
            className={timeRange === range ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            {range}
          </Button>
        ))}
      </div>
      )}

      {/* Charts - Only show when ESP32 is connected and streaming */}
      {hasData && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <span>Growth Progress</span>
            </CardTitle>
            <CardDescription>Plant height over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="height" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Thermometer className="h-5 w-5 text-green-500" />
              <span>Temperature &amp; Humidity</span>
            </CardTitle>
            <CardDescription>Environmental conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={environmentalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="temp" orientation="left" />
                <YAxis yAxisId="humidity" orientation="right" />
                <Tooltip />
                <Line 
                  yAxisId="temp"
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Temperature (°C)"
                />
                <Line 
                  yAxisId="humidity"
                  type="monotone" 
                  dataKey="humidity" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  name="Humidity (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wind className="h-5 w-5 text-green-500" />
              <span>Air Pressure Trend</span>
            </CardTitle>
            <CardDescription>Atmospheric pressure readings</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={environmentalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="pressure" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Growth Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span>Growth Milestones</span>
          </CardTitle>
          <CardDescription>Key development stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Seedling Stage</span>
                  <span className="text-sm text-green-600">✓ Completed</span>
                </div>
                <p className="text-sm text-slate-600">0-5 cm height</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Vegetative Growth</span>
                  <span className="text-sm text-green-600">✓ Completed</span>
                </div>
                <p className="text-sm text-slate-600">5-10 cm height</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Mature Growth</span>
                  <span className="text-sm text-blue-600">● In Progress</span>
                </div>
                <p className="text-sm text-slate-600">10-15 cm height</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-3 w-3 rounded-full bg-slate-300" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Harvest Ready</span>
                  <span className="text-sm text-slate-500">○ Pending</span>
                </div>
                <p className="text-sm text-slate-600">15+ cm height</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* No Data Message */}
      {!hasData && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 to-gray-100">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <WifiOff className="h-16 w-16 text-slate-400" />
              <div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  {isLoadingHealth ? 'Checking ESP32 Status...' : getStatusMessage(esp32Status)}
                </h3>
                <p className="text-slate-500">
                  {isLoadingHealth 
                    ? 'Please wait while we check your microcontroller status.' 
                    : 'Connect your ESP32 device to start monitoring your plant environment.'
                  }
                </p>
              </div>
              {!isLoadingHealth && (
                <Button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Check Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PlantEnvironment;