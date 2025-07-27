/**
 * ESP32 Device Simulation Script
 * This script simulates ESP32 devices sending sensor data to the AquaNexus platform
 * for testing the onboarding and data ingestion workflow.
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';

// Configuration
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'http://localhost:80/v1';
const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '687f8e78001ac206db80';
const WEBSOCKET_URL = process.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';

// Simulated device configurations
const simulatedDevices = [
  {
    deviceId: 'ESP32_FISH001',
    deviceMac: '24:6F:28:AB:CD:01',
    deviceName: 'Main Fish Tank Monitor',
    deviceType: 'fish',
    apiKey: 'ak_fish_test_key_001',
    sensors: ['temperature', 'ph', 'dissolved_oxygen', 'turbidity']
  },
  {
    deviceId: 'ESP32_PLANT001',
    deviceMac: '24:6F:28:AB:CD:02',
    deviceName: 'Hydroponic Plant Monitor',
    deviceType: 'plant',
    apiKey: 'ak_plant_test_key_001',
    sensors: ['temperature', 'humidity', 'soil_moisture', 'light_level']
  }
];

/**
 * Generate realistic sensor data based on device type
 */
function generateSensorData(deviceType, sensors) {
  const readings = [];
  const timestamp = new Date().toISOString();

  sensors.forEach(sensorType => {
    let value, unit;
    
    switch (sensorType) {
      case 'temperature':
        value = deviceType === 'fish' 
          ? 22 + Math.random() * 6 // 22-28°C for fish
          : 20 + Math.random() * 10; // 20-30°C for plants
        unit = 'celsius';
        break;
      case 'ph':
        value = 6.5 + Math.random() * 2; // 6.5-8.5 pH
        unit = 'ph';
        break;
      case 'dissolved_oxygen':
        value = 4 + Math.random() * 4; // 4-8 mg/L
        unit = 'mg/l';
        break;
      case 'turbidity':
        value = Math.random() * 15; // 0-15 NTU
        unit = 'ntu';
        break;
      case 'humidity':
        value = 40 + Math.random() * 40; // 40-80%
        unit = 'percent';
        break;
      case 'soil_moisture':
        value = 30 + Math.random() * 50; // 30-80%
        unit = 'percent';
        break;
      case 'light_level':
        value = 100 + Math.random() * 400; // 100-500 lux
        unit = 'lux';
        break;
      default:
        value = Math.random() * 100;
        unit = 'unknown';
    }

    readings.push({
      type: sensorType,
      value: Math.round(value * 100) / 100, // Round to 2 decimal places
      unit: unit,
      timestamp: timestamp
    });
  });

  return readings;
}

/**
 * Register a simulated device
 */
async function registerDevice(device) {
  try {
    console.log(`Registering device: ${device.deviceName}`);
    
    const response = await fetch(`${APPWRITE_ENDPOINT}/functions/register-device/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      },
      body: JSON.stringify({
        deviceId: device.deviceId,
        deviceMac: device.deviceMac,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        projectId: 'test-project',
        userId: 'test-user-001',
        apiKey: device.apiKey
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Device ${device.deviceName} registered successfully`);
      return true;
    } else if (result.error && result.error.includes('already exists')) {
      console.log(`ℹ️ Device ${device.deviceName} already registered, proceeding with simulation`);
      return true; // Continue with simulation even if already registered
    } else {
      console.error(`❌ Failed to register device ${device.deviceName}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error registering device ${device.deviceName}:`, error.message);
    return false;
  }
}

/**
 * Send sensor data to the ingest function
 */
async function sendSensorData(device) {
  try {
    const readings = generateSensorData(device.deviceType, device.sensors);
    
    const payload = {
      apiKey: device.apiKey,
      deviceMac: device.deviceMac,
      readingType: device.deviceType,
      readings: readings
    };

    console.log(`📊 Sending sensor data from ${device.deviceName}:`, 
      readings.map(r => `${r.type}: ${r.value}${r.unit}`).join(', '));
    
    const response = await fetch(`${APPWRITE_ENDPOINT}/functions/ingest-sensor-data/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Sensor data from ${device.deviceName} ingested successfully`);
      if (result.config) {
        console.log(`⚙️ Configuration update received:`, result.config);
      }
      return true;
    } else {
      console.error(`❌ Failed to ingest sensor data from ${device.deviceName}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending sensor data from ${device.deviceName}:`, error.message);
    return false;
  }
}

/**
 * Send heartbeat to the ingest function
 */
async function sendHeartbeat(device) {
  try {
    const payload = {
      apiKey: device.apiKey,
      deviceMac: device.deviceMac,
      readingType: 'heartbeat',
      timestamp: new Date().toISOString(),
      status: 'online',
      freeHeap: Math.floor(Math.random() * 50000) + 200000, // Simulate ESP32 free heap
      uptime: Math.floor(Math.random() * 86400000) // Random uptime in ms
    };

    console.log(`💓 Sending heartbeat from ${device.deviceName}`);
    
    const response = await fetch(`${APPWRITE_ENDPOINT}/functions/ingest-sensor-data/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Heartbeat from ${device.deviceName} processed successfully`);
      return true;
    } else {
      console.error(`❌ Failed to process heartbeat from ${device.deviceName}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending heartbeat from ${device.deviceName}:`, error.message);
    return false;
  }
}

/**
 * Simulate device operation
 */
async function simulateDevice(device) {
  console.log(`\n🚀 Starting simulation for ${device.deviceName}`);
  
  // Register device first
  const registered = await registerDevice(device);
  if (!registered) {
    console.log(`❌ Skipping simulation for ${device.deviceName} due to registration failure`);
    return;
  }

  // Send initial heartbeat
  await sendHeartbeat(device);
  
  // Send sensor data every 30 seconds
  const sensorInterval = setInterval(async () => {
    await sendSensorData(device);
  }, 30000);
  
  // Send heartbeat every 60 seconds
  const heartbeatInterval = setInterval(async () => {
    await sendHeartbeat(device);
  }, 60000);
  
  // Store intervals for cleanup
  device.intervals = { sensorInterval, heartbeatInterval };
  
  console.log(`✅ ${device.deviceName} simulation started`);
}

/**
 * Test WebSocket connection (if available)
 */
function testWebSocketConnection(device) {
  try {
    const wsUrl = `${WEBSOCKET_URL}/device/${device.deviceMac}?apiKey=${device.apiKey}`;
    console.log(`🔌 Testing WebSocket connection for ${device.deviceName}`);
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log(`✅ WebSocket connected for ${device.deviceName}`);
      
      // Send test message
      ws.send(JSON.stringify({
        type: 'sensor_data',
        deviceMac: device.deviceMac,
        deviceType: device.deviceType,
        readings: generateSensorData(device.deviceType, device.sensors),
        timestamp: new Date().toISOString(),
        messageId: `msg_${Date.now()}`
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`📨 WebSocket message received for ${device.deviceName}:`, message.type);
    });
    
    ws.on('close', () => {
      console.log(`🔌 WebSocket disconnected for ${device.deviceName}`);
    });
    
    ws.on('error', (error) => {
      console.log(`❌ WebSocket error for ${device.deviceName}:`, error.message);
    });
    
  } catch (error) {
    console.log(`❌ WebSocket test failed for ${device.deviceName}:`, error.message);
  }
}

/**
 * Main simulation function
 */
async function runSimulation() {
  console.log('🌊 AquaNexus ESP32 Device Simulation Starting...');
  console.log(`📡 Appwrite Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`🆔 Project ID: ${APPWRITE_PROJECT_ID}`);
  console.log(`🔌 WebSocket URL: ${WEBSOCKET_URL}`);
  console.log(`📱 Simulating ${simulatedDevices.length} devices\n`);
  
  // Start simulation for all devices
  for (const device of simulatedDevices) {
    await simulateDevice(device);
    
    // Test WebSocket connection
    setTimeout(() => testWebSocketConnection(device), 2000);
    
    // Wait a bit between device startups
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ All device simulations started!');
  console.log('📊 Sensor data will be sent every 30 seconds');
  console.log('💓 Heartbeats will be sent every 60 seconds');
  console.log('\nPress Ctrl+C to stop the simulation\n');
}

/**
 * Cleanup function
 */
function cleanup() {
  console.log('\n🛑 Stopping simulation...');
  
  simulatedDevices.forEach(device => {
    if (device.intervals) {
      clearInterval(device.intervals.sensorInterval);
      clearInterval(device.intervals.heartbeatInterval);
    }
  });
  
  console.log('✅ Simulation stopped');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the simulation
runSimulation().catch(error => {
  console.error('❌ Simulation failed:', error);
  process.exit(1);
});