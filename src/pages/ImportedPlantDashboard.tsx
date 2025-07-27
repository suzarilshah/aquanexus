import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { 
  Leaf, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Thermometer, 
  Droplets, 
  Sun, 
  Zap,
  Download,
  Filter
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { format, subDays, subWeeks, subMonths, subYears, isAfter, isBefore } from 'date-fns';

interface PlantSensorData {
  timestamp: string;
  air_temperature: number;
  air_humidity: number;
  soil_moisture: number;
  light_intensity: number;
  soil_ph: number;
  electrical_conductivity: number;
  co2_level: number;
}

// Mock imported plant data based on the CSV structure
const generateMockPlantData = (): PlantSensorData[] => {
  const data: PlantSensorData[] = [];
  const startDate = new Date('2024-03-01T00:10:00Z');
  const endDate = new Date('2024-08-31T22:08:00Z');
  
  // Generate data points every 4 hours for the date range
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    data.push({
      timestamp: currentDate.toISOString(),
      air_temperature: 20 + Math.random() * 10, // 20-30°C
      air_humidity: 50 + Math.random() * 30, // 50-80%
      soil_moisture: 40 + Math.random() * 40, // 40-80%
      light_intensity: 200 + Math.random() * 600, // 200-800 lux
      soil_ph: 6.0 + Math.random() * 1.5, // 6.0-7.5
      electrical_conductivity: 1.0 + Math.random() * 2.0, // 1.0-3.0 mS/cm
      co2_level: 300 + Math.random() * 500 // 300-800 ppm
    });
    
    // Add 4 hours
    currentDate = new Date(currentDate.getTime() + 4 * 60 * 60 * 1000);
  }
  
  return data;
};

export const ImportedPlantDashboard: React.FC = () => {
  const { importedDatasets } = useAuthStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  
  const plantDatasets = importedDatasets.filter(d => d.type === 'plant');
  const mockData = useMemo(() => generateMockPlantData(), []);
  
  // Set default dataset
  React.useEffect(() => {
    if (plantDatasets.length > 0 && !selectedDataset) {
      setSelectedDataset(plantDatasets[0].id);
    }
  }, [plantDatasets, selectedDataset]);
  
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
  
  const currentDataset = plantDatasets.find(d => d.id === selectedDataset);
  
  const calculateStats = (data: PlantSensorData[], key: keyof PlantSensorData) => {
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
  
  const temperatureStats = calculateStats(filteredData, 'air_temperature');
  const humidityStats = calculateStats(filteredData, 'air_humidity');
  const moistureStats = calculateStats(filteredData, 'soil_moisture');
  const lightStats = calculateStats(filteredData, 'light_intensity');
  const phStats = calculateStats(filteredData, 'soil_ph');
  const ecStats = calculateStats(filteredData, 'electrical_conductivity');
  
  const exportData = () => {
    const csvContent = [
      'Timestamp,Air Temperature (°C),Air Humidity (%),Soil Moisture (%),Light Intensity (lux),Soil pH,Electrical Conductivity (mS/cm),CO2 Level (ppm)',
      ...filteredData.map(row => 
        `${row.timestamp},${row.air_temperature.toFixed(2)},${row.air_humidity.toFixed(2)},${row.soil_moisture.toFixed(2)},${row.light_intensity.toFixed(0)},${row.soil_ph.toFixed(2)},${row.electrical_conductivity.toFixed(2)},${row.co2_level.toFixed(0)}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plant_data_${selectedTimeRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (plantDatasets.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Leaf className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Plant Data Imported
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Import your plant environment data to view historical trends and analysis.
          </p>
          <Button onClick={() => window.location.href = '/data-import'}>
            Import Plant Data
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
          <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
            <Leaf className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Plant Environment Data
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Historical analysis of imported plant environment data
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
            {plantDatasets.map(dataset => (
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
            <CardTitle className="text-sm font-medium">Air Temperature</CardTitle>
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
            <CardTitle className="text-sm font-medium">Air Humidity</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{humidityStats.avg.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
              {humidityStats.trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(humidityStats.trend).toFixed(1)}% from previous period
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Range: {humidityStats.min.toFixed(1)}% - {humidityStats.max.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Soil Moisture</CardTitle>
            <Droplets className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moistureStats.avg.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
              {moistureStats.trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(moistureStats.trend).toFixed(1)}% from previous period
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Range: {moistureStats.min.toFixed(1)}% - {moistureStats.max.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Light Intensity</CardTitle>
            <Sun className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lightStats.avg.toFixed(0)} lux</div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
              {lightStats.trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(lightStats.trend).toFixed(1)}% from previous period
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Range: {lightStats.min.toFixed(0)} - {lightStats.max.toFixed(0)} lux
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Temperature & Humidity</CardTitle>
            <CardDescription>
              Air temperature and humidity levels over time
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
                <YAxis yAxisId="humidity" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}${name === 'air_temperature' ? '°C' : '%'}`,
                    name === 'air_temperature' ? 'Air Temperature' : 'Air Humidity'
                  ]}
                />
                <Line 
                  yAxisId="temp"
                  type="monotone" 
                  dataKey="air_temperature" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="humidity"
                  type="monotone" 
                  dataKey="air_humidity" 
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
            <CardTitle>Soil Conditions</CardTitle>
            <CardDescription>
              Soil moisture and pH levels
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
                <YAxis yAxisId="moisture" orientation="left" />
                <YAxis yAxisId="ph" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}${name === 'soil_moisture' ? '%' : ''}`,
                    name === 'soil_moisture' ? 'Soil Moisture' : 'Soil pH'
                  ]}
                />
                <Area 
                  yAxisId="moisture"
                  type="monotone" 
                  dataKey="soil_moisture" 
                  stroke="#06b6d4" 
                  fill="#06b6d4"
                  fillOpacity={0.3}
                />
                <Area 
                  yAxisId="ph"
                  type="monotone" 
                  dataKey="soil_ph" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Light and CO2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Light Intensity</CardTitle>
            <CardDescription>
              Light levels throughout the monitoring period
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
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
                  formatter={(value: number) => [`${value.toFixed(0)} lux`, 'Light Intensity']}
                />
                <Area 
                  type="monotone" 
                  dataKey="light_intensity" 
                  stroke="#eab308" 
                  fill="#eab308"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Electrical Conductivity & CO2</CardTitle>
            <CardDescription>
              Nutrient availability and CO2 levels
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
                <YAxis yAxisId="ec" orientation="left" />
                <YAxis yAxisId="co2" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(name === 'electrical_conductivity' ? 2 : 0)}${name === 'electrical_conductivity' ? ' mS/cm' : ' ppm'}`,
                    name === 'electrical_conductivity' ? 'Electrical Conductivity' : 'CO2 Level'
                  ]}
                />
                <Line 
                  yAxisId="ec"
                  type="monotone" 
                  dataKey="electrical_conductivity" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="co2"
                  type="monotone" 
                  dataKey="co2_level" 
                  stroke="#84cc16" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Soil pH Distribution</CardTitle>
            <CardDescription>
              pH level frequency distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average pH:</span>
                <Badge variant={phStats.avg >= 6.0 && phStats.avg <= 7.5 ? 'default' : 'destructive'}>
                  {phStats.avg.toFixed(2)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">pH Range:</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {phStats.min.toFixed(2)} - {phStats.max.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Optimal Range (6.0-7.5):</span>
                <Badge variant="outline">
                  {Math.round((filteredData.filter(d => d.soil_ph >= 6.0 && d.soil_ph <= 7.5).length / filteredData.length) * 100)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Electrical Conductivity</CardTitle>
            <CardDescription>
              Nutrient availability indicator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average EC:</span>
                <Badge variant={ecStats.avg >= 1.5 && ecStats.avg <= 2.5 ? 'default' : 'secondary'}>
                  {ecStats.avg.toFixed(2)} mS/cm
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">EC Range:</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {ecStats.min.toFixed(2)} - {ecStats.max.toFixed(2)} mS/cm
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Optimal Range (1.5-2.5):</span>
                <Badge variant="outline">
                  {Math.round((filteredData.filter(d => d.electrical_conductivity >= 1.5 && d.electrical_conductivity <= 2.5).length / filteredData.length) * 100)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImportedPlantDashboard;