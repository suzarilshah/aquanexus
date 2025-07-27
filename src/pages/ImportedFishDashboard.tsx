import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  Fish, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Thermometer, 
  Droplets, 
  Zap, 
  Eye,
  Download,
  Filter
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { format, subDays, subWeeks, subMonths, subYears, isAfter, isBefore } from 'date-fns';

interface SensorData {
  timestamp: string;
  temperature: number;
  ph: number;
  dissolved_oxygen: number;
  turbidity: number;
  ammonia: number;
  nitrite: number;
  nitrate: number;
}

// Mock imported fish data based on the CSV structure
const generateMockFishData = (): SensorData[] => {
  const data: SensorData[] = [];
  const startDate = new Date('2024-03-01T00:10:00Z');
  const endDate = new Date('2024-08-31T22:08:00Z');
  
  // Generate data points every 4 hours for the date range
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    data.push({
      timestamp: currentDate.toISOString(),
      temperature: 22 + Math.random() * 6, // 22-28°C
      ph: 6.8 + Math.random() * 0.8, // 6.8-7.6
      dissolved_oxygen: 6 + Math.random() * 3, // 6-9 mg/L
      turbidity: 1 + Math.random() * 4, // 1-5 NTU
      ammonia: 0.1 + Math.random() * 0.4, // 0.1-0.5 mg/L
      nitrite: 0.05 + Math.random() * 0.15, // 0.05-0.2 mg/L
      nitrate: 5 + Math.random() * 15 // 5-20 mg/L
    });
    
    // Add 4 hours
    currentDate = new Date(currentDate.getTime() + 4 * 60 * 60 * 1000);
  }
  
  return data;
};

