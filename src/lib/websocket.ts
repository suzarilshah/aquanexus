import React from 'react';
import { useStore, OperationalMode } from '@/store/useStore';
import { SensorReading, Alert } from '@/store/useStore';
import { demoDataService } from './demoDataService';

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(private url: string) {}

  connect() {
    const store = useStore.getState();
    const mode = store.operationalMode;

    console.log(`WebSocket: Connecting in ${mode} mode`);

    // Handle different operational modes
    if (mode === 'demo') {
      console.log('Demo mode: Starting demo data streaming');
      this.isConnecting = false;
      // Only start streaming if not already active
      if (!store.isConnected) {
        store.setConnectionStatus(true);
        demoDataService.startStreaming(5000); // Stream every 5 seconds
      }
      return;
    }

    if (mode === 'data-import') {
      console.log('Data Import mode: WebSocket connection not needed');
      this.isConnecting = false;
      // Only update status if currently connected
      if (store.isConnected) {
        store.setConnectionStatus(false);
      }
      return;
    }

    // Online mode - establish WebSocket connection
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        const currentStore = useStore.getState();
        if (!currentStore.isConnected) {
          currentStore.setConnectionStatus(true);
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        const currentStore = useStore.getState();
        if (currentStore.isConnected) {
          currentStore.setConnectionStatus(false);
        }
        // Only attempt reconnection in online mode
        if (currentStore.operationalMode === 'online') {
          this.scheduleReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        const currentStore = useStore.getState();
        if (currentStore.isConnected) {
          currentStore.setConnectionStatus(false);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  public processMessage(data: any) {
    this.handleMessage(data);
  }

  private handleMessage(data: any) {
    const store = useStore.getState();
    
    switch (data.type) {
      case 'sensor_reading':
        // Handle incoming sensor data from ESP32
        const { deviceId, sensorType, value, unit, timestamp } = data;
        
        const reading = {
          timestamp: timestamp || new Date().toISOString(),
          value: parseFloat(value),
          unit,
          status: this.determineStatus(sensorType, value) as 'normal' | 'warning' | 'critical'
        };
        
        // Determine environment type and sensor based on device type
        const environmentType = deviceId.includes('fish') ? 'fish' : 'plant';
        store.addSensorReading(environmentType, sensorType, reading);
        
        // Check for alerts
        this.checkForAlerts(sensorType, value, deviceId);
        break;
        
      case 'device_status':
        // Handle device status updates
        const { device_id, status, battery_level } = data;
        this.updateDeviceStatus(device_id, status, battery_level);
        break;
        
      case 'system_alert':
        // Handle system-level alerts
        store.addAlert({
          $id: `alert_${Date.now()}`,
          deviceMac: data.device_mac || '',
          alertType: data.alert_type || 'system',
          severity: data.severity,
          message: data.message,
          value: data.value || 0,
          threshold: data.threshold || 0,
          timestamp: data.timestamp || new Date().toISOString(),
          resolved: false,
          // $createdAt and $updatedAt removed as not part of Alert type
        });
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
    
    // Update system status
    store.updateSystemStatus();
  }

  private determineStatus(sensorType: string, value: number): string {
    // Define optimal ranges for different sensors
    const ranges: Record<string, { min: number; max: number; warning: { min: number; max: number } }> = {
      temperature: { min: 20, max: 28, warning: { min: 18, max: 30 } },
      ph: { min: 6.5, max: 7.5, warning: { min: 6.0, max: 8.0 } },
      tds: { min: 300, max: 600, warning: { min: 200, max: 800 } },
      oxygenLevel: { min: 5, max: 8, warning: { min: 4, max: 10 } },
      humidity: { min: 60, max: 80, warning: { min: 50, max: 90 } },
      airTemperature: { min: 18, max: 26, warning: { min: 15, max: 30 } }
    };
    
    const range = ranges[sensorType];
    if (!range) return 'normal';
    
    if (value < range.warning.min || value > range.warning.max) {
      return 'critical';
    } else if (value < range.min || value > range.max) {
      return 'warning';
    }
    return 'normal';
  }

  private checkForAlerts(sensorType: string, value: number, deviceId: string) {
    const status = this.determineStatus(sensorType, value);
    
    if (status === 'warning' || status === 'critical') {
      const store = useStore.getState();
      const message = `${sensorType} ${status === 'critical' ? 'critically' : 'slightly'} out of range: ${value} (Device: ${deviceId})`;
      
      store.addAlert({
        $id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        deviceMac: deviceId,
        alertType: sensorType,
        severity: status === 'critical' ? 'critical' : 'high',
        message,
        value: value,
        threshold: 0, // Will be set based on sensor type ranges
        timestamp: new Date().toISOString(),
        resolved: false,
        // $createdAt and $updatedAt removed as not part of Alert type
      });
    }
  }

  private updateDeviceStatus(deviceId: string, status: string, batteryLevel?: number) {
    const store = useStore.getState();
    const devices = store.devices;
    
    const device = devices.find(d => d.deviceId === deviceId || d.deviceMac === deviceId);
    if (device) {
      store.updateDevice(device.$id, {
        status: status as 'online' | 'offline' | 'warning',
        lastSeen: new Date().toISOString(),
        // $updatedAt removed as not part of Device type
      });
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    const store = useStore.getState();
    const mode = store.operationalMode;

    // Stop demo data streaming if in demo mode
    if (mode === 'demo' && demoDataService.isStreamingActive()) {
      demoDataService.stopStreaming();
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Only update connection status if currently connected
    if (store.isConnected) {
      store.setConnectionStatus(false);
    }
  }

  // Method to handle operational mode changes
  handleModeChange(newMode: OperationalMode) {
    const store = useStore.getState();
    const currentMode = store.operationalMode;
    
    // Only handle mode change if it's actually different
    if (currentMode === newMode) {
      console.log(`WebSocket: Already in ${newMode} mode, skipping mode change`);
      return;
    }
    
    console.log(`WebSocket: Switching from ${currentMode} to ${newMode} mode`);
    
    // Disconnect current connection/streaming
    this.disconnect();
    
    // Wait a moment then reconnect with new mode
    setTimeout(() => {
      this.connect();
    }, 100);
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  getConnectionState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
}

// Create singleton instance
const wsManager = new WebSocketManager(
  process.env.NODE_ENV === 'production' 
    ? 'wss://ws.airail.uk/ws'
    : 'ws://localhost:3001/ws'
);

// Auto-connect when module loads (only in production or when WebSocket server is available)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  wsManager.connect();
} else if (typeof window !== 'undefined') {
  // In development, simulate connection status
  console.log('Development mode: WebSocket simulation enabled');
  setTimeout(() => {
    useStore.getState().setConnectionStatus(true);
  }, 1000);
}

export { wsManager, WebSocketManager };

// Hook for React components
export function useWebSocket() {
  const isConnected = useStore(state => state.isConnected);
  
  const connect = React.useCallback(() => {
    wsManager.connect();
  }, []);
  
  const disconnect = React.useCallback(() => {
    wsManager.disconnect();
  }, []);
  
  const send = React.useCallback((data: any) => {
    wsManager.send(data);
  }, []);
  
  const handleModeChange = React.useCallback((mode: OperationalMode) => {
    wsManager.handleModeChange(mode);
  }, []);
  
  return {
    isConnected,
    connect,
    disconnect,
    send,
    connectionState: wsManager.getConnectionState(),
    handleModeChange
  };
}

// Hook to monitor operational mode changes
export function useOperationalModeEffect() {
  const operationalMode = useStore(state => state.operationalMode);
  const previousModeRef = React.useRef<OperationalMode | null>(null);
  const isInitialMount = React.useRef(true);
  
  React.useEffect(() => {
    // Skip on initial mount to prevent unnecessary reconnection
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousModeRef.current = operationalMode;
      return;
    }
    
    // Only handle mode change if it actually changed
    if (previousModeRef.current !== operationalMode) {
      console.log('Operational mode changed from', previousModeRef.current, 'to:', operationalMode);
      wsManager.handleModeChange(operationalMode);
      previousModeRef.current = operationalMode;
    }
  }, [operationalMode]);
}

// Simulate ESP32 data for development
export function simulateESP32Data() {
  const sensors = [
    { type: 'temperature', deviceId: 'ESP32_001', unit: '°C', range: [22, 26] },
    { type: 'ph', deviceId: 'ESP32_001', unit: 'pH', range: [6.5, 7.5] },
    { type: 'tds', deviceId: 'ESP32_001', unit: 'ppm', range: [300, 500] },
    { type: 'oxygenLevel', deviceId: 'ESP32_001', unit: 'mg/L', range: [5, 8] },
    { type: 'airTemperature', deviceId: 'ESP32_002', unit: '°C', range: [20, 25] },
    { type: 'humidity', deviceId: 'ESP32_002', unit: '%', range: [65, 75] },
    { type: 'airPressure', deviceId: 'ESP32_002', unit: 'hPa', range: [1010, 1020] },
    { type: 'plantHeight', deviceId: 'ESP32_002', unit: 'cm', range: [15, 20] }
  ];
  
  setInterval(() => {
    const sensor = sensors[Math.floor(Math.random() * sensors.length)];
    const [min, max] = sensor.range;
    const value = Math.random() * (max - min) + min;
    
    // Occasionally generate out-of-range values for testing alerts
    const finalValue = Math.random() < 0.05 ? value * (Math.random() < 0.5 ? 0.7 : 1.3) : value;
    
    wsManager.send({
      type: 'sensor_reading',
      deviceId: sensor.deviceId,
      sensorType: sensor.type,
      value: finalValue.toFixed(2),
      unit: sensor.unit,
      timestamp: new Date().toISOString()
    });
  }, 5000); // Send data every 5 seconds
}