/**
 * ESP32 Test Client
 * 
 * This script simulates an ESP32 device for testing the onboarding
 * and data transmission functionality locally.
 */

const WebSocket = require('ws');
const axios = require('axios');

class ESP32TestClient {
  constructor(deviceMac, deviceType = 'fish', serverUrl = 'http://localhost:3001') {
    this.deviceMac = deviceMac;
    this.deviceType = deviceType;
    this.serverUrl = serverUrl;
    this.wsUrl = serverUrl.replace('http', 'ws');
    this.deviceId = null;
    this.apiKey = null;
    this.ws = null;
    this.isConnected = false;
    this.sensorInterval = null;
    this.heartbeatInterval = null;
  }

  // Simulate device onboarding
  async onboard() {
    try {
      console.log(`🔄 Onboarding device: ${this.deviceMac}`);
      
      const response = await axios.post(`${this.serverUrl}/api/esp32/onboard`, {
        deviceMac: this.deviceMac,
        deviceType: this.deviceType,
        firmwareVersion: '1.0.0',
        capabilities: this.deviceType === 'fish' 
          ? ['temperature', 'ph', 'turbidity', 'dissolvedOxygen']
          : ['temperature', 'soilMoisture', 'lightLevel', 'humidity']
      });

      if (response.data.success) {
        this.deviceId = response.data.deviceId;
        this.apiKey = response.data.apiKey;
        console.log(`✅ Onboarding successful!`);
        console.log(`   Device ID: ${this.deviceId}`);
        console.log(`   API Key: ${this.apiKey.substring(0, 8)}...`);
        return true;
      } else {
        console.error(`❌ Onboarding failed: ${response.data.error}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Onboarding error:`, error.message);
      return false;
    }
  }

  // Connect to WebSocket server
  connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Connecting to WebSocket: ${this.wsUrl}`);
      
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.on('open', () => {
        console.log(`✅ WebSocket connected`);
        
        // Send authentication
        this.ws.send(JSON.stringify({
          type: 'auth',
          deviceId: this.deviceId,
          apiKey: this.apiKey
        }));
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleWebSocketMessage(message);
          
          if (message.type === 'auth_success') {
            this.isConnected = true;
            resolve();
          } else if (message.type === 'auth_failed') {
            reject(new Error('WebSocket authentication failed'));
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });
      
      this.ws.on('close', () => {
        console.log(`🔌 WebSocket disconnected`);
        this.isConnected = false;
      });
      
      this.ws.on('error', (error) => {
        console.error(`❌ WebSocket error:`, error.message);
        reject(error);
      });
    });
  }

  // Handle WebSocket messages
  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'auth_success':
        console.log(`🔐 WebSocket authentication successful`);
        break;
      case 'auth_failed':
        console.error(`❌ WebSocket authentication failed: ${message.message}`);
        break;
      case 'command':
        console.log(`📨 Received command: ${message.command}`);
        this.handleCommand(message);
        break;
      case 'error':
        console.error(`❌ WebSocket error: ${message.message}`);
        break;
      default:
        console.log(`📨 Received message:`, message);
    }
  }

  // Handle server commands
  handleCommand(message) {
    switch (message.command) {
      case 'get_status':
        this.sendDeviceStatus();
        break;
      case 'restart':
        console.log(`🔄 Restart command received - simulating restart`);
        this.disconnect();
        setTimeout(() => this.start(), 2000);
        break;
      default:
        console.log(`❓ Unknown command: ${message.command}`);
    }
  }

  // Generate mock sensor data
  generateSensorData() {
    const baseData = {
      temperature: 20 + Math.random() * 10 // 20-30°C
    };

    if (this.deviceType === 'fish') {
      return {
        ...baseData,
        ph: 6.5 + Math.random() * 2, // 6.5-8.5
        turbidity: Math.random() * 20, // 0-20 NTU
        dissolvedOxygen: 4 + Math.random() * 4 // 4-8 mg/L
      };
    } else {
      return {
        ...baseData,
        soilMoisture: 30 + Math.random() * 40, // 30-70%
        lightLevel: 200 + Math.random() * 1000, // 200-1200 lux
        humidity: 40 + Math.random() * 40 // 40-80%
      };
    }
  }

  // Send sensor data via WebSocket
  sendSensorDataWS() {
    if (!this.isConnected || !this.ws) return;

    const sensorData = {
      type: 'sensor_data',
      deviceId: this.deviceId,
      deviceMac: this.deviceMac,
      deviceType: this.deviceType,
      timestamp: Date.now(),
      data: this.generateSensorData()
    };

    this.ws.send(JSON.stringify(sensorData));
    console.log(`📊 Sensor data sent (WS): ${JSON.stringify(sensorData.data, null, 2)}`);
  }

  // Send sensor data via HTTP
  async sendSensorDataHTTP() {
    try {
      const sensorData = {
        type: 'sensor_data',
        deviceId: this.deviceId,
        deviceMac: this.deviceMac,
        deviceType: this.deviceType,
        timestamp: Date.now(),
        data: this.generateSensorData()
      };

      await axios.post(`${this.serverUrl}/api/esp32/data`, sensorData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📊 Sensor data sent (HTTP): ${JSON.stringify(sensorData.data, null, 2)}`);
    } catch (error) {
      console.error(`❌ HTTP sensor data error:`, error.message);
    }
  }

  // Send heartbeat
  sendHeartbeat() {
    if (!this.isConnected || !this.ws) return;

    const heartbeat = {
      type: 'heartbeat',
      deviceId: this.deviceId,
      deviceMac: this.deviceMac,
      timestamp: Date.now(),
      uptime: Math.floor(Date.now() / 1000),
      freeHeap: 200000 + Math.random() * 50000,
      wifiRSSI: -40 - Math.random() * 40
    };

    this.ws.send(JSON.stringify(heartbeat));
    console.log(`💓 Heartbeat sent`);
  }

  // Send device status
  sendDeviceStatus() {
    if (!this.isConnected || !this.ws) return;

    const status = {
      type: 'device_status',
      deviceId: this.deviceId,
      deviceMac: this.deviceMac,
      deviceType: this.deviceType,
      isOnboarded: true,
      wifiConnected: true,
      wifiSSID: 'TestNetwork',
      wifiRSSI: -45,
      ipAddress: '192.168.1.100',
      uptime: Math.floor(Date.now() / 1000),
      freeHeap: 250000,
      firmwareVersion: '1.0.0'
    };

    this.ws.send(JSON.stringify(status));
    console.log(`📋 Device status sent`);
  }

  // Start sensor data transmission
  startSensorTransmission(useWebSocket = true, interval = 5000) {
    console.log(`🚀 Starting sensor transmission (${useWebSocket ? 'WebSocket' : 'HTTP'}, ${interval}ms interval)`);
    
    this.sensorInterval = setInterval(() => {
      if (useWebSocket) {
        this.sendSensorDataWS();
      } else {
        this.sendSensorDataHTTP();
      }
    }, interval);
  }

  // Start heartbeat transmission
  startHeartbeat(interval = 30000) {
    console.log(`💓 Starting heartbeat transmission (${interval}ms interval)`);
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }

  // Stop all transmissions
  stopTransmissions() {
    if (this.sensorInterval) {
      clearInterval(this.sensorInterval);
      this.sensorInterval = null;
      console.log(`⏹️ Sensor transmission stopped`);
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log(`⏹️ Heartbeat transmission stopped`);
    }
  }

  // Disconnect from server
  disconnect() {
    this.stopTransmissions();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    console.log(`🔌 Disconnected from server`);
  }

  // Start the complete flow
  async start(useWebSocket = true) {
    try {
      console.log(`\n🚀 Starting ESP32 Test Client`);
      console.log(`   Device MAC: ${this.deviceMac}`);
      console.log(`   Device Type: ${this.deviceType}`);
      console.log(`   Server URL: ${this.serverUrl}`);
      
      // Step 1: Onboard device
      const onboarded = await this.onboard();
      if (!onboarded) {
        throw new Error('Onboarding failed');
      }
      
      if (useWebSocket) {
        // Step 2: Connect WebSocket
        await this.connectWebSocket();
        
        // Step 3: Start transmissions
        this.startSensorTransmission(true, 5000);
        this.startHeartbeat(30000);
      } else {
        // Use HTTP only
        this.startSensorTransmission(false, 10000);
      }
      
      console.log(`✅ ESP32 Test Client started successfully!\n`);
      
    } catch (error) {
      console.error(`❌ Failed to start ESP32 Test Client:`, error.message);
    }
  }
}

// Test multiple devices
async function runTests() {
  console.log(`\n=== ESP32 Test Client Suite ===\n`);
  
  // Create test devices
  const fishDevice = new ESP32TestClient('AA:BB:CC:DD:EE:01', 'fish');
  const plantDevice = new ESP32TestClient('AA:BB:CC:DD:EE:02', 'plant');
  
  // Start devices
  await fishDevice.start(true); // Use WebSocket
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  await plantDevice.start(true); // Use WebSocket
  
  // Let them run for a while
  console.log(`\n⏰ Running test for 60 seconds...\n`);
  
  setTimeout(() => {
    console.log(`\n🛑 Stopping test clients...`);
    fishDevice.disconnect();
    plantDevice.disconnect();
    console.log(`✅ Test completed!\n`);
    process.exit(0);
  }, 60000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n🛑 Received SIGINT, shutting down gracefully...`);
  process.exit(0);
});

// Run tests if this file is executed directly
if (require.main === module) {
  // Check if server is running
  axios.get('http://localhost:3001/health')
    .then(() => {
      console.log(`✅ Server is running, starting tests...`);
      runTests();
    })
    .catch(() => {
      console.error(`❌ Server is not running. Please start the server first with: npm start`);
      process.exit(1);
    });
}

module.exports = ESP32TestClient;