# Appwrite Messaging Integration for ESP32 Real-time Data Streaming

This document explains how the AquaNexus platform integrates with Appwrite Messaging to enable real-time data streaming from ESP32 devices.

## Overview

The integration replaces traditional WebSocket connections with Appwrite's real-time messaging system, providing:

- **Scalable Real-time Communication**: Built on Appwrite's infrastructure
- **Automatic Authentication**: Integrated with user sessions
- **Message Persistence**: Reliable message delivery
- **Cross-platform Support**: Works across web, mobile, and IoT devices
- **Built-in Security**: Encrypted communication channels

## Architecture

```
ESP32 Device → Appwrite Edge Function → Appwrite Database → Real-time Updates → Web Dashboard
```

### Data Flow

1. **ESP32 Collection**: Sensors collect environmental data
2. **HTTP POST**: Device sends data to Appwrite Edge Function
3. **Data Processing**: Function validates and stores data
4. **Real-time Broadcast**: Appwrite automatically broadcasts changes
5. **Dashboard Updates**: Web interface receives real-time updates

## Implementation Details

### 1. ESP32 Device Registration

#### Updated Onboarding Process

The ESP32 onboarding component (`src/components/onboarding/ESP32Onboarding.tsx`) now includes:

```typescript
// Device registration with Appwrite
const registerDevice = async () => {
  try {
    setIsRegistering(true);
    
    const response = await apiService.registerDevice({
      deviceMac,
      deviceName,
      deviceType,
      projectId: authStore.currentProject?.id,
      userId: authStore.user?.id
    });
    
    if (response.success) {
      setApiKey(response.apiKey);
      setRegistrationSuccess(true);
      
      // Update device store
      deviceStore.addDevice({
        id: deviceId,
        name: deviceName,
        type: deviceType,
        mac: deviceMac,
        status: 'registered',
        apiKey: response.apiKey
      });
    }
  } catch (error) {
    setRegistrationError(error.message);
  } finally {
    setIsRegistering(false);
  }
};
```

#### Configuration Generation

The system generates a comprehensive configuration file:

```json
{
  "device_id": "ESP32_XXXXXXXX",
  "device_mac": "XX:XX:XX:XX:XX:XX",
  "wifi_ssid": "YourWiFiNetwork",
  "wifi_password": "YourWiFiPassword",
  "appwrite_endpoint": "https://syd.cloud.appwrite.io/v1",
  "appwrite_project_id": "687f8e78001ac206db80",
  "ingest_function_url": "https://syd.cloud.appwrite.io/v1/functions/ingest-sensor-data/executions",
  "api_key": "device-specific-api-key",
  "device_type": "fish",
  "reading_interval": 300
}
```

### 2. Appwrite Edge Functions

#### Device Registration Function

Location: `functions/register-device/src/index.js`

```javascript
export default async ({ req, res, log, error }) => {
  try {
    const { deviceMac, deviceName, projectId, userId, deviceType } = JSON.parse(req.body);
    
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('aquanexus');
    
    // Check for existing device
    const existingDevice = await db.collection('devices').findOne({ deviceMac });
    
    if (existingDevice) {
      // Update existing device
      await db.collection('devices').updateOne(
        { deviceMac },
        { 
          $set: { 
            deviceName, 
            projectId, 
            userId, 
            deviceType,
            lastSeen: new Date() 
          } 
        }
      );
      
      return res.json({ 
        success: true, 
        deviceId: existingDevice.deviceId,
        apiKey: existingDevice.apiKey 
      });
    }
    
    // Create new device
    const deviceId = `ESP32_${Date.now()}`;
    const apiKey = generateApiKey();
    
    const deviceData = {
      deviceId,
      deviceMac,
      deviceName,
      projectId,
      userId,
      deviceType,
      apiKey,
      status: 'registered',
      createdAt: new Date(),
      lastSeen: new Date(),
      // Default configurations
      readingInterval: 300,
      alertThresholds: getDefaultThresholds(deviceType)
    };
    
    // Store in MongoDB
    await db.collection('devices').insertOne(deviceData);
    
    // Store in Appwrite Database for real-time updates
    await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      'devices',
      deviceId,
      deviceData
    );
    
    await client.close();
    
    return res.json({ 
      success: true, 
      deviceId,
      apiKey 
    });
    
  } catch (err) {
    error('Device registration failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
```

#### Data Ingestion Function

Location: `functions/ingest-sensor-data/src/index.js`

```javascript
export default async ({ req, res, log, error }) => {
  try {
    const { apiKey, deviceMac, readings, readingType } = JSON.parse(req.body);
    
    // Validate device
    const device = await validateDevice(apiKey, deviceMac);
    if (!device) {
      return res.json({ success: false, error: 'Invalid device' }, 401);
    }
    
    // Update device last seen
    await updateDeviceLastSeen(deviceMac);
    
    // Process and store readings
    const processedReadings = await processReadings(readings, device, readingType);
    
    // Store in appropriate collection
    const collectionName = readingType === 'fish' ? 'fish_readings' : 'plant_readings';
    await storeReadings(collectionName, processedReadings);
    
    // Check for alerts
    const alerts = await checkAlertThresholds(processedReadings, device);
    if (alerts.length > 0) {
      await storeAlerts(alerts);
      // Appwrite will automatically broadcast alert changes
    }
    
    // Store readings in Appwrite Database for real-time updates
    for (const reading of processedReadings) {
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        collectionName,
        ID.unique(),
        reading
      );
    }
    
    return res.json({ 
      success: true, 
      message: 'Data processed successfully',
      readingsProcessed: processedReadings.length,
      alertsGenerated: alerts.length
    });
    
  } catch (err) {
    error('Data ingestion failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
```

