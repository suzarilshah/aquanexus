import { useStore } from '@/store/useStore';
import { parseFishCSV, parsePlantCSV, loadCSVFromPath } from './csvParser';

class DemoDataSimulator {
  private fishData: any[] = [];
  private plantData: any[] = [];
  private fishIndex = 0;
  private plantIndex = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async initialize() {
    try {
      // Load CSV data from the provided paths
      const fishCSV = await loadCSVFromPath('/fish_initial.csv');
      const plantCSV = await loadCSVFromPath('/plant_initial.csv');
      
      // Parse CSV data
      this.fishData = this.parseFishDataForDemo(fishCSV);
      this.plantData = this.parsePlantDataForDemo(plantCSV);
      
      console.log('Demo data initialized:', {
        fishRecords: this.fishData.length,
        plantRecords: this.plantData.length
      });
    } catch (error) {
      console.error('Failed to initialize demo data:', error);
      // Fallback to mock data if CSV loading fails
      this.generateFallbackData();
    }
  }

  private parseFishDataForDemo(csvContent: string) {
    const lines = csvContent.trim().split('\n');
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 6) {
        data.push({
          temperature: parseFloat(values[1]) || 0,
          ec: parseFloat(values[2]) || 0,
          tds: parseFloat(values[3]) || 0,
          turbidity: parseFloat(values[4]) || 0,
          ph: parseFloat(values[5]) || 0
        });
      }
    }
    
    return data;
  }

  private parsePlantDataForDemo(csvContent: string) {
    const lines = csvContent.trim().split('\n');
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 5) {
        data.push({
          height: parseFloat(values[1]) || 0,
          temperature: parseFloat(values[2]) || 0,
          humidity: parseFloat(values[3]) || 0,
          pressure: parseFloat(values[4]) || 0
        });
      }
    }
    
    return data;
  }

  private generateFallbackData() {
    // Generate fallback data if CSV loading fails
    this.fishData = Array.from({ length: 100 }, (_, i) => ({
      temperature: 22 + Math.sin(i * 0.1) * 3 + Math.random() * 2,
      ec: 800 + Math.sin(i * 0.05) * 200 + Math.random() * 100,
      tds: 400 + Math.sin(i * 0.05) * 100 + Math.random() * 50,
      turbidity: 10 + Math.sin(i * 0.03) * 5 + Math.random() * 3,
      ph: 7.2 + Math.sin(i * 0.02) * 0.5 + Math.random() * 0.3
    }));

    this.plantData = Array.from({ length: 100 }, (_, i) => ({
      height: 15 + i * 0.1 + Math.random() * 2,
      temperature: 24 + Math.sin(i * 0.1) * 4 + Math.random() * 2,
      humidity: 65 + Math.sin(i * 0.08) * 15 + Math.random() * 5,
      pressure: 101325 + Math.sin(i * 0.05) * 1000 + Math.random() * 500
    }));
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Send data every 5 seconds to simulate real-time streaming
    this.intervalId = setInterval(() => {
      this.sendNextDataPoint();
    }, 5000);
    
    console.log('Demo data simulator started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Demo data simulator stopped');
  }

  private sendNextDataPoint() {
    const store = useStore.getState();
    const currentTime = new Date().toISOString();
    
    // Send fish data
    if (this.fishData.length > 0) {
      const fishPoint = this.fishData[this.fishIndex];
      
      // Create sensor readings for fish environment
      const fishReadings = [
        {
          timestamp: currentTime,
          value: fishPoint.temperature,
          unit: '°C',
          status: this.getSensorStatus(fishPoint.temperature, { min: 20, max: 28 }),
          deviceMac: 'demo-fish-device',
          sensorType: 'temperature'
        },
        {
          timestamp: currentTime,
          value: fishPoint.ph,
          unit: 'pH',
          status: this.getSensorStatus(fishPoint.ph, { min: 6.5, max: 8.0 }),
          deviceMac: 'demo-fish-device',
          sensorType: 'ph'
        },
        {
          timestamp: currentTime,
          value: fishPoint.turbidity,
          unit: 'NTU',
          status: this.getSensorStatus(fishPoint.turbidity, { min: 0, max: 50 }),
          deviceMac: 'demo-fish-device',
          sensorType: 'turbidity'
        }
      ];
      
      fishReadings.forEach(reading => store.addSensorReading('fish', reading.sensorType || 'temperature', reading));
      
      this.fishIndex = (this.fishIndex + 1) % this.fishData.length;
    }
    
    // Send plant data
    if (this.plantData.length > 0) {
      const plantPoint = this.plantData[this.plantIndex];
      
      // Create sensor readings for plant environment
      const plantReadings = [
        {
          timestamp: currentTime,
          value: plantPoint.temperature,
          unit: '°C',
          status: this.getSensorStatus(plantPoint.temperature, { min: 18, max: 30 }),
          deviceMac: 'demo-plant-device',
          sensorType: 'temperature'
        },
        {
          timestamp: currentTime,
          value: plantPoint.humidity,
          unit: '%',
          status: this.getSensorStatus(plantPoint.humidity, { min: 50, max: 90 }),
          deviceMac: 'demo-plant-device',
          sensorType: 'humidity'
        },
        {
          timestamp: currentTime,
          value: plantPoint.height,
          unit: 'cm',
          status: this.getSensorStatus(plantPoint.height, { min: 5, max: 50 }),
          deviceMac: 'demo-plant-device',
          sensorType: 'height'
        }
      ];
      
      plantReadings.forEach(reading => store.addSensorReading('plant', reading.sensorType || 'soilMoisture', reading));
      
      this.plantIndex = (this.plantIndex + 1) % this.plantData.length;
    }
    
    // Update system status
    store.updateSystemStatus();
  }

  private getSensorStatus(value: number, thresholds: { min: number; max: number }): 'normal' | 'warning' | 'critical' {
    if (value < thresholds.min || value > thresholds.max) {
      return 'critical';
    }
    const range = thresholds.max - thresholds.min;
    const warningMargin = range * 0.1;
    if (value < thresholds.min + warningMargin || value > thresholds.max - warningMargin) {
      return 'warning';
    }
    return 'normal';
  }

  isActive() {
    return this.isRunning;
  }

  getDataInfo() {
    return {
      fishRecords: this.fishData.length,
      plantRecords: this.plantData.length,
      fishIndex: this.fishIndex,
      plantIndex: this.plantIndex
    };
  }
}

// Export singleton instance
export const demoSimulator = new DemoDataSimulator();