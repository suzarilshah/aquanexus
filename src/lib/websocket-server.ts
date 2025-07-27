import { WebSocketManager } from './websocket';

/**
 * WebSocket Server for ESP32 Device Communication
 * Handles real-time data streaming from ESP32 devices
 */
export class ESP32WebSocketServer {
  private wsManager: WebSocketManager;
  private deviceConnections: Map<string, WebSocket> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;

  constructor() {
    this.wsManager = new WebSocketManager(
      process.env.NODE_ENV === 'production' 
        ? 'wss://ws.airail.uk/ws'
        : 'ws://localhost:3001/ws'
    );
    this.startHeartbeatMonitoring();
  }

  /**
   * Initialize WebSocket connection for ESP32 devices
   */
  public initializeDeviceConnection(deviceMac: string, apiKey: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection URL
        const wsUrl = this.buildWebSocketUrl(deviceMac, apiKey);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log(`ESP32 device ${deviceMac} connected`);
          this.deviceConnections.set(deviceMac, ws);
          this.reconnectAttempts.delete(deviceMac);
          
          // Send initial handshake
          this.sendHandshake(deviceMac);
          resolve(true);
        };

        ws.onmessage = (event) => {
          this.handleDeviceMessage(deviceMac, event.data);
        };

        ws.onclose = (event) => {
          console.log(`ESP32 device ${deviceMac} disconnected:`, event.code, event.reason);
          this.deviceConnections.delete(deviceMac);
          this.handleDeviceDisconnection(deviceMac);
        };

        ws.onerror = (error) => {
          console.error(`WebSocket error for device ${deviceMac}:`, error);
          reject(error);
        };

      } catch (error) {
        console.error('Failed to initialize device connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages from ESP32 devices
   */
  private handleDeviceMessage(deviceMac: string, data: string): void {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'sensor_data':
          this.processSensorData(deviceMac, message);
          break;
        case 'heartbeat':
          this.processHeartbeat(deviceMac, message);
          break;
        case 'status_update':
          this.processStatusUpdate(deviceMac, message);
          break;
        case 'error':
          this.processDeviceError(deviceMac, message);
          break;
        default:
          console.warn(`Unknown message type from device ${deviceMac}:`, message.type);
      }
    } catch (error) {
      console.error(`Failed to parse message from device ${deviceMac}:`, error);
    }
  }

  /**
   * Process sensor data from ESP32 devices
   */
  private async processSensorData(deviceMac: string, message: any): Promise<void> {
    try {
      // Forward sensor data to the ingest-sensor-data function
      const response = await fetch(`${import.meta.env.VITE_APPWRITE_ENDPOINT}/functions/ingest-sensor-data/executions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
        },
        body: JSON.stringify({
          deviceMac: deviceMac,
          readingType: message.deviceType,
          readings: message.readings,
          apiKey: message.apiKey
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Send acknowledgment back to device
        this.sendToDevice(deviceMac, {
          type: 'ack',
          messageId: message.messageId,
          status: 'success',
          config: result.config
        });
        
        // Update WebSocket manager with new data
        this.wsManager.processMessage({
          type: 'sensor_reading',
          deviceMac: deviceMac,
          readings: message.readings,
          timestamp: message.timestamp
        });
      } else {
        this.sendToDevice(deviceMac, {
          type: 'error',
          messageId: message.messageId,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Failed to process sensor data:', error);
      this.sendToDevice(deviceMac, {
        type: 'error',
        messageId: message.messageId,
        error: 'Failed to process sensor data'
      });
    }
  }

  /**
   * Process heartbeat from ESP32 devices
   */
  private async processHeartbeat(deviceMac: string, message: any): Promise<void> {
    try {
      // Forward heartbeat to the ingest-sensor-data function
      const response = await fetch(`${import.meta.env.VITE_APPWRITE_ENDPOINT}/functions/ingest-sensor-data/executions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
        },
        body: JSON.stringify({
          deviceMac: deviceMac,
          type: 'heartbeat',
          timestamp: message.timestamp,
          status: message.status,
          apiKey: message.apiKey
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Send heartbeat acknowledgment
        this.sendToDevice(deviceMac, {
          type: 'heartbeat_ack',
          timestamp: new Date().toISOString(),
          config: result.config
        });
        
        // Update device status in WebSocket manager
        this.wsManager.processMessage({
          type: 'device_status',
          deviceMac: deviceMac,
          status: 'online',
          lastSeen: message.timestamp
        });
      }
    } catch (error) {
      console.error('Failed to process heartbeat:', error);
    }
  }

  /**
   * Process status updates from ESP32 devices
   */
  private processStatusUpdate(deviceMac: string, message: any): void {
    // Update device status in WebSocket manager
    this.wsManager.processMessage({
      type: 'device_status',
      deviceMac: deviceMac,
      status: message.status,
      lastSeen: message.timestamp
    });
  }

  /**
   * Process error messages from ESP32 devices
   */
  private processDeviceError(deviceMac: string, message: any): void {
    console.error(`Device ${deviceMac} reported error:`, message.error);
    
    // Create system alert
    this.wsManager.processMessage({
      type: 'system_alert',
      deviceMac: deviceMac,
      alertType: 'device_error',
      severity: 'high',
      message: `Device ${deviceMac} reported error: ${message.error}`,
      timestamp: message.timestamp
    });
  }

  /**
   * Send message to specific ESP32 device
   */
  private sendToDevice(deviceMac: string, message: any): void {
    const ws = this.deviceConnections.get(deviceMac);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn(`Cannot send message to device ${deviceMac}: connection not available`);
    }
  }

  /**
   * Send handshake message to device
   */
  private sendHandshake(deviceMac: string): void {
    this.sendToDevice(deviceMac, {
      type: 'handshake',
      timestamp: new Date().toISOString(),
      serverVersion: '1.0.0',
      supportedProtocols: ['sensor_data', 'heartbeat', 'status_update']
    });
  }

  /**
   * Handle device disconnection and attempt reconnection
   */
  private handleDeviceDisconnection(deviceMac: string): void {
    const attempts = this.reconnectAttempts.get(deviceMac) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts.set(deviceMac, attempts + 1);
      
      // Attempt reconnection after delay
      setTimeout(() => {
        console.log(`Attempting to reconnect device ${deviceMac} (attempt ${attempts + 1})`);
        // Note: In a real implementation, you would need the API key for reconnection
        // This would typically be stored securely or retrieved from the database
      }, Math.pow(2, attempts) * 1000); // Exponential backoff
    } else {
      console.error(`Max reconnection attempts reached for device ${deviceMac}`);
      this.reconnectAttempts.delete(deviceMac);
    }
  }

  /**
   * Build WebSocket URL for device connection
   */
  private buildWebSocketUrl(deviceMac: string, apiKey: string): string {
    const baseUrl = import.meta.env.VITE_WEBSOCKET_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'wss://ws.airail.uk'
        : 'ws://localhost:3001');
    return `${baseUrl}/device/${deviceMac}?apiKey=${apiKey}`;
  }

  /**
   * Start monitoring device heartbeats
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.deviceConnections.forEach((ws, deviceMac) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Request heartbeat from device
          this.sendToDevice(deviceMac, {
            type: 'ping',
            timestamp: new Date().toISOString()
          });
        }
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Disconnect all devices and cleanup
   */
  public disconnect(): void {
    this.stopHeartbeatMonitoring();
    
    this.deviceConnections.forEach((ws, deviceMac) => {
      console.log(`Disconnecting device ${deviceMac}`);
      ws.close(1000, 'Server shutdown');
    });
    
    this.deviceConnections.clear();
    this.reconnectAttempts.clear();
  }

  /**
   * Get connected device count
   */
  public getConnectedDeviceCount(): number {
    return this.deviceConnections.size;
  }

  /**
   * Get list of connected devices
   */
  public getConnectedDevices(): string[] {
    return Array.from(this.deviceConnections.keys());
  }

  /**
   * Check if device is connected
   */
  public isDeviceConnected(deviceMac: string): boolean {
    const ws = this.deviceConnections.get(deviceMac);
    return ws ? ws.readyState === WebSocket.OPEN : false;
  }
}

// Export singleton instance
export const esp32WebSocketServer = new ESP32WebSocketServer();