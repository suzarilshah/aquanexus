import { useStore } from '@/store/useStore';
import { SensorReading } from '@/store/useStore';

// Predefined demo data based on the CSV structure
const DEMO_FISH_DATA = [
  {
    timestamp: '2024-01-01T08:00:00Z',
    temperature: 24.5,
    ph: 7.2,
    ec: 450,
    tds: 225,
    turbidity: 2.1
  },
  {
    timestamp: '2024-01-01T08:30:00Z',
    temperature: 24.8,
    ph: 7.1,
    ec: 465,
    tds: 232,
    turbidity: 2.3
  },
  {
    timestamp: '2024-01-01T09:00:00Z',
    temperature: 25.1,
    ph: 7.0,
    ec: 470,
    tds: 235,
    turbidity: 2.5
  },
  {
    timestamp: '2024-01-01T09:30:00Z',
    temperature: 25.3,
    ph: 6.9,
    ec: 480,
    tds: 240,
    turbidity: 2.8
  },
  {
    timestamp: '2024-01-01T10:00:00Z',
    temperature: 25.0,
    ph: 7.1,
    ec: 475,
    tds: 237,
    turbidity: 2.4
  }
];

const DEMO_PLANT_DATA = [
  {
    timestamp: '2024-01-01T08:00:00Z',
    height: 15.2,
    temperature: 22.5,
    humidity: 65.0,
    pressure: 101325
  },
  {
    timestamp: '2024-01-01T08:30:00Z',
    height: 15.3,
    temperature: 23.1,
    humidity: 67.2,
    pressure: 101320
  },
  {
    timestamp: '2024-01-01T09:00:00Z',
    height: 15.4,
    temperature: 23.8,
    humidity: 69.5,
    pressure: 101315
  },
  {
    timestamp: '2024-01-01T09:30:00Z',
    height: 15.5,
    temperature: 24.2,
    humidity: 71.0,
    pressure: 101310
  },
  {
    timestamp: '2024-01-01T10:00:00Z',
    height: 15.6,
    temperature: 24.0,
    humidity: 68.8,
    pressure: 101318
  }
];

class DemoDataService {
  private fishDataIndex = 0;
  private plantDataIndex = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private isStreaming = false;

  constructor() {
    this.fishDataIndex = 0;
    this.plantDataIndex = 0;
  }

  startStreaming(intervalMs: number = 5000) {
    if (this.isStreaming) {
      console.log('Demo data streaming is already active');
      return;
    }

    this.isStreaming = true;
    console.log('Starting demo data streaming...');

    this.intervalId = setInterval(() => {
      this.sendNextDataPoint();
    }, intervalMs);

    // Send initial data point immediately
    this.sendNextDataPoint();
  }

  stopStreaming() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isStreaming = false;
    console.log('Demo data streaming stopped');
  }

  private sendNextDataPoint() {
    const store = useStore.getState();
    
    // Send fish data
    const fishData = DEMO_FISH_DATA[this.fishDataIndex % DEMO_FISH_DATA.length];
    const currentTime = new Date().toISOString();
    
    // Convert fish data to sensor readings
    const fishReadings = [
      {
        timestamp: currentTime,
        value: fishData.temperature,
        unit: '°C',
        status: this.getSensorStatus(fishData.temperature, 20, 28),
        deviceMac: '00:11:22:33:44:55',
        sensorType: 'temperature'
      } as SensorReading,
      {
        timestamp: currentTime,
        value: fishData.ph,
        unit: 'pH',
        status: this.getSensorStatus(fishData.ph, 6.5, 7.5),
        deviceMac: '00:11:22:33:44:55',
        sensorType: 'ph'
      } as SensorReading,
      {
        timestamp: currentTime,
        value: fishData.ec,
        unit: 'uS/cm',
        status: this.getSensorStatus(fishData.ec, 400, 600),
        deviceMac: '00:11:22:33:44:55',
        sensorType: 'ec'
      } as SensorReading,
      {
        timestamp: currentTime,
        value: fishData.turbidity,
        unit: 'NTU',
        status: this.getSensorStatus(fishData.turbidity, 0, 5),
        deviceMac: '00:11:22:33:44:55',
        sensorType: 'turbidity'
      } as SensorReading
    ];

    // Send plant data
    const plantData = DEMO_PLANT_DATA[this.plantDataIndex % DEMO_PLANT_DATA.length];
    
    const plantReadings = [
      {
        timestamp: currentTime,
        value: plantData.height,
        unit: 'cm',
        status: 'normal' as const,
        deviceMac: '00:11:22:33:44:66',
        sensorType: 'height'
      } as SensorReading,
      {
        timestamp: currentTime,
        value: plantData.temperature,
        unit: '°C',
        status: this.getSensorStatus(plantData.temperature, 18, 30),
        deviceMac: '00:11:22:33:44:66',
        sensorType: 'temperature'
      } as SensorReading,
      {
        timestamp: currentTime,
        value: plantData.humidity,
        unit: '%',
        status: this.getSensorStatus(plantData.humidity, 50, 80),
        deviceMac: '00:11:22:33:44:66',
        sensorType: 'humidity'
      } as SensorReading,
      {
        timestamp: currentTime,
        value: plantData.pressure,
        unit: 'Pa',
        status: this.getSensorStatus(plantData.pressure, 101000, 102000),
        deviceMac: '00:11:22:33:44:66',
        sensorType: 'pressure'
      } as SensorReading
    ];

    // Add readings to store
    fishReadings.forEach(reading => {
      if (reading.sensorType === 'temperature') {
        store.addSensorReading('fish', 'temperature', reading);
      } else if (reading.sensorType === 'ph') {
        store.addSensorReading('fish', 'ph', reading);
      } else if (reading.sensorType === 'turbidity') {
        store.addSensorReading('fish', 'turbidity', reading);
      }
    });

    plantReadings.forEach(reading => {
      if (reading.sensorType === 'temperature') {
        store.addSensorReading('plant', 'temperature', reading);
      } else if (reading.sensorType === 'humidity') {
        store.addSensorReading('plant', 'humidity', reading);
      }
    });

    // Update device status
    store.updateDevice('00:11:22:33:44:55', {
      status: 'online',
      lastSeen: currentTime
    });

    store.updateDevice('00:11:22:33:44:66', {
      status: 'online',
      lastSeen: currentTime
    });

    // Increment indices
    this.fishDataIndex++;
    this.plantDataIndex++;

    console.log(`Demo data sent - Fish: ${this.fishDataIndex}, Plant: ${this.plantDataIndex}`);
  }

  private getSensorStatus(value: number, min: number, max: number): 'normal' | 'warning' | 'critical' {
    if (value < min * 0.9 || value > max * 1.1) {
      return 'critical';
    } else if (value < min || value > max) {
      return 'warning';
    }
    return 'normal';
  }

  isStreamingActive(): boolean {
    return this.isStreaming;
  }

  getCurrentIndices() {
    return {
      fish: this.fishDataIndex,
      plant: this.plantDataIndex
    };
  }

  resetIndices() {
    this.fishDataIndex = 0;
    this.plantDataIndex = 0;
  }
}

// Export singleton instance
export const demoDataService = new DemoDataService();
export default demoDataService;