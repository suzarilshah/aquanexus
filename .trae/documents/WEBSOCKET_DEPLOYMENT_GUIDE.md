# WebSocket Deployment Guide for AquaNexus

## Overview

This guide covers the deployment of WebSocket functionality to Appwrite for real-time communication between ESP32 devices and the AquaNexus platform. It includes deployment options, code changes required after deployment, and integration steps.

## WebSocket Architecture

### System Components
1. **ESP32 Devices**: IoT sensors sending real-time data
2. **WebSocket Server**: Handles real-time communication
3. **Appwrite Backend**: Database and API management
4. **React Frontend**: Real-time dashboard and controls
5. **AI Processing**: Real-time data analysis and insights

### Data Flow
```
ESP32 Sensors → WebSocket Server → Appwrite Database → React Dashboard
                     ↓
                AI Processing → Alerts & Insights
```

## Deployment Options

### Option 1: Appwrite Functions (Recommended)

#### Advantages
- Integrated with existing Appwrite infrastructure
- Automatic scaling and load balancing
- Built-in authentication and security
- Simplified deployment and maintenance

#### Implementation
1. **Create WebSocket Function**
   ```bash
   # Create new Appwrite function
   appwrite functions create \
     --functionId websocket-server \
     --name "WebSocket Server" \
     --runtime node-18.0 \
     --execute any
   ```

2. **Function Code Structure**
   ```javascript
   // functions/websocket-server/src/main.js
   import { Client, Databases, Users } from 'node-appwrite';
   import WebSocket from 'ws';
   
   export default async ({ req, res, log, error }) => {
     const client = new Client()
       .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
       .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
       .setKey(process.env.APPWRITE_API_KEY);
   
     const databases = new Databases(client);
     
     // WebSocket server implementation
     const wss = new WebSocket.Server({ port: 8080 });
     
     wss.on('connection', (ws) => {
       log('New WebSocket connection established');
       
       ws.on('message', async (message) => {
         try {
           const data = JSON.parse(message);
           await handleSensorData(data, databases, log);
         } catch (err) {
           error('Error processing message:', err);
         }
       });
     });
     
     return res.json({ message: 'WebSocket server started' });
   };
   
   async function handleSensorData(data, databases, log) {
     // Process and store sensor data
     await databases.createDocument(
       process.env.DATABASE_ID,
       process.env.SENSOR_DATA_COLLECTION_ID,
       'unique()',
       {
         deviceMac: data.deviceMac,
         deviceType: data.deviceType,
         timestamp: new Date().toISOString(),
         sensorData: data.sensors,
         location: data.location
       }
     );
     
     log(`Stored sensor data for device: ${data.deviceMac}`);
   }
   ```

3. **Deploy Function**
   ```bash
   # Deploy the function
   appwrite functions createDeployment \
     --functionId websocket-server \
     --entrypoint src/main.js \
     --code . \
     --activate true
   ```

### Option 2: External WebSocket Server

#### Advantages
- More control over WebSocket implementation
- Can handle complex real-time logic
- Easier to scale horizontally

#### Implementation
1. **Server Setup**
   ```javascript
   // websocket-server/server.js
   const WebSocket = require('ws');
   const { Client, Databases } = require('node-appwrite');
   
   const client = new Client()
     .setEndpoint(process.env.APPWRITE_ENDPOINT)
     .setProject(process.env.APPWRITE_PROJECT_ID)
     .setKey(process.env.APPWRITE_API_KEY);
   
   const databases = new Databases(client);
   const wss = new WebSocket.Server({ port: 8080 });
   
   wss.on('connection', (ws, req) => {
     console.log('New WebSocket connection from:', req.socket.remoteAddress);
     
     ws.on('message', async (message) => {
       try {
         const data = JSON.parse(message);
         await processSensorData(data);
         
         // Broadcast to all connected clients
         wss.clients.forEach((client) => {
           if (client.readyState === WebSocket.OPEN) {
             client.send(JSON.stringify({
               type: 'sensor_update',
               data: data
             }));
           }
         });
       } catch (error) {
         console.error('Error processing message:', error);
         ws.send(JSON.stringify({ error: 'Invalid message format' }));
       }
     });
     
     ws.on('close', () => {
       console.log('WebSocket connection closed');
     });
   });
   
   async function processSensorData(data) {
     // Store in Appwrite database
     await databases.createDocument(
       process.env.DATABASE_ID,
       process.env.SENSOR_DATA_COLLECTION_ID,
       'unique()',
       {
         deviceMac: data.deviceMac,
         deviceType: data.deviceType,
         timestamp: new Date().toISOString(),
         sensorData: data.sensors,
         location: data.location,
         alerts: data.alerts || []
       }
     );
   }
   
   console.log('WebSocket server running on port 8080');
   ```

2. **Deployment with Docker**
   ```dockerfile
   # Dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   
   COPY . .
   
   EXPOSE 8080
   CMD ["node", "server.js"]
   ```

   ```bash
   # Build and deploy
   docker build -t aquanexus-websocket .
   docker run -d -p 8080:8080 \
     -e APPWRITE_ENDPOINT=https://your-appwrite-domain.com/v1 \
     -e APPWRITE_PROJECT_ID=your-project-id \
     -e APPWRITE_API_KEY=your-api-key \
     aquanexus-websocket
   ```

## Code Changes After WebSocket Deployment

### 1. Frontend Configuration Updates

#### WebSocket Connection Setup
```javascript
// src/services/websocket.js
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
  }

  connect() {
    // Update with your deployed WebSocket URL
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'wss://your-appwrite-domain.com/v1/realtime';
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Subscribe to real-time updates
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['databases.aquanexus.collections.sensor-data.documents']
      }));
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(data) {
    // Handle different message types
    switch (data.type) {
      case 'sensor_update':
        this.onSensorUpdate(data.payload);
        break;
      case 'alert':
        this.onAlert(data.payload);
        break;
      case 'device_status':
        this.onDeviceStatus(data.payload);
        break;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectInterval);
    }
  }

  // Event handlers (to be overridden)
  onSensorUpdate(data) {}
  onAlert(data) {}
  onDeviceStatus(data) {}
}

export default new WebSocketService();
```

#### Environment Variables Update
```bash
# .env
REACT_APP_WEBSOCKET_URL=wss://your-deployed-websocket-server.com
REACT_APP_APPWRITE_ENDPOINT=https://your-appwrite-domain.com/v1
REACT_APP_APPWRITE_PROJECT_ID=your-project-id
```

### 2. Dashboard Component Updates

#### Real-time Data Integration
```javascript
// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import WebSocketService from '../services/websocket';

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState({});

  useEffect(() => {
    // Set up WebSocket event handlers
    WebSocketService.onSensorUpdate = (data) => {
      setSensorData(prev => ({
        ...prev,
        [data.deviceMac]: data
      }));
    };

    WebSocketService.onAlert = (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    };

    WebSocketService.onDeviceStatus = (status) => {
      setDeviceStatus(prev => ({
        ...prev,
        [status.deviceMac]: status
      }));
    };

    // Connect to WebSocket
    WebSocketService.connect();

    return () => {
      if (WebSocketService.ws) {
        WebSocketService.ws.close();
      }
    };
  }, []);

  return (
    <div className="dashboard">
      {/* Real-time sensor data display */}
      <div className="sensor-grid">
        {Object.entries(sensorData).map(([deviceMac, data]) => (
          <SensorCard key={deviceMac} deviceMac={deviceMac} data={data} />
        ))}
      </div>
      
      {/* Real-time alerts */}
      <div className="alerts-panel">
        <h3>Recent Alerts</h3>
        {alerts.map((alert, index) => (
          <AlertItem key={index} alert={alert} />
        ))}
      </div>
      
      {/* Device status indicators */}
      <div className="device-status">
        {Object.entries(deviceStatus).map(([deviceMac, status]) => (
          <DeviceStatusIndicator key={deviceMac} deviceMac={deviceMac} status={status} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
```

### 3. ESP32 Firmware Updates

#### WebSocket URL Configuration
```cpp
// Update in ESP32 firmware
// Replace with your deployed WebSocket server URL
const char* websocket_server = "your-deployed-websocket-server.com";
const int websocket_port = 443;  // Use 443 for WSS, 80 for WS
const char* websocket_path = "/";

// For Appwrite Functions
// const char* websocket_server = "your-appwrite-domain.com";
// const char* websocket_path = "/v1/realtime";
```

#### Enhanced Data Transmission
```cpp
void sendSensorData() {
  StaticJsonDocument<1024> doc;
  
  // Device identification
  doc["deviceMac"] = WiFi.macAddress();
  doc["deviceType"] = DEVICE_TYPE;
  doc["location"] = DEVICE_LOCATION;
  doc["timestamp"] = getTimestamp();
  
  // Sensor data
  JsonObject sensors = doc.createNestedObject("sensors");
  
  if (DEVICE_TYPE == "fish") {
    sensors["temperature"] = readTemperature();
    sensors["ph"] = readPH();
    sensors["dissolvedOxygen"] = readDO();
    sensors["turbidity"] = readTurbidity();
    sensors["waterLevel"] = readWaterLevel();
  } else if (DEVICE_TYPE == "plant") {
    sensors["airTemperature"] = readAirTemperature();
    sensors["humidity"] = readHumidity();
    sensors["lightIntensity"] = readLightIntensity();
    sensors["soilMoisture"] = readSoilMoisture();
    sensors["nutrientPH"] = readNutrientPH();
    sensors["ec"] = readEC();
  }
  
  // Device status
  JsonObject status = doc.createNestedObject("status");
  status["wifiSignal"] = WiFi.RSSI();
  status["freeHeap"] = ESP.getFreeHeap();
  status["uptime"] = millis();
  
  // Alerts (if any)
  JsonArray alerts = doc.createNestedArray("alerts");
  checkAndAddAlerts(alerts, sensors);
  
  String payload;
  serializeJson(doc, payload);
  
  webSocket.sendTXT(payload);
}
```

### 4. API Endpoint Updates

#### Real-time Data API
```javascript
// functions/api/src/routes/realtime.js
import { Client, Databases } from 'node-appwrite';

export async function GET({ req, res, log }) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  
  try {
    // Get latest sensor data for all devices
    const response = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.SENSOR_DATA_COLLECTION_ID,
      [
        Query.orderDesc('timestamp'),
        Query.limit(100)
      ]
    );
    
    // Group by device for latest readings
    const latestData = {};
    response.documents.forEach(doc => {
      if (!latestData[doc.deviceMac]) {
        latestData[doc.deviceMac] = doc;
      }
    });
    
    return res.json({
      success: true,
      data: Object.values(latestData)
    });
  } catch (error) {
    log('Error fetching real-time data:', error);
    return res.json({ success: false, error: error.message }, 500);
  }
}
```

### 5. Database Schema Updates

#### Enhanced Sensor Data Collection
```javascript
// Database collection: sensor-data
{
  "deviceMac": "string",      // Device MAC address
  "deviceType": "string",     // "fish" or "plant"
  "location": "string",       // User-defined location
  "timestamp": "datetime",    // ISO 8601 timestamp
  "sensorData": "object",     // Sensor readings
  "deviceStatus": "object",   // Device health info
  "alerts": "array",          // Active alerts
  "processed": "boolean",     // AI processing status
  "$createdAt": "datetime",
  "$updatedAt": "datetime"
}
```

#### Device Registry Collection
```javascript
// Database collection: devices
{
  "deviceMac": "string",      // Unique device identifier
  "deviceType": "string",     // "fish" or "plant"
  "location": "string",       // Installation location
  "name": "string",           // User-friendly name
  "lastSeen": "datetime",     // Last communication
  "isOnline": "boolean",      // Current status
  "firmwareVersion": "string", // ESP32 firmware version
  "configuration": "object",  // Device settings
  "$createdAt": "datetime",
  "$updatedAt": "datetime"
}
```

## Deployment Checklist

### Pre-Deployment
- [ ] WebSocket server code tested locally
- [ ] Appwrite database collections created
- [ ] Environment variables configured
- [ ] SSL certificates obtained (for WSS)
- [ ] Firewall rules configured

### Deployment Steps
1. [ ] Deploy WebSocket server (Appwrite Function or external)
2. [ ] Update frontend environment variables
3. [ ] Deploy updated frontend application
4. [ ] Update ESP32 firmware with new WebSocket URL
5. [ ] Test end-to-end communication
6. [ ] Monitor logs for errors

### Post-Deployment
- [ ] Verify real-time data flow
- [ ] Test WebSocket reconnection
- [ ] Validate alert system
- [ ] Monitor server performance
- [ ] Set up monitoring and alerting

## Monitoring and Maintenance

### Health Checks
```javascript
// Health check endpoint
export async function GET({ req, res }) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    websocket: {
      connections: wss.clients.size,
      uptime: process.uptime()
    },
    database: {
      connected: true // Test database connection
    }
  };
  
  return res.json(health);
}
```

### Performance Monitoring
- **Connection Count**: Monitor active WebSocket connections
- **Message Rate**: Track messages per second
- **Error Rate**: Monitor connection failures and errors
- **Latency**: Measure end-to-end data transmission time
- **Resource Usage**: CPU, memory, and network utilization

### Scaling Considerations
- **Load Balancing**: Use multiple WebSocket server instances
- **Connection Limits**: Monitor and plan for connection scaling
- **Database Performance**: Optimize queries and indexing
- **Caching**: Implement Redis for real-time data caching

This comprehensive guide ensures successful WebSocket deployment and integration with the AquaNexus platform, enabling real-time monitoring and control of aquaponics systems.