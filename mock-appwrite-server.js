// Mock Appwrite Server for Testing ESP32 Integration
// This simulates the Appwrite functions locally for development testing

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
const PORT = 80;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for testing
const devices = new Map();
const readings = [];
const alerts = [];

// Mock register-device function
app.post('/v1/functions/register-device/executions', async (req, res) => {
  try {
    console.log('📱 Device registration request:', req.body);
    
    const { deviceId, deviceMac, deviceName, deviceType, projectId, userId, apiKey } = req.body;
    
    // Validate required fields
    if (!deviceId || !deviceMac || !deviceName || !deviceType || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Check if device already exists
    if (devices.has(deviceMac)) {
      return res.status(409).json({
        success: false,
        error: 'Device with this MAC address already exists'
      });
    }
    
    // Create device record
    const device = {
      $id: randomUUID(),
      deviceId,
      deviceMac,
      deviceName,
      deviceType,
      projectId: projectId || 'test-project',
      userId: userId || 'test-user',
      apiKey,
      status: 'offline',
      lastSeen: null,
      readingInterval: 300,
      createdAt: new Date().toISOString()
    };
    
    devices.set(deviceMac, device);
    
    console.log('✅ Device registered successfully:', device.deviceName);
    
    res.json({
      success: true,
      message: 'Device registered successfully',
      device: device
    });
    
  } catch (error) {
    console.error('❌ Error registering device:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Mock ingest-sensor-data function
app.post('/v1/functions/ingest-sensor-data/executions', async (req, res) => {
  try {
    console.log('📊 Sensor data ingestion request:', req.body);
    
    const { apiKey, deviceMac, readingType, readings: sensorReadings, timestamp } = req.body;
    
    // Validate required fields
    if (!apiKey || !deviceMac) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: apiKey and deviceMac'
      });
    }
    
    // Find device
    const device = devices.get(deviceMac);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }
    
    // Validate API key
    if (device.apiKey !== apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    // Update device status
    device.lastSeen = new Date().toISOString();
    device.status = 'online';
    
    // Handle heartbeat
    if (readingType === 'heartbeat') {
      console.log('💓 Heartbeat received from:', device.deviceName);
      return res.json({
        success: true,
        message: 'Heartbeat received',
        reading_interval: device.readingInterval
      });
    }
    
    // Process sensor readings
    if (sensorReadings && Array.isArray(sensorReadings)) {
      const readingId = randomUUID();
      
      const reading = {
        $id: readingId,
        deviceId: device.deviceId,
        deviceMac: device.deviceMac,
        deviceType: device.deviceType,
        readings: sensorReadings,
        timestamp: timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      readings.push(reading);
      
      // Simple alert generation (mock)
      sensorReadings.forEach(reading => {
        if (reading.type === 'temperature' && (reading.value < 20 || reading.value > 30)) {
          const alert = {
            $id: randomUUID(),
            deviceId: device.deviceId,
            sensorType: reading.type,
            severity: reading.value < 15 || reading.value > 35 ? 'critical' : 'high',
            message: `Temperature ${reading.value}°C is out of optimal range`,
            value: reading.value,
            threshold: reading.value < 20 ? 'min: 20°C' : 'max: 30°C',
            timestamp: new Date().toISOString()
          };
          alerts.push(alert);
          console.log('🚨 Alert generated:', alert.message);
        }
      });
      
      console.log('✅ Sensor data ingested for:', device.deviceName);
      
      res.json({
        success: true,
        message: 'Sensor data ingested successfully',
        readingId: readingId,
        reading_interval: device.readingInterval
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid or missing sensor readings'
      });
    }
    
  } catch (error) {
    console.error('❌ Error ingesting sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    devices: devices.size,
    readings: readings.length,
    alerts: alerts.length,
    timestamp: new Date().toISOString()
  });
});

// Get devices endpoint (for debugging)
app.get('/devices', (req, res) => {
  res.json({
    devices: Array.from(devices.values()),
    count: devices.size
  });
});

// Get readings endpoint (for debugging)
app.get('/readings', (req, res) => {
  res.json({
    readings: readings.slice(-10), // Last 10 readings
    count: readings.length
  });
});

// Get alerts endpoint (for debugging)
app.get('/alerts', (req, res) => {
  res.json({
    alerts: alerts.slice(-10), // Last 10 alerts
    count: alerts.length
  });
});

app.listen(PORT, () => {
  console.log(`🌊 Mock Appwrite Server running on http://localhost:${PORT}`);
  console.log('📡 Available endpoints:');
  console.log('  POST /v1/functions/register-device/executions');
  console.log('  POST /v1/functions/ingest-sensor-data/executions');
  console.log('  GET  /health');
  console.log('  GET  /devices');
  console.log('  GET  /readings');
  console.log('  GET  /alerts');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock server...');
  process.exit(0);
});