export const ImportedFishDashboard: React.FC = () => {
  const { importedDatasets } = useAuthStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  
  const fishDatasets = importedDatasets.filter(d => d.type === 'fish');
  const mockData = useMemo(() => generateMockFishData(), []);
  
  // Set default dataset
  React.useEffect(() => {
    if (fishDatasets.length > 0 && !selectedDataset) {
      setSelectedDataset(fishDatasets[0].id);
    }
  }, [fishDatasets, selectedDataset]);
  
  const filteredData = useMemo(() => {
    if (!mockData.length) return [];
    
    const now = new Date();
    let startDate: Date;
    
    switch (selectedTimeRange) {
      case '1d':
        startDate = subDays(now, 1);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '6m':
        startDate = subMonths(now, 6);
        break;
      case '1y':
        startDate = subYears(now, 1);
        break;
      default:
        return mockData;
    }
    
    return mockData.filter(item => {
      const itemDate = new Date(item.timestamp);
      return isAfter(itemDate, startDate);
    });
  }, [mockData, selectedTimeRange]);
  
  const currentDataset = fishDatasets.find(d => d.id === selectedDataset);
  
  const calculateStats = (data: SensorData[], key: keyof SensorData) => {
    if (!data.length) return { avg: 0, min: 0, max: 0, trend: 0 };
    
    const values = data.map(d => Number(d[key])).filter(v => !isNaN(v));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate trend (simple: compare first half vs second half)
    const midPoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midPoint);
    const secondHalf = values.slice(midPoint);
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trend = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return { avg, min, max, trend };
  };
  
  const temperatureStats = calculateStats(filteredData, 'temperature');
  const phStats = calculateStats(filteredData, 'ph');
  const doStats = calculateStats(filteredData, 'dissolved_oxygen');
  const turbidityStats = calculateStats(filteredData, 'turbidity');
  
  const exportData = () => {
    const csvContent = [
      'Timestamp,Temperature (°C),pH,Dissolved Oxygen (mg/L),Turbidity (NTU),Ammonia (mg/L),Nitrite (mg/L),Nitrate (mg/L)',
      ...filteredData.map(row => 
        `${row.timestamp},${row.temperature.toFixed(2)},${row.ph.toFixed(2)},${row.dissolved_oxygen.toFixed(2)},${row.turbidity.toFixed(2)},${row.ammonia.toFixed(2)},${row.nitrite.toFixed(2)},${row.nitrate.toFixed(2)}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fish_data_${selectedTimeRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (fishDatasets.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Fish className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Fish Data Imported
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Import your fish environment data to view historical trends and analysis.
          </p>
          <Button onClick={() => window.location.href = '/data-import'}>
            Import Fish Data
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
            <Fish className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Fish Environment Data
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Historical analysis of imported fish environment data
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select value={selectedDataset} onValueChange={setSelectedDataset}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select dataset" />
          </SelectTrigger>
          <SelectContent>
            {fishDatasets.map(dataset => (
              <SelectItem key={dataset.id} value={dataset.id}>
                {dataset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="3m">Last 3 months</SelectItem>
            <SelectItem value="6m">Last 6 months</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Dataset Info */}
      {currentDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{currentDataset.name}</span>
              <Badge variant="secondary">
                {currentDataset.recordCount.toLocaleString()} records
              </Badge>
            </CardTitle>
            <CardDescription>
              Data range: {format(new Date(currentDataset.dateRange.start), 'MMM dd, yyyy')} - {format(new Date(currentDataset.dateRange.end), 'MMM dd, yyyy')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{temperatureStats.avg.toFixed(1)}°C</div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
              {temperatureStats.trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(temperatureStats.trend).toFixed(1)}% from previous period
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Range: {temperatureStats.min.toFixed(1)}°C - {temperatureStats.max.toFixed(1)}°C
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">pH Level</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phStats.avg.toFixed(2)}</div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
              {phStats.trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(phStats.trend).toFixed(1)}% from previous period
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Range: {phStats.min.toFixed(2)} - {phStats.max.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dissolved Oxygen</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doStats.avg.toFixed(1)} mg/L</div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
              {doStats.trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(doStats.trend).toFixed(1)}% from previous period
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Range: {doStats.min.toFixed(1)} - {doStats.max.toFixed(1)} mg/L
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turbidity</CardTitle>
            <Eye className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{turbidityStats.avg.toFixed(1)} NTU</div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
              {turbidityStats.trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              )}
              {Math.abs(turbidityStats.trend).toFixed(1)}% from previous period
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Range: {turbidityStats.min.toFixed(1)} - {turbidityStats.max.toFixed(1)} NTU
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Temperature & pH Trends</CardTitle>
            <CardDescription>
              Temperature and pH levels over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis yAxisId="temp" orientation="left" />
                <YAxis yAxisId="ph" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}${name === 'temperature' ? '°C' : ''}`,
                    name === 'temperature' ? 'Temperature' : 'pH'
                  ]}
                />
                <Line 
                  yAxisId="temp"
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="ph"
                  type="monotone" 
                  dataKey="ph" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Water Quality Parameters</CardTitle>
            <CardDescription>
              Dissolved oxygen and turbidity levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis yAxisId="do" orientation="left" />
                <YAxis yAxisId="turbidity" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}${name === 'dissolved_oxygen' ? ' mg/L' : ' NTU'}`,
                    name === 'dissolved_oxygen' ? 'Dissolved Oxygen' : 'Turbidity'
                  ]}
                />
                <Area 
                  yAxisId="do"
                  type="monotone" 
                  dataKey="dissolved_oxygen" 
                  stroke="#eab308" 
                  fill="#eab308"
                  fillOpacity={0.3}
                />
                <Area 
                  yAxisId="turbidity"
                  type="monotone" 
                  dataKey="turbidity" 
                  stroke="#6b7280" 
                  fill="#6b7280"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Nutrient Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Nutrient Levels</CardTitle>
          <CardDescription>
            Ammonia, nitrite, and nitrate concentrations over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(3)} mg/L`,
                  name.charAt(0).toUpperCase() + name.slice(1)
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="ammonia" 
                stroke="#dc2626" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="nitrite" 
                stroke="#ea580c" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="nitrate" 
                stroke="#16a34a" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportedFishDashboard;