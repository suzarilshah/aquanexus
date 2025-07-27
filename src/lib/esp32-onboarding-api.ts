/**
 * ESP32 Onboarding and Data Ingestion API
 * 
 * This module handles:
 * - Device onboarding and credential provisioning
 * - API key authentication and validation
 * - Sensor data ingestion from ESP32 devices
 * - Device status monitoring and heartbeat handling
 * - WebSocket communication for real-time data
 */

import { Client, Databases, Functions, ID } from 'appwrite';
import { WebSocket } from 'ws';

interface ESP32Device {
  deviceId: string;
  deviceMac: string;
  deviceType: 'fish' | 'plant';
  apiKey: string;
  isActive: boolean;
  lastSeen: string;
  firmwareVersion: string;
  capabilities: string[];
  userId?: string;
  projectId?: string;
}

interface SensorData {
  deviceId: string;
  deviceMac: string;
  deviceType: 'fish' | 'plant';
  timestamp: number;
  data: {
    temperature?: number;
    ph?: number;
    turbidity?: number;
    dissolvedOxygen?: number;
    soilMoisture?: number;
    lightLevel?: number;
    humidity?: number;
  };
}

interface HeartbeatData {
  deviceId: string;
  deviceMac: string;
  timestamp: number;
  uptime: number;
  freeHeap: number;
  wifiRSSI: number;
}

class ESP32OnboardingAPI {
  private client: Client;
  private databases: Databases;
  private functions: Functions;
  private connectedDevices: Map<string, WebSocket> = new Map();
  private deviceCredentials: Map<string, ESP32Device> = new Map();

  constructor() {
    this.client = new Client()
      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'http://localhost:80/v1')
      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || 'aquanexus');

    this.databases = new Databases(this.client);
    this.functions = new Functions(this.client);

    // Load existing device credentials
    this.loadDeviceCredentials();
  }

  /**
   * Load existing device credentials from database
   */
  private async loadDeviceCredentials(): Promise<void> {
    try {
      const response = await this.databases.listDocuments(
        'aquanexus-main',
        'esp32_devices'
      );

      response.documents.forEach((doc: any) => {
        const device: ESP32Device = {
          deviceId: doc.deviceId,
          deviceMac: doc.deviceMac,
          deviceType: doc.deviceType,
          apiKey: doc.apiKey,
          isActive: doc.isActive,
          lastSeen: doc.lastSeen,
          firmwareVersion: doc.firmwareVersion,
          capabilities: doc.capabilities,
          userId: doc.userId,
          projectId: doc.projectId
        };
        this.deviceCredentials.set(device.deviceMac, device);
      });

      console.log(`Loaded ${this.deviceCredentials.size} device credentials`);
    } catch (error) {
      console.error('Failed to load device credentials:', error);
    }
  }

  /**
   * Generate a secure API key for device authentication
   */
  private generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'ak_'; // API key prefix
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate API key and return device information
   */
  private validateApiKey(apiKey: string): ESP32Device | null {
    for (const device of this.deviceCredentials.values()) {
      if (device.apiKey === apiKey && device.isActive) {
        return device;
      }
    }
    return null;
  }

  /**
   * Handle device onboarding request
   */
  async onboardDevice(request: {
    deviceMac: string;
    deviceType: 'fish' | 'plant';
    firmwareVersion: string;
    capabilities: string[];
    userId?: string;
    projectId?: string;
  }): Promise<{ success: boolean; deviceId?: string; apiKey?: string; error?: string }> {
    try {
      const { deviceMac, deviceType, firmwareVersion, capabilities, userId, projectId } = request;

      // Check if device is already onboarded
      const existingDevice = this.deviceCredentials.get(deviceMac);
      if (existingDevice) {
        // Update existing device
        existingDevice.firmwareVersion = firmwareVersion;
        existingDevice.capabilities = capabilities;
        existingDevice.lastSeen = new Date().toISOString();
        existingDevice.isActive = true;

        await this.updateDeviceInDatabase(existingDevice);

        return {
          success: true,
          deviceId: existingDevice.deviceId,
          apiKey: existingDevice.apiKey
        };
      }

      // Create new device
      const deviceId = ID.unique();
      const apiKey = this.generateApiKey();

      const newDevice: ESP32Device = {
        deviceId,
        deviceMac,
        deviceType,
        apiKey,
        isActive: true,
        lastSeen: new Date().toISOString(),
        firmwareVersion,
        capabilities,
        userId,
        projectId
      };

      // Store in database
      await this.databases.createDocument(
        'aquanexus-main',
        'esp32_devices',
        deviceId,
        {
          deviceId,
          deviceMac,
          deviceType,
          apiKey,
          isActive: true,
          lastSeen: newDevice.lastSeen,
          firmwareVersion,
          capabilities,
          userId: userId || null,
          projectId: projectId || null,
          createdAt: new Date().toISOString()
        }
      );

      // Store in memory
      this.deviceCredentials.set(deviceMac, newDevice);

      console.log(`Device onboarded successfully: ${deviceMac} -> ${deviceId}`);

      return {
        success: true,
        deviceId,
        apiKey
      };
    } catch (error) {
      console.error('Device onboarding failed:', error);
      return {
        success: false,
        error: 'Failed to onboard device'
      };
    }
  }

  /**
   * Update device information in database
   */
  private async updateDeviceInDatabase(device: ESP32Device): Promise<void> {
    try {
      await this.databases.updateDocument(
        'aquanexus-main',
        'esp32_devices',
        device.deviceId,
        {
          lastSeen: device.lastSeen,
          firmwareVersion: device.firmwareVersion,
          capabilities: device.capabilities,
          isActive: device.isActive
        }
      );
    } catch (error) {
      console.error('Failed to update device in database:', error);
    }
  }

  /**
   * Handle sensor data ingestion
   */
  async ingestSensorData(data: SensorData, apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate API key
      const device = this.validateApiKey(apiKey);
      if (!device) {
        return { success: false, error: 'Invalid API key' };
      }

      // Validate device ID matches
      if (device.deviceId !== data.deviceId) {
        return { success: false, error: 'Device ID mismatch' };
      }

      // Update last seen
      device.lastSeen = new Date().toISOString();
      this.deviceCredentials.set(device.deviceMac, device);

      // Determine collection based on device type
      const collectionId = device.deviceType === 'fish' ? 'fish_readings' : 'plant_readings';

      // Store sensor data in database
      await this.databases.createDocument(
        'aquanexus-main',
        collectionId,
        ID.unique(),
        {
          deviceId: data.deviceId,
          deviceMac: data.deviceMac,
          deviceType: data.deviceType,
          timestamp: new Date(data.timestamp).toISOString(),
          ...data.data,
          createdAt: new Date().toISOString()
        }
      );

      // Broadcast to connected WebSocket clients
      this.broadcastSensorData(data);

      // Check for alerts
      await this.checkForAlerts(data, device);

      console.log(`Sensor data ingested for device: ${data.deviceId}`);

      return { success: true };
    } catch (error) {
      console.error('Sensor data ingestion failed:', error);
      return { success: false, error: 'Failed to ingest sensor data' };
    }
  }

  /**
   * Handle device heartbeat
   */
  async handleHeartbeat(data: HeartbeatData, apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate API key
      const device = this.validateApiKey(apiKey);
      if (!device) {
        return { success: false, error: 'Invalid API key' };
      }

      // Update device status
      device.lastSeen = new Date().toISOString();
      this.deviceCredentials.set(device.deviceMac, device);

      // Store heartbeat data
      await this.databases.createDocument(
        'aquanexus-main',
        'device_heartbeats',
        ID.unique(),
        {
          deviceId: data.deviceId,
          deviceMac: data.deviceMac,
          timestamp: new Date(data.timestamp).toISOString(),
          uptime: data.uptime,
          freeHeap: data.freeHeap,
          wifiRSSI: data.wifiRSSI,
          createdAt: new Date().toISOString()
        }
      );

      console.log(`Heartbeat received from device: ${data.deviceId}`);

      return { success: true };
    } catch (error) {
      console.error('Heartbeat handling failed:', error);
      return { success: false, error: 'Failed to handle heartbeat' };
    }
  }

  /**
   * Check sensor data for alert conditions
   */
  private async checkForAlerts(data: SensorData, device: ESP32Device): Promise<void> {
    try {
      const alerts: any[] = [];

      if (device.deviceType === 'fish') {
        // Fish tank alert conditions
        if (data.data.temperature !== undefined) {
          if (data.data.temperature < 18 || data.data.temperature > 30) {
            alerts.push({
              type: 'temperature',
              severity: data.data.temperature < 15 || data.data.temperature > 35 ? 'critical' : 'high',
              message: `Temperature ${data.data.temperature}°C is outside optimal range (18-30°C)`,
              value: data.data.temperature,
              threshold: data.data.temperature < 18 ? 18 : 30
            });
          }
        }

        if (data.data.ph !== undefined) {
          if (data.data.ph < 6.5 || data.data.ph > 8.5) {
            alerts.push({
              type: 'ph',
              severity: data.data.ph < 6.0 || data.data.ph > 9.0 ? 'critical' : 'high',
              message: `pH ${data.data.ph} is outside optimal range (6.5-8.5)`,
              value: data.data.ph,
              threshold: data.data.ph < 6.5 ? 6.5 : 8.5
            });
          }
        }

        if (data.data.dissolvedOxygen !== undefined && data.data.dissolvedOxygen < 5.0) {
          alerts.push({
            type: 'dissolvedOxygen',
            severity: data.data.dissolvedOxygen < 3.0 ? 'critical' : 'high',
            message: `Dissolved oxygen ${data.data.dissolvedOxygen} mg/L is below optimal level (>5.0 mg/L)`,
            value: data.data.dissolvedOxygen,
            threshold: 5.0
          });
        }
      } else {
        // Plant alert conditions
        if (data.data.soilMoisture !== undefined) {
          if (data.data.soilMoisture < 20 || data.data.soilMoisture > 80) {
            alerts.push({
              type: 'soilMoisture',
              severity: data.data.soilMoisture < 10 || data.data.soilMoisture > 90 ? 'critical' : 'high',
              message: `Soil moisture ${data.data.soilMoisture}% is outside optimal range (20-80%)`,
              value: data.data.soilMoisture,
              threshold: data.data.soilMoisture < 20 ? 20 : 80
            });
          }
        }

        if (data.data.lightLevel !== undefined && data.data.lightLevel < 100) {
          alerts.push({
            type: 'lightLevel',
            severity: 'medium',
            message: `Light level ${data.data.lightLevel} lux is below optimal range (>100 lux)`,
            value: data.data.lightLevel,
            threshold: 100
          });
        }
      }

      // Store alerts in database
      for (const alert of alerts) {
        await this.databases.createDocument(
          'aquanexus-main',
          'alerts',
          ID.unique(),
          {
            deviceId: data.deviceId,
            deviceMac: data.deviceMac,
            deviceType: data.deviceType,
            alertType: alert.type,
            severity: alert.severity,
            message: alert.message,
            value: alert.value,
            threshold: alert.threshold,
            timestamp: new Date().toISOString(),
            isResolved: false,
            createdAt: new Date().toISOString()
          }
        );
      }

      if (alerts.length > 0) {
        console.log(`Generated ${alerts.length} alerts for device: ${data.deviceId}`);
      }
    } catch (error) {
      console.error('Alert checking failed:', error);
    }
  }

  /**
   * Broadcast sensor data to connected WebSocket clients
   */
  private broadcastSensorData(data: SensorData): void {
    const message = JSON.stringify({
      type: 'sensor_data',
      data
    });

    this.connectedDevices.forEach((ws, deviceId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Handle WebSocket connection
   */
  handleWebSocketConnection(ws: WebSocket, deviceId?: string): void {
    console.log(`WebSocket connection established${deviceId ? ` for device: ${deviceId}` : ''}`);

    if (deviceId) {
      this.connectedDevices.set(deviceId, ws);
    }

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        await this.handleWebSocketMessage(ws, data);
      } catch (error) {
        console.error('WebSocket message handling failed:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket connection closed${deviceId ? ` for device: ${deviceId}` : ''}`);
      if (deviceId) {
        this.connectedDevices.delete(deviceId);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Handle WebSocket messages
   */
  private async handleWebSocketMessage(ws: WebSocket, data: any): Promise<void> {
    switch (data.type) {
      case 'auth':
        const device = this.validateApiKey(data.apiKey);
        if (device && device.deviceId === data.deviceId) {
          this.connectedDevices.set(device.deviceId, ws);
          ws.send(JSON.stringify({ type: 'auth_success', deviceId: device.deviceId }));
        } else {
          ws.send(JSON.stringify({ type: 'auth_failed', message: 'Invalid credentials' }));
        }
        break;

      case 'sensor_data':
        const authHeader = data.apiKey;
        if (authHeader) {
          await this.ingestSensorData(data, authHeader);
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Missing API key' }));
        }
        break;

      case 'heartbeat':
        const heartbeatAuth = data.apiKey;
        if (heartbeatAuth) {
          await this.handleHeartbeat(data, heartbeatAuth);
        }
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string): Promise<ESP32Device | null> {
    for (const device of this.deviceCredentials.values()) {
      if (device.deviceId === deviceId) {
        return device;
      }
    }
    return null;
  }

  /**
   * Get all registered devices
   */
  getAllDevices(): ESP32Device[] {
    return Array.from(this.deviceCredentials.values());
  }

  /**
   * Deactivate device
   */
  async deactivateDevice(deviceId: string): Promise<boolean> {
    try {
      for (const [mac, device] of this.deviceCredentials.entries()) {
        if (device.deviceId === deviceId) {
          device.isActive = false;
          await this.updateDeviceInDatabase(device);
          
          // Close WebSocket connection if exists
          const ws = this.connectedDevices.get(deviceId);
          if (ws) {
            ws.close();
            this.connectedDevices.delete(deviceId);
          }
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Device deactivation failed:', error);
      return false;
    }
  }
}

export default ESP32OnboardingAPI;
export type { ESP32Device, SensorData, HeartbeatData };