// ESP32 API Service for health checks and sensor data

// Types
export interface ESP32HealthStatus {
  connected: boolean;
  deviceId: string;
  batteryLevel: number;
  signalStrength: number;
  lastHeartbeat: string;
  uptime: string;
  status: 'all_online' | 'some_issues' | 'registered_unhealthy' | 'not_registered';
  statusMessage: string;
}

export interface SensorData {
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

// Mock ESP32 API Service
class ESP32ApiService {
  private baseUrl = '/api/esp32';
  
  // Simulate different ESP32 states for testing
  private mockStates = {
    all_online: {
      connected: true,
      deviceId: 'ESP32-PLANT-001',
      batteryLevel: 87,
      signalStrength: -45,
      lastHeartbeat: '2 min ago',
      uptime: '3d 14h 22m',
      status: 'all_online' as const,
      statusMessage: 'All Microcontroller is detected - All System online'
    },
    some_issues: {
      connected: true,
      deviceId: 'ESP32-PLANT-001',
      batteryLevel: 23,
      signalStrength: -78,
      lastHeartbeat: '15 min ago',
      uptime: '1d 2h 15m',
      status: 'some_issues' as const,
      statusMessage: 'Some Microcontroller is having an issue'
    },
    registered_unhealthy: {
      connected: false,
      deviceId: 'ESP32-PLANT-001',
      batteryLevel: 5,
      signalStrength: -95,
      lastHeartbeat: '2 hours ago',
      uptime: '0s',
      status: 'registered_unhealthy' as const,
      statusMessage: 'No Microcontroller is detected - registered but not healthy'
    },
    not_registered: {
      connected: false,
      deviceId: 'Unknown',
      batteryLevel: 0,
      signalStrength: 0,
      lastHeartbeat: 'Never',
      uptime: '0s',
      status: 'not_registered' as const,
      statusMessage: 'No microcontroller is connected'
    }
  };
  
  private mockSensorData: SensorData = {
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
  
  // Simulate network delay
  private async simulateNetworkDelay(min = 500, max = 1500): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Get current ESP32 state (for testing different scenarios)
  private getCurrentState(): ESP32HealthStatus {
    // Simulate different states based on time or random selection
    const states = Object.keys(this.mockStates);
    const randomState = states[Math.floor(Math.random() * states.length)] as keyof typeof this.mockStates;
    
    // For demo purposes, mostly return 'all_online' state
    const probability = Math.random();
    if (probability < 0.7) {
      return this.mockStates.all_online;
    } else if (probability < 0.85) {
      return this.mockStates.some_issues;
    } else if (probability < 0.95) {
      return this.mockStates.registered_unhealthy;
    } else {
      return this.mockStates.not_registered;
    }
  }
  
  // Health check endpoint
  async checkHealth(): Promise<ESP32HealthStatus> {
    try {
      await this.simulateNetworkDelay();
      
      // In a real implementation, this would make an actual HTTP request
      // const response = await fetch(`${this.baseUrl}/health-check`);
      // if (!response.ok) throw new Error('Health check failed');
      // return await response.json();
      
      // For now, return mock data
      return this.getCurrentState();
    } catch (error) {
      console.error('ESP32 health check failed:', error);
      return this.mockStates.not_registered;
    }
  }
  
  // Get current sensor readings
  async getCurrentSensorData(): Promise<SensorData | null> {
    try {
      await this.simulateNetworkDelay(200, 800);
      
      // In a real implementation, this would make an actual HTTP request
      // const response = await fetch(`${this.baseUrl}/sensors/current`);
      // if (!response.ok) throw new Error('Failed to fetch sensor data');
      // return await response.json();
      
      // Check if ESP32 is connected first
      const healthStatus = await this.checkHealth();
      if (!healthStatus.connected) {
        return null;
      }
      
      // Return mock sensor data with some variation
      return {
        height: {
          ...this.mockSensorData.height,
          value: this.mockSensorData.height.value + (Math.random() - 0.5) * 2, // ±1cm variation
        },
        temperature: {
          ...this.mockSensorData.temperature,
          value: this.mockSensorData.temperature.value + (Math.random() - 0.5) * 4, // ±2°C variation
        },
        humidity: {
          ...this.mockSensorData.humidity,
          value: this.mockSensorData.humidity.value + (Math.random() - 0.5) * 10, // ±5% variation
        },
        pressure: {
          ...this.mockSensorData.pressure,
          value: this.mockSensorData.pressure.value + (Math.random() - 0.5) * 6, // ±3hPa variation
        }
      };
    } catch (error) {
      console.error('Failed to fetch sensor data:', error);
      return null;
    }
  }
  
  // Get historical sensor data
  async getHistoricalData(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<any[]> {
    try {
      await this.simulateNetworkDelay();
      
      // Generate mock historical data based on time range
      const now = new Date();
      const dataPoints = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
      const interval = timeRange === '24h' ? 60 * 60 * 1000 : timeRange === '7d' ? 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      
      const historicalData = [];
      for (let i = dataPoints; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * interval);
        historicalData.push({
          timestamp: timestamp.toISOString(),
          height: 8.3 + Math.sin(i * 0.1) * 0.5 + Math.random() * 0.2,
          temperature: 23.5 + Math.sin(i * 0.2) * 2 + Math.random() * 1,
          humidity: 62 + Math.sin(i * 0.15) * 5 + Math.random() * 2,
          pressure: 1014.2 + Math.sin(i * 0.1) * 3 + Math.random() * 1
        });
      }
      
      return historicalData;
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      return [];
    }
  }
  
  // Calibrate sensor
  async calibrateSensor(sensorType: string): Promise<boolean> {
    try {
      await this.simulateNetworkDelay(2000, 3000); // Calibration takes longer
      
      // In a real implementation, this would send calibration command to ESP32
      // const response = await fetch(`${this.baseUrl}/sensors/${sensorType}/calibrate`, {
      //   method: 'POST'
      // });
      // return response.ok;
      
      // For now, simulate successful calibration
      return true;
    } catch (error) {
      console.error(`Failed to calibrate ${sensorType} sensor:`, error);
      return false;
    }
  }
  
  // Reset ESP32
  async resetDevice(): Promise<boolean> {
    try {
      await this.simulateNetworkDelay(3000, 5000); // Reset takes time
      
      // In a real implementation, this would send reset command to ESP32
      // const response = await fetch(`${this.baseUrl}/reset`, {
      //   method: 'POST'
      // });
      // return response.ok;
      
      return true;
    } catch (error) {
      console.error('Failed to reset ESP32:', error);
      return false;
    }
  }
}

// Export singleton instance
export const esp32ApiService = new ESP32ApiService();
export default esp32ApiService;