### 3. Real-time Data Subscription

#### Web Dashboard Integration

The web dashboard subscribes to real-time updates using Appwrite's real-time API:

```typescript
// src/lib/realtime.ts
import { Client, Databases } from 'appwrite';
import { useStore } from '../store/useStore';

class RealtimeService {
  private client: Client;
  private databases: Databases;
  private subscriptions: Map<string, () => void> = new Map();
  
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.REACT_APP_APPWRITE_ENDPOINT!)
      .setProject(process.env.REACT_APP_APPWRITE_PROJECT_ID!);
    
    this.databases = new Databases(this.client);
  }
  
  // Subscribe to sensor readings
  subscribeSensorReadings(deviceId: string, readingType: 'fish' | 'plant') {
    const collectionId = readingType === 'fish' ? 'fish_readings' : 'plant_readings';
    
    const unsubscribe = this.client.subscribe(
      `databases.${process.env.REACT_APP_APPWRITE_DATABASE_ID}.collections.${collectionId}.documents`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const reading = response.payload;
          
          // Filter by device
          if (reading.deviceMac === deviceId) {
            useStore.getState().addSensorReading(reading);
          }
        }
      }
    );
    
    this.subscriptions.set(`readings_${deviceId}`, unsubscribe);
    return unsubscribe;
  }
  
  // Subscribe to device status updates
  subscribeDeviceStatus(deviceId: string) {
    const unsubscribe = this.client.subscribe(
      `databases.${process.env.REACT_APP_APPWRITE_DATABASE_ID}.collections.devices.documents.${deviceId}`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.update')) {
          const device = response.payload;
          useStore.getState().updateDevice(device);
        }
      }
    );
    
    this.subscriptions.set(`device_${deviceId}`, unsubscribe);
    return unsubscribe;
  }
  
  // Subscribe to alerts
  subscribeAlerts(projectId: string) {
    const unsubscribe = this.client.subscribe(
      `databases.${process.env.REACT_APP_APPWRITE_DATABASE_ID}.collections.alerts.documents`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const alert = response.payload;
          
          // Filter by project
          if (alert.projectId === projectId) {
            useStore.getState().addAlert(alert);
            
            // Show notification
            if (alert.severity === 'critical') {
              this.showCriticalAlert(alert);
            }
          }
        }
      }
    );
    
    this.subscriptions.set(`alerts_${projectId}`, unsubscribe);
    return unsubscribe;
  }
  
  // Cleanup subscriptions
  unsubscribeAll() {
    this.subscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.subscriptions.clear();
  }
  
  private showCriticalAlert(alert: any) {
    // Show browser notification for critical alerts
    if (Notification.permission === 'granted') {
      new Notification(`Critical Alert: ${alert.type}`, {
        body: alert.message,
        icon: '/alert-icon.png'
      });
    }
  }
}

export const realtimeService = new RealtimeService();
```

#### React Hook for Real-time Data

```typescript
// src/hooks/useRealtimeData.ts
import { useEffect } from 'react';
import { realtimeService } from '../lib/realtime';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';

export const useRealtimeData = () => {
  const { devices } = useStore();
  const { currentProject } = useAuthStore();
  
  useEffect(() => {
    if (!currentProject) return;
    
    // Subscribe to alerts for current project
    const alertsUnsubscribe = realtimeService.subscribeAlerts(currentProject.id);
    
    // Subscribe to each device's data
    const deviceUnsubscribes = devices.map(device => {
      const readingsUnsubscribe = realtimeService.subscribeSensorReadings(
        device.mac, 
        device.type
      );
      const statusUnsubscribe = realtimeService.subscribeDeviceStatus(device.id);
      
      return [readingsUnsubscribe, statusUnsubscribe];
    }).flat();
    
    // Cleanup on unmount
    return () => {
      alertsUnsubscribe();
      deviceUnsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [currentProject, devices]);
};
```

### 4. ESP32 Firmware Integration

The ESP32 firmware (`esp32-firmware/aquanexus-esp32.ino`) sends data directly to Appwrite Edge Functions:

```cpp
void sendSensorData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(config.ingestFunctionUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    StaticJsonDocument<1024> doc;
    doc["apiKey"] = config.apiKey;
    doc["deviceMac"] = config.deviceMac;
    doc["readingType"] = config.deviceType;
    
    JsonArray readings = doc.createNestedArray("readings");
    
    // Add sensor readings
    JsonObject tempReading = readings.createNestedObject();
    tempReading["type"] = "temperature";
    tempReading["value"] = readTemperature();
    tempReading["unit"] = "celsius";
    tempReading["timestamp"] = String(WiFi.getTime());
    
    JsonObject phReading = readings.createNestedObject();
    phReading["type"] = "ph";
    phReading["value"] = readPH();
    phReading["unit"] = "ph";
    phReading["timestamp"] = String(WiFi.getTime());
    
    // Add more readings...
    
    String payload;
    serializeJson(doc, payload);
    
    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode == 200) {
      String response = http.getString();
      Serial.println("Data sent successfully: " + response);
      
      // Parse response for any configuration updates
      StaticJsonDocument<512> responseDoc;
      deserializeJson(responseDoc, response);
      
      if (responseDoc["config"]["reading_interval"]) {
        config.readingInterval = responseDoc["config"]["reading_interval"];
        saveConfig(); // Save updated configuration
      }
    } else {
      Serial.println("HTTP Error: " + String(httpResponseCode));
      handleError("HTTP_ERROR", httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi not connected");
    handleError("WIFI_ERROR", 0);
  }
}
```

## Benefits of Appwrite Messaging Integration

### 1. **Scalability**
- Handles thousands of concurrent connections
- Auto-scaling based on demand
- Global CDN for low latency

### 2. **Reliability**
- Message persistence and delivery guarantees
- Automatic reconnection handling
- Built-in error recovery

### 3. **Security**
- End-to-end encryption
- User-based access control
- API key authentication for devices

### 4. **Developer Experience**
- Simple subscription API
- Automatic data synchronization
- Built-in authentication integration

### 5. **Real-time Features**
- Instant data updates
- Live device status monitoring
- Real-time alert notifications
- Collaborative dashboard viewing

## Configuration

### Environment Variables

```env
# Appwrite Configuration
REACT_APP_APPWRITE_ENDPOINT=https://syd.cloud.appwrite.io/v1
REACT_APP_APPWRITE_PROJECT_ID=687f8e78001ac206db80
REACT_APP_APPWRITE_DATABASE_ID=your-database-id

# Edge Function Configuration
APPWRITE_FUNCTION_ENDPOINT=https://syd.cloud.appwrite.io/v1
APPWRITE_FUNCTION_PROJECT_ID=687f8e78001ac206db80
APPWRITE_FUNCTION_API_KEY=your-api-key

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=aquanexus
```

### Database Collections

```javascript
// Appwrite Database Schema
const collections = {
  devices: {
    deviceId: 'string',
    deviceMac: 'string', 
    deviceName: 'string',
    deviceType: 'string',
    projectId: 'string',
    userId: 'string',
    status: 'string',
    lastSeen: 'datetime',
    apiKey: 'string'
  },
  fish_readings: {
    deviceMac: 'string',
    temperature: 'float',
    ph: 'float',
    dissolvedOxygen: 'float',
    turbidity: 'float',
    timestamp: 'datetime'
  },
  plant_readings: {
    deviceMac: 'string',
    soilMoisture: 'float',
    lightLevel: 'float',
    temperature: 'float',
    humidity: 'float',
    timestamp: 'datetime'
  },
  alerts: {
    deviceMac: 'string',
    alertType: 'string',
    severity: 'string',
    message: 'string',
    value: 'float',
    threshold: 'float',
    timestamp: 'datetime',
    acknowledged: 'boolean'
  }
};
```

## Monitoring and Debugging

### Real-time Connection Status

```typescript
// Monitor connection status
realtimeService.client.subscribe('connection', (response) => {
  console.log('Connection status:', response.events);
  
  if (response.events.includes('connection.connected')) {
    useStore.getState().setConnectionStatus('connected');
  } else if (response.events.includes('connection.disconnected')) {
    useStore.getState().setConnectionStatus('disconnected');
  }
});
```

### Error Handling

```typescript
// Handle subscription errors
try {
  const unsubscribe = realtimeService.subscribeSensorReadings(deviceId, 'fish');
} catch (error) {
  console.error('Subscription failed:', error);
  // Implement fallback polling mechanism
  fallbackToPolling(deviceId);
}
```

## Migration from WebSocket

The previous WebSocket implementation has been replaced with Appwrite Messaging:

### Before (WebSocket)
```typescript
// Old WebSocket implementation
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateSensorData(data);
};
```

### After (Appwrite Messaging)
```typescript
// New Appwrite Messaging implementation
const unsubscribe = realtimeService.subscribeSensorReadings(deviceId, 'fish');
// Data updates are automatically handled by the subscription
```

## Performance Considerations

- **Subscription Limits**: Monitor active subscriptions to avoid limits
- **Data Volume**: Consider data aggregation for high-frequency sensors
- **Network Usage**: Implement intelligent reconnection strategies
- **Battery Life**: Optimize ESP32 transmission intervals

## Future Enhancements

1. **Message Queuing**: Implement offline message queuing
2. **Data Compression**: Add data compression for large payloads
3. **Edge Computing**: Process data closer to devices
4. **Machine Learning**: Real-time anomaly detection
5. **Multi-tenancy**: Support for multiple organizations

This integration provides a robust, scalable foundation for real-time IoT data streaming in the AquaNexus platform.