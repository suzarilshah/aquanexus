/**
 * ESP32 Local Testing Server
 * 
 * This Express.js server provides:
 * - HTTP endpoints for ESP32 onboarding and data ingestion
 * - WebSocket server for real-time communication
 * - Mock Appwrite functions for local testing
 * - Device management and monitoring
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage for testing (replace with actual database in production)
const devices = new Map();
const sensorData = [];
const alerts = [];
const heartbeats = [];
const connectedDevices = new Map();

// Utility functions
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'ak_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function validateApiKey(apiKey) {
  for (const device of devices.values()) {
    if (device.apiKey === apiKey && device.isActive) {
      return device;
    }
  }
  return null;
}

function checkForAlerts(data, device) {
  const newAlerts = [];
  
  if (device.deviceType === 'fish') {
    // Fish tank alert conditions
    if (data.data.temperature !== undefined) {
      if (data.data.temperature < 18 || data.data.temperature > 30) {
        newAlerts.push({
          id: uuidv4(),
          deviceId: data.deviceId,
          deviceMac: data.deviceMac,
          deviceType: data.deviceType,
          alertType: 'temperature',
          severity: data.data.temperature < 15 || data.data.temperature > 35 ? 'critical' : 'high',
          message: `Temperature ${data.data.temperature}°C is outside optimal range (18-30°C)`,
          value: data.data.temperature,
          threshold: data.data.temperature < 18 ? 18 : 30,
          timestamp: new Date().toISOString(),
          isResolved: false
        });
      }
    }
    
    if (data.data.ph !== undefined) {
      if (data.data.ph < 6.5 || data.data.ph > 8.5) {
        newAlerts.push({
          id: uuidv4(),
          deviceId: data.deviceId,
          deviceMac: data.deviceMac,
          deviceType: data.deviceType,
          alertType: 'ph',
          severity: data.data.ph < 6.0 || data.data.ph > 9.0 ? 'critical' : 'high',
          message: `pH ${data.data.ph} is outside optimal range (6.5-8.5)`,
          value: data.data.ph,
          threshold: data.data.ph < 6.5 ? 6.5 : 8.5,
          timestamp: new Date().toISOString(),
          isResolved: false
        });
      }
    }
    
    if (data.data.dissolvedOxygen !== undefined && data.data.dissolvedOxygen < 5.0) {
      newAlerts.push({
        id: uuidv4(),
        deviceId: data.deviceId,
        deviceMac: data.deviceMac,
        deviceType: data.deviceType,
        alertType: 'dissolvedOxygen',
        severity: data.data.dissolvedOxygen < 3.0 ? 'critical' : 'high',
        message: `Dissolved oxygen ${data.data.dissolvedOxygen} mg/L is below optimal level (>5.0 mg/L)`,
        value: data.data.dissolvedOxygen,
        threshold: 5.0,
        timestamp: new Date().toISOString(),
        isResolved: false
      });
    }
  } else {
    // Plant alert conditions
    if (data.data.soilMoisture !== undefined) {
      if (data.data.soilMoisture < 20 || data.data.soilMoisture > 80) {
        newAlerts.push({
          id: uuidv4(),
          deviceId: data.deviceId,
          deviceMac: data.deviceMac,
          deviceType: data.deviceType,
          alertType: 'soilMoisture',
          severity: data.data.soilMoisture < 10 || data.data.soilMoisture > 90 ? 'critical' : 'high',
          message: `Soil moisture ${data.data.soilMoisture}% is outside optimal range (20-80%)`,
          value: data.data.soilMoisture,
          threshold: data.data.soilMoisture < 20 ? 20 : 80,
          timestamp: new Date().toISOString(),
          isResolved: false
        });
      }
    }
    
    if (data.data.lightLevel !== undefined && data.data.lightLevel < 100) {
      newAlerts.push({
        id: uuidv4(),
        deviceId: data.deviceId,
        deviceMac: data.deviceMac,
        deviceType: data.deviceType,
        alertType: 'lightLevel',
        severity: 'medium',
        message: `Light level ${data.data.lightLevel} lux is below optimal range (>100 lux)`,
        value: data.data.lightLevel,
        threshold: 100,
        timestamp: new Date().toISOString(),
        isResolved: false
      });
    }
  }
  
  alerts.push(...newAlerts);
  return newAlerts;
}

function broadcastToClients(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// ESP32 API Endpoints

// Device onboarding endpoint
app.post('/api/esp32/onboard', (req, res) => {
  try {
    const { deviceMac, deviceType, firmwareVersion, capabilities, userId, projectId } = req.body;
    
    console.log(`Onboarding request from device: ${deviceMac}`);
    
    // Check if device already exists
    const existingDevice = devices.get(deviceMac);
    if (existingDevice) {
      // Update existing device
      existingDevice.firmwareVersion = firmwareVersion;
      existingDevice.capabilities = capabilities;
      existingDevice.lastSeen = new Date().toISOString();
      existingDevice.isActive = true;
      
      devices.set(deviceMac, existingDevice);
      
      console.log(`Device re-onboarded: ${deviceMac} -> ${existingDevice.deviceId}`);
      
      return res.json({
        success: true,
        deviceId: existingDevice.deviceId,
        apiKey: existingDevice.apiKey
      });
    }
    
    // Create new device
    const deviceId = uuidv4();
    const apiKey = generateApiKey();
    
    const newDevice = {
      deviceId,
      deviceMac,
      deviceType,
      apiKey,
      isActive: true,
      lastSeen: new Date().toISOString(),
      firmwareVersion,
      capabilities,
      userId: userId || null,
      projectId: projectId || null,
      createdAt: new Date().toISOString()
    };
    
    devices.set(deviceMac, newDevice);
    
    console.log(`Device onboarded successfully: ${deviceMac} -> ${deviceId}`);
    
    // Broadcast device onboarding to connected clients
    broadcastToClients({
      type: 'device_onboarded',
      device: newDevice
    });
    
    res.json({
      success: true,
      deviceId,
      apiKey
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Sensor data ingestion endpoint
app.post('/api/esp32/data', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }
    
    const apiKey = authHeader.substring(7);
    const device = validateApiKey(apiKey);
    
    if (!device) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    const data = req.body;
    
    // Validate device ID
    if (device.deviceId !== data.deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device ID mismatch'
      });
    }
    
    // Update last seen
    device.lastSeen = new Date().toISOString();
    devices.set(device.deviceMac, device);
    
    // Store sensor data
    const sensorReading = {
      id: uuidv4(),
      deviceId: data.deviceId,
      deviceMac: data.deviceMac,
      deviceType: data.deviceType,
      timestamp: new Date(data.timestamp).toISOString(),
      ...data.data,
      createdAt: new Date().toISOString()
    };
    
    sensorData.push(sensorReading);
    
    // Check for alerts
    const newAlerts = checkForAlerts(data, device);
    
    // Broadcast to connected clients
    broadcastToClients({
      type: 'sensor_data',
      data: sensorReading
    });
    
    if (newAlerts.length > 0) {
      broadcastToClients({
        type: 'alerts',
        alerts: newAlerts
      });
    }
    
    console.log(`Sensor data received from device: ${data.deviceId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Data ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Heartbeat endpoint
app.post('/api/esp32/heartbeat', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }
    
    const apiKey = authHeader.substring(7);
    const device = validateApiKey(apiKey);
    
    if (!device) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    const data = req.body;
    
    // Update device status
    device.lastSeen = new Date().toISOString();
    devices.set(device.deviceMac, device);
    
    // Store heartbeat
    const heartbeat = {
      id: uuidv4(),
      deviceId: data.deviceId,
      deviceMac: data.deviceMac,
      timestamp: new Date(data.timestamp).toISOString(),
      uptime: data.uptime,
      freeHeap: data.freeHeap,
      wifiRSSI: data.wifiRSSI,
      createdAt: new Date().toISOString()
    };
    
    heartbeats.push(heartbeat);
    
    console.log(`Heartbeat received from device: ${data.deviceId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get device status
app.get('/api/esp32/devices', (req, res) => {
  try {
    const deviceList = Array.from(devices.values());
    res.json({
      success: true,
      devices: deviceList
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get sensor data
app.get('/api/esp32/data/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const deviceData = sensorData
      .filter(reading => reading.deviceId === deviceId)
      .slice(-limit)
      .reverse();
    
    res.json({
      success: true,
      data: deviceData
    });
  } catch (error) {
    console.error('Get sensor data error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get alerts
app.get('/api/esp32/alerts/:deviceId?', (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    let filteredAlerts = alerts;
    if (deviceId) {
      filteredAlerts = alerts.filter(alert => alert.deviceId === deviceId);
    }
    
    const recentAlerts = filteredAlerts
      .slice(-limit)
      .reverse();
    
    res.json({
      success: true,
      alerts: recentAlerts
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// WebSocket handling
wss.on('connection', (ws, req) => {
  console.log('WebSocket connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'auth':
          const device = validateApiKey(data.apiKey);
          if (device && device.deviceId === data.deviceId) {
            connectedDevices.set(device.deviceId, ws);
            ws.deviceId = device.deviceId;
            ws.send(JSON.stringify({ 
              type: 'auth_success', 
              deviceId: device.deviceId 
            }));
            console.log(`Device authenticated via WebSocket: ${device.deviceId}`);
          } else {
            ws.send(JSON.stringify({ 
              type: 'auth_failed', 
              message: 'Invalid credentials' 
            }));
          }
          break;
          
        case 'sensor_data':
          // Handle sensor data via WebSocket
          const authDevice = validateApiKey(data.apiKey || data.data?.apiKey);
          if (authDevice) {
            // Process sensor data similar to HTTP endpoint
            const sensorReading = {
              id: uuidv4(),
              deviceId: data.deviceId,
              deviceMac: data.deviceMac,
              deviceType: data.deviceType,
              timestamp: new Date(data.timestamp).toISOString(),
              ...data.data,
              createdAt: new Date().toISOString()
            };
            
            sensorData.push(sensorReading);
            
            // Update device last seen
            authDevice.lastSeen = new Date().toISOString();
            devices.set(authDevice.deviceMac, authDevice);
            
            // Check for alerts
            const newAlerts = checkForAlerts(data, authDevice);
            
            // Broadcast to all clients
            broadcastToClients({
              type: 'sensor_data',
              data: sensorReading
            });
            
            if (newAlerts.length > 0) {
              broadcastToClients({
                type: 'alerts',
                alerts: newAlerts
              });
            }
            
            console.log(`Sensor data received via WebSocket from: ${data.deviceId}`);
          }
          break;
          
        case 'heartbeat':
          const heartbeatDevice = validateApiKey(data.apiKey);
          if (heartbeatDevice) {
            // Update device status
            heartbeatDevice.lastSeen = new Date().toISOString();
            devices.set(heartbeatDevice.deviceMac, heartbeatDevice);
            
            // Store heartbeat
            const heartbeat = {
              id: uuidv4(),
              deviceId: data.deviceId,
              deviceMac: data.deviceMac,
              timestamp: new Date(data.timestamp).toISOString(),
              uptime: data.uptime,
              freeHeap: data.freeHeap,
              wifiRSSI: data.wifiRSSI,
              createdAt: new Date().toISOString()
            };
            
            heartbeats.push(heartbeat);
            console.log(`Heartbeat received via WebSocket from: ${data.deviceId}`);
          }
          break;
          
        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown message type' 
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  });
  
  ws.on('close', () => {
    if (ws.deviceId) {
      connectedDevices.delete(ws.deviceId);
      console.log(`WebSocket connection closed for device: ${ws.deviceId}`);
    } else {
      console.log('WebSocket connection closed');
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    devices: devices.size,
    sensorReadings: sensorData.length,
    alerts: alerts.length,
    connectedDevices: connectedDevices.size
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n=== ESP32 Testing Server Started ===`);
  console.log(`HTTP Server: http://localhost:${PORT}`);
  console.log(`WebSocket Server: ws://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  POST /api/esp32/onboard - Device onboarding`);
  console.log(`  POST /api/esp32/data - Sensor data ingestion`);
  console.log(`  POST /api/esp32/heartbeat - Device heartbeat`);
  console.log(`  GET  /api/esp32/devices - List all devices`);
  console.log(`  GET  /api/esp32/data/:deviceId - Get sensor data`);
  console.log(`  GET  /api/esp32/alerts/:deviceId - Get alerts`);
  console.log(`\nReady for ESP32 connections!\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});