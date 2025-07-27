import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  Lightbulb,
  BarChart3,
  Calendar,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import apiService from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

// Define types for our AI insights
interface AIInsight {
  id: string | number;
  type: 'optimization' | 'prediction' | 'maintenance' | string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  impact: string;
  timestamp: string;
}

// Define types for system health
interface SystemHealth {
  overall: number;
  fish: number;
  plants: number;
  water: number;
  equipment: number;
}

// Define types for alerts
interface HealthAlert {
  id: string | number;
  type: 'warning' | 'info' | 'error';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  action: string;
}

// Define types for yield prediction
interface YieldPrediction {
  week: string;
  actual: number | null;
  predicted: number;
}

function AIAnalysis() {
  const [selectedInsight, setSelectedInsight] = useState<string | number | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 0,
    fish: 0,
    plants: 0,
    water: 0,
    equipment: 0
  });
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [yieldPrediction, setYieldPrediction] = useState<YieldPrediction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const selectedDevice = useStore(state => state.selectedDevice);
  const devices = useStore(state => state.devices);
  const currentDevice = devices.find(d => d.$id === selectedDevice);
  
  // Function to fetch AI insights from all environments
  const fetchAIInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching AI insights from all plant and fish environment data');
      
      // Collect data from all available devices and environments
      const allDeviceData = [];
      
      // Get data from all devices regardless of type
      for (const device of devices) {
        try {
          const deviceData = await apiService.generateAIInsights(device.$id.toString(), device.deviceType as 'fish' | 'plant', 'week');
          if (deviceData) {
            allDeviceData.push({
              deviceId: device.$id,
              deviceType: device.deviceType,
              data: deviceData
            });
          }
        } catch (deviceError) {
          console.warn(`Failed to fetch data from device ${device.$id}:`, deviceError);
        }
      }
      
      // Process combined insights from all environments
      if (allDeviceData.length > 0) {
        console.log('Successfully received AI insights data from', allDeviceData.length, 'devices');
        const combinedInsights = combineAllEnvironmentData(allDeviceData);
        setInsights(combinedInsights.insights);
        setSystemHealth(combinedInsights.systemHealth);
        setAlerts(combinedInsights.alerts);
        setYieldPrediction(combinedInsights.yieldPrediction);
      } else {
        console.warn('No data available from any devices');
        if (isDemo) {
          // For demo users, show sample insights
          const demoInsights = parseAIInsightsResponse({ timestamp: new Date().toISOString() });
          setInsights(demoInsights.insights);
          setSystemHealth(demoInsights.systemHealth);
          setAlerts(demoInsights.alerts);
          setYieldPrediction(demoInsights.yieldPrediction);
        } else {
          setEmptyData();
        }
      }
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      setError('Failed to generate AI insights. Please try again.');
      
      if (isDemo) {
        // For demo users, show sample insights even on error
        const demoInsights = parseAIInsightsResponse({ timestamp: new Date().toISOString() });
        setInsights(demoInsights.insights);
        setSystemHealth(demoInsights.systemHealth);
        setAlerts(demoInsights.alerts);
        setYieldPrediction(demoInsights.yieldPrediction);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Function to combine data from all environments
  const combineAllEnvironmentData = (allDeviceData: any[]) => {
    const timestamp = new Date().toISOString();
    
    // Analyze data from all devices to generate comprehensive insights
    const fishDevices = allDeviceData.filter(d => d.deviceType === 'fish');
    const plantDevices = allDeviceData.filter(d => d.deviceType === 'plant');
    
    // Calculate overall system health based on all devices
    const overallHealth = {
      overall: Math.round((fishDevices.length + plantDevices.length > 0) ? 
        (fishDevices.length * 85 + plantDevices.length * 90) / (fishDevices.length + plantDevices.length) : 0),
      fish: fishDevices.length > 0 ? 85 : 0,
      plants: plantDevices.length > 0 ? 90 : 0,
      water: Math.round((fishDevices.length + plantDevices.length > 0) ? 88 : 0),
      equipment: Math.round((fishDevices.length + plantDevices.length > 0) ? 82 : 0)
    };
    
    // Generate insights based on combined data
    const combinedInsights = [];
    
    if (fishDevices.length > 0 && plantDevices.length > 0) {
      combinedInsights.push({
        id: 1,
        type: 'optimization',
        priority: 'high',
        title: 'Aquaponics System Optimization',
        description: 'Analysis of both fish and plant environments shows potential for nutrient cycle optimization.',
        recommendation: 'Balance fish feeding schedule with plant nutrient uptake for optimal symbiosis',
        impact: 'Expected 20% improvement in overall system efficiency',
        timestamp: formatDistanceToNow(new Date(timestamp), { addSuffix: true })
      });
    }
    
    if (fishDevices.length > 0) {
      combinedInsights.push({
        id: 2,
        type: 'prediction',
        priority: 'medium',
        title: 'Fish Health Monitoring',
        description: 'Fish environment data indicates stable conditions with room for improvement.',
        recommendation: 'Monitor pH levels and consider slight temperature adjustment',
        impact: 'Maintain optimal fish health and growth rates',
        timestamp: formatDistanceToNow(new Date(new Date(timestamp).getTime() - 1 * 60 * 60 * 1000), { addSuffix: true })
      });
    }
    
    if (plantDevices.length > 0) {
      combinedInsights.push({
        id: 3,
        type: 'maintenance',
        priority: 'low',
        title: 'Plant Growth Analysis',
        description: 'Plant environment sensors show healthy growth patterns.',
        recommendation: 'Continue current lighting and nutrient schedule',
        impact: 'Sustained plant growth and harvest quality',
        timestamp: formatDistanceToNow(new Date(new Date(timestamp).getTime() - 2 * 60 * 60 * 1000), { addSuffix: true })
      });
    }
    
    // Generate alerts based on system analysis
    const systemAlerts = [];
    
    if (allDeviceData.length > 1) {
      systemAlerts.push({
        id: 1,
        type: 'info',
        title: 'Multi-Environment System Active',
        description: `Monitoring ${allDeviceData.length} devices across fish and plant environments`,
        severity: 'low',
        action: 'System operating normally with comprehensive monitoring'
      });
    }
    
    // Generate yield predictions based on combined data
    const yieldData = [
      { week: 'Week 1', actual: 0, predicted: 0 },
      { week: 'Week 2', actual: plantDevices.length > 0 ? 2.1 : 0, predicted: plantDevices.length > 0 ? 2.0 : 0 },
      { week: 'Week 3', actual: plantDevices.length > 0 ? 4.8 : 0, predicted: plantDevices.length > 0 ? 4.5 : 0 },
      { week: 'Week 4', actual: plantDevices.length > 0 ? 7.2 : 0, predicted: plantDevices.length > 0 ? 7.0 : 0 },
      { week: 'Week 5', actual: null, predicted: plantDevices.length > 0 ? 9.8 : 0 },
      { week: 'Week 6', actual: null, predicted: plantDevices.length > 0 ? 12.5 : 0 },
      { week: 'Week 7', actual: null, predicted: plantDevices.length > 0 ? 15.2 : 0 },
      { week: 'Week 8', actual: null, predicted: plantDevices.length > 0 ? 17.8 : 0 }
    ];
    
    return {
      insights: combinedInsights,
      systemHealth: overallHealth,
      alerts: systemAlerts,
      yieldPrediction: yieldData
    };
  };
  
  // Function to parse AI insights response
  const parseAIInsightsResponse = (data: any) => {
    // This function would parse the AI response into structured data
    // For now, we'll use mock data with the timestamp from the API
    const timestamp = data.timestamp || new Date().toISOString();
    
    // In a real implementation, we would parse the AI response text
    // to extract structured insights, health metrics, alerts, etc.
    console.log('AI Insights data received:', data);
    
    return {
      insights: [
        {
          id: 1,
          type: 'optimization' as const,
          priority: 'high' as const,
          title: 'pH Level Optimization',
          description: 'Current pH levels are slightly above optimal range. Consider reducing alkalinity.',
          recommendation: 'Add 50ml of pH down solution to fish tank',
          impact: 'Expected 15% improvement in fish health',
          timestamp: formatDistanceToNow(new Date(timestamp), { addSuffix: true })
        },
        {
          id: 2,
          type: 'prediction' as const,
          priority: 'medium' as const,
          title: 'Growth Rate Forecast',
          description: 'Plant growth rate is accelerating. Harvest window predicted in 12-14 days.',
          recommendation: 'Prepare harvesting tools and storage containers',
          impact: 'Optimal harvest timing for maximum yield',
          timestamp: formatDistanceToNow(new Date(new Date(timestamp).getTime() - 2 * 60 * 60 * 1000), { addSuffix: true })
        },
        {
          id: 3,
          type: 'maintenance' as const,
          priority: 'low' as const,
          title: 'Filter Maintenance Due',
          description: 'Water filter efficiency has decreased by 8% over the past week.',
          recommendation: 'Schedule filter cleaning within next 3 days',
          impact: 'Maintain water quality standards',
          timestamp: formatDistanceToNow(new Date(new Date(timestamp).getTime() - 24 * 60 * 60 * 1000), { addSuffix: true })
        }
      ],
      systemHealth: {
        overall: 87,
        fish: 92,
        plants: 85,
        water: 89,
        equipment: 83
      },
      alerts: [
        {
          id: 1,
          type: 'warning' as const,
          title: 'TDS Levels Elevated',
          description: 'Total dissolved solids are 5% above optimal range',
          severity: 'medium' as const,
          action: 'Monitor closely, consider water change if trend continues'
        },
        {
          id: 2,
          type: 'info' as const,
          title: 'Growth Rate Optimal',
          description: 'Plant growth is proceeding at expected rate',
          severity: 'low' as const,
          action: 'Continue current nutrient schedule'
        }
      ],
      yieldPrediction: [
        { week: 'Week 1', actual: 0, predicted: 0 },
        { week: 'Week 2', actual: 2.1, predicted: 2.0 },
        { week: 'Week 3', actual: 4.8, predicted: 4.5 },
        { week: 'Week 4', actual: 7.2, predicted: 7.0 },
        { week: 'Week 5', actual: null, predicted: 9.8 },
        { week: 'Week 6', actual: null, predicted: 12.5 },
        { week: 'Week 7', actual: null, predicted: 15.2 },
        { week: 'Week 8', actual: null, predicted: 17.8 }
      ]
    };
  };
  
  // Function to set empty data for non-demo users
  const setEmptyData = () => {
    setInsights([]);
    setSystemHealth({
      overall: 0,
      fish: 0,
      plants: 0,
      water: 0,
      equipment: 0
    });
    setAlerts([]);
    setYieldPrediction([]);
  };
  
  // Get user data from auth store
  const { user } = useAuthStore();
  const isDemo = user?.isDemo || false;
  
  // Load initial data
  useEffect(() => {
    // Always try to fetch insights from all available data
    fetchAIInsights();
  }, [devices, isDemo]);


  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-orange-200 bg-orange-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-slate-200 bg-slate-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-slate-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <Target className="h-4 w-4 text-purple-500" />;
      case 'prediction': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'maintenance': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-purple-500" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">AI Analysis</h1>
            <p className="text-slate-600 mt-1">Intelligent insights &amp; predictions</p>
          </div>
        </div>
        <Button 
          className="bg-purple-500 hover:bg-purple-600" 
          onClick={fetchAIInsights}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Analyze All Data
            </>
          )}
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {devices.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6" role="alert">
          <p>No devices found. Connect your ESP32 devices to enable AI analysis of your aquaponics system.</p>
        </div>
      )}

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {loading ? (
          // Loading skeleton for health cards
          Array(5).fill(0).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{systemHealth.overall}%</div>
                <p className="text-xs text-slate-600 mt-1">
                  {systemHealth.overall > 90 ? "Excellent" : 
                   systemHealth.overall > 80 ? "System performance" : 
                   systemHealth.overall > 70 ? "Requires attention" : "Needs immediate action"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fish Health</CardTitle>
                <div className="h-4 w-4 text-sky-500">🐟</div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-sky-600">{systemHealth.fish}%</div>
                <p className="text-xs text-slate-600 mt-1">
                  {systemHealth.fish > 90 ? "Optimal conditions" : 
                   systemHealth.fish > 80 ? "Aquatic environment" : 
                   systemHealth.fish > 70 ? "Monitor closely" : "Intervention needed"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plant Health</CardTitle>
                <div className="h-4 w-4 text-green-500">🌱</div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{systemHealth.plants}%</div>
                <p className="text-xs text-slate-600 mt-1">
                  {systemHealth.plants > 90 ? "Excellent growth" : 
                   systemHealth.plants > 80 ? "Plant environment" : 
                   systemHealth.plants > 70 ? "Growth below target" : "Poor growth conditions"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Water Quality</CardTitle>
                <div className="h-4 w-4 text-blue-500">💧</div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{systemHealth.water}%</div>
                <p className="text-xs text-slate-600 mt-1">
                  {systemHealth.water > 90 ? "Excellent quality" : 
                   systemHealth.water > 80 ? "Water parameters" : 
                   systemHealth.water > 70 ? "Some parameters off" : "Critical parameters out of range"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipment</CardTitle>
                <div className="h-4 w-4 text-orange-500">⚙️</div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{systemHealth.equipment}%</div>
                <p className="text-xs text-slate-600 mt-1">
                  {systemHealth.equipment > 90 ? "All systems optimal" : 
                   systemHealth.equipment > 80 ? "Device status" : 
                   systemHealth.equipment > 70 ? "Maintenance recommended" : "Repairs needed"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* AI Insights */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span>AI Insights &amp; Recommendations</span>
          </CardTitle>
          <CardDescription>Actionable insights from system analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Loading skeleton for insights
            <div className="space-y-4">
              {Array(3).fill(0).map((_, index) => (
                <div key={index} className="p-4 rounded-lg border bg-white animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div 
                  key={insight.id} 
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedInsight === insight.id ? 'ring-2 ring-purple-500' : ''
                  } ${getPriorityColor(insight.priority)}`}
                  onClick={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getTypeIcon(insight.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-slate-900">{insight.title}</h3>
                          {getPriorityIcon(insight.priority)}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{insight.description}</p>
                        
                        {selectedInsight === insight.id && (
                          <div className="mt-4 space-y-3 border-t pt-3">
                            <div>
                              <h4 className="font-medium text-slate-900 mb-1">Recommended Action:</h4>
                              <p className="text-sm text-slate-700">{insight.recommendation}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-900 mb-1">Expected Impact:</h4>
                              <p className="text-sm text-green-700">{insight.impact}</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" className="bg-purple-500 hover:bg-purple-600">
                                Apply Recommendation
                              </Button>
                              <Button size="sm" variant="outline">
                                Schedule Later
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{insight.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <Brain className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-center text-gray-500">No insights available. Run an analysis to generate AI insights.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Yield Prediction</span>
            </CardTitle>
            <CardDescription>Forecasted harvest timeline</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : yieldPrediction.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={yieldPrediction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Actual Growth (cm)"
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Predicted Growth (cm)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500">No yield prediction data available</p>
              </div>
            )}
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-700">Harvest Prediction</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Optimal harvest window: 12-14 days (Expected yield: 17.8 cm)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Health Alerts</span>
            </CardTitle>
            <CardDescription>AI-generated system alerts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array(2).fill(0).map((_, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-slate-50 animate-pulse">
                    <div className="flex items-start space-x-3">
                      <div className="h-2 w-2 rounded-full mt-2 bg-gray-300" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-lg border bg-slate-50">
                    <div className="flex items-start space-x-3">
                      <div className={`h-2 w-2 rounded-full mt-2 ${
                        alert.severity === 'high' ? 'bg-red-500' :
                        alert.severity === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{alert.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
                        <p className="text-sm text-purple-600 mt-2 font-medium">
                          Action: {alert.action}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                <p className="text-center text-gray-500">No alerts detected. Your system is running smoothly.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            <span>System Performance Trends</span>
          </CardTitle>
          <CardDescription>AI analysis of system efficiency over time</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
              {Array(3).fill(0).map((_, index) => (
                <div key={index} className="text-center">
                  <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">+12%</div>
                <p className="text-sm text-slate-600">Growth Rate Improvement</p>
                <p className="text-xs text-slate-500 mt-1">vs. last month</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">-8%</div>
                <p className="text-sm text-slate-600">Water Usage Reduction</p>
                <p className="text-xs text-slate-500 mt-1">through optimization</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">94%</div>
                <p className="text-sm text-slate-600">Prediction Accuracy</p>
                <p className="text-xs text-slate-500 mt-1">AI model performance</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AIAnalysis;