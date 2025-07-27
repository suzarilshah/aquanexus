import { Client, Databases, ID, Query } from 'node-appwrite';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'aquanexus-main';

// Collections
const DEVICES_COLLECTION = 'devices';
const SENSOR_DATA_COLLECTION = 'sensor_data';
const ALERTS_COLLECTION = 'alerts';
const REALTIME_EVENTS_COLLECTION = 'realtime_events';

// Demo data cycling
let fishDataIndex = 0;
let plantDataIndex = 0;
const fishDemoData = [];
const plantDemoData = [];

// Load demo data (this would be loaded from CSV in real implementation)
const loadDemoData = () => {
  // Fish demo data
  fishDemoData.push(
    { timestamp: new Date().toISOString(), waterTemp: 29.48, ec: 318.75, tds: 204, turbidity: 12, ph: 6.8 },
    { timestamp: new Date().toISOString(), waterTemp: 28.65, ec: 321.875, tds: 206, turbidity: 10, ph: 7.2 },
    { timestamp: new Date().toISOString(), waterTemp: 29.76, ec: 323.4375, tds: 207, turbidity: 12, ph: 7.0 }
  );
  
  // Plant demo data
  plantDemoData.push(
    { timestamp: new Date().toISOString(), height: 10, plantTemp: 30.12, humidity: 64.35, pressure: 100218.29 },
    { timestamp: new Date().toISOString(), height: 10, plantTemp: 31.57, humidity: 67.8, pressure: 100209.74 },
    { timestamp: new Date().toISOString(), height: 10, plantTemp: 32.48, humidity: 72.36, pressure: 100203.85 }
  );
};

// Create real-time event for broadcasting
const createRealtimeEvent = async (eventType, data) => {
  try {
    await databases.createDocument(
      DATABASE_ID,
      REALTIME_EVENTS_COLLECTION,
      ID.unique(),
      {
        eventType,
        data: JSON.stringify(data),
        timestamp: new Date().toISOString(),
        processed: false
      }
    );
  } catch (error) {
    console.error('Error creating realtime event:', error);
  }
};

// Get device from database
const getDevice = async (deviceId) => {
  try {
    return await databases.getDocument(DATABASE_ID, DEVICES_COLLECTION, deviceId);
  } catch (error) {
    return null;
  }
};

// Create or update device
const upsertDevice = async (deviceData) => {
  try {
    const existing = await getDevice(deviceData.deviceId);
    if (existing) {
      return await databases.updateDocument(
        DATABASE_ID,
        DEVICES_COLLECTION,
        deviceData.deviceId,
        {
          ...deviceData,
          lastSeen: new Date().toISOString(),
          status: 'online'
        }
      );
    } else {
      return await databases.createDocument(
        DATABASE_ID,
        DEVICES_COLLECTION,
        deviceData.deviceId,
        {
          ...deviceData,
          registeredAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          status: 'online'
        }
      );
    }
  } catch (error) {
    console.error('Error upserting device:', error);
    throw error;
  }
};

// Handle ESP32 data ingestion via HTTP
const handleESP32DataIngestion = async (requestData) => {
  const { deviceId, sensorType, readings, timestamp, apiKey } = requestData;
  
  // Verify device exists and API key is valid
  const device = await getDevice(deviceId);
  if (!device) {
    throw new Error('Device not found. Please register device first.');
  }
  
  if (device.apiKey !== apiKey) {
    throw new Error('Invalid API key');
  }
  
  // Store sensor data in database
  const sensorDataDoc = await databases.createDocument(
    DATABASE_ID,
    SENSOR_DATA_COLLECTION,
    ID.unique(),
    {
      deviceId,
      sensorType,
      readings: JSON.stringify(readings),
      timestamp: timestamp || new Date().toISOString(),
      processed: false
    }
  );
  
  // Check for alerts
  const alerts = checkForAlerts(sensorType, readings);
  
  // Store alerts if any
  for (const alert of alerts) {
    await databases.createDocument(
      DATABASE_ID,
      ALERTS_COLLECTION,
      ID.unique(),
      {
        deviceId,
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        timestamp: new Date().toISOString(),
        resolved: false
      }
    );
  }
  
  // Create real-time event for frontend
  await createRealtimeEvent('sensor_reading', {
    deviceId,
    sensorType,
    readings,
    timestamp: timestamp || new Date().toISOString()
  });
  
  // Create alert events if any
  for (const alert of alerts) {
    await createRealtimeEvent('system_alert', {
      deviceId,
      alert
    });
  }
  
  return {
    success: true,
    dataId: sensorDataDoc.$id,
    alertsGenerated: alerts.length
  };
};

// Handle device registration via HTTP
const handleDeviceRegistration = async (requestData) => {
  const { deviceId, deviceName, deviceType, macAddress } = requestData;
  
  // Generate API key for the device
  const apiKey = ID.unique();
  
  const deviceData = {
    deviceId,
    name: deviceName,
    type: deviceType,
    macAddress,
    apiKey,
    status: 'online'
  };
  
  const device = await upsertDevice(deviceData);
  
  // Create real-time event
  await createRealtimeEvent('device_registered', {
    device: {
      id: device.$id,
      name: device.name,
      type: device.type,
      status: device.status,
      registeredAt: device.registeredAt
    }
  });
  
  return {
    success: true,
    device: {
      id: device.$id,
      apiKey: device.apiKey,
      name: device.name,
      type: device.type
    }
  };
};

// Handle device heartbeat via HTTP
const handleDeviceHeartbeat = async (requestData) => {
  const { deviceId, apiKey } = requestData;
  
  // Verify device exists and API key is valid
  const device = await getDevice(deviceId);
  if (!device) {
    throw new Error('Device not found');
  }
  
  if (device.apiKey !== apiKey) {
    throw new Error('Invalid API key');
  }
  
  // Update device last seen
  await databases.updateDocument(
    DATABASE_ID,
    DEVICES_COLLECTION,
    deviceId,
    {
      lastSeen: new Date().toISOString(),
      status: 'online'
    }
  );
  
  // Create real-time event
  await createRealtimeEvent('device_status', {
    deviceId,
    status: 'online',
    lastSeen: new Date().toISOString()
  });
  
  return {
    success: true,
    status: 'online',
    timestamp: new Date().toISOString()
  };
};

// Get devices list via HTTP
const getDevicesList = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DEVICES_COLLECTION
    );
    
    return {
      success: true,
      devices: response.documents.map(device => ({
        id: device.$id,
        name: device.name,
        type: device.type,
        status: device.status,
        lastSeen: device.lastSeen,
        registeredAt: device.registeredAt
      })),
      total: response.total
    };
  } catch (error) {
    console.error('Error fetching devices:', error);
    throw error;
  }
};

// Get sensor data via HTTP
const getSensorData = async (deviceId, limit = 50) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SENSOR_DATA_COLLECTION,
      [
        Query.equal('deviceId', deviceId),
        Query.orderDesc('timestamp'),
        Query.limit(limit)
      ]
    );
    
    return {
      success: true,
      deviceId,
      data: response.documents.map(doc => ({
        id: doc.$id,
        sensorType: doc.sensorType,
        readings: JSON.parse(doc.readings),
        timestamp: doc.timestamp
      })),
      total: response.total
    };
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    throw error;
  }
};

// Get real-time events (for polling)
const getRealtimeEvents = async (since) => {
  try {
    const queries = [Query.orderDesc('timestamp')];
    if (since) {
      queries.push(Query.greaterThan('timestamp', since));
    }
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      REALTIME_EVENTS_COLLECTION,
      queries
    );
    
    return {
      success: true,
      events: response.documents.map(doc => ({
        id: doc.$id,
        eventType: doc.eventType,
        data: JSON.parse(doc.data),
        timestamp: doc.timestamp
      })),
      total: response.total
    };
  } catch (error) {
    console.error('Error fetching realtime events:', error);
    throw error;
  }
};

// Check for alerts based on sensor readings
const checkForAlerts = (sensorType, readings) => {
  const alerts = [];
  
  if (sensorType === 'fish') {
    // Fish environment alerts
    if (readings.waterTemp < 25 || readings.waterTemp > 32) {
      alerts.push({
        type: 'temperature_alert',
        message: `Water temperature ${readings.waterTemp}°C is outside optimal range (25-32°C)`,
        severity: 'warning'
      });
    }
    
    if (readings.ph < 6.5 || readings.ph > 7.5) {
      alerts.push({
        type: 'ph_alert',
        message: `pH level ${readings.ph} is outside optimal range (6.5-7.5)`,
        severity: 'warning'
      });
    }
    
    if (readings.turbidity > 25) {
      alerts.push({
        type: 'turbidity_alert',
        message: `High turbidity detected: ${readings.turbidity} NTU`,
        severity: 'warning'
      });
    }
  } else if (sensorType === 'plant') {
    // Plant environment alerts
    if (readings.plantTemp < 20 || readings.plantTemp > 35) {
      alerts.push({
        type: 'temperature_alert',
        message: `Plant temperature ${readings.plantTemp}°C is outside optimal range (20-35°C)`,
        severity: 'warning'
      });
    }
    
    if (readings.humidity < 60 || readings.humidity > 80) {
      alerts.push({
        type: 'humidity_alert',
        message: `Humidity ${readings.humidity}% is outside optimal range (60-80%)`,
        severity: 'warning'
      });
    }
  }
  
  return alerts;
};

// Start demo data streaming
const startDemoDataStreaming = async () => {
  // Create demo devices if they don't exist
  const demoFishDevice = {
    deviceId: 'demo-fish-001',
    name: 'Demo Fish Monitor',
    type: 'fish',
    macAddress: '00:00:00:00:00:01',
    apiKey: 'demo-fish-api-key',
    status: 'online'
  };
  
  const demoPlantDevice = {
    deviceId: 'demo-plant-001',
    name: 'Demo Plant Monitor',
    type: 'plant',
    macAddress: '00:00:00:00:00:02',
    apiKey: 'demo-plant-api-key',
    status: 'online'
  };
  
  await upsertDevice(demoFishDevice);
  await upsertDevice(demoPlantDevice);
  
  // Stream demo data
  const streamInterval = setInterval(async () => {
    try {
      // Stream fish data
      if (fishDemoData.length > 0) {
        const fishData = fishDemoData[fishDataIndex % fishDemoData.length];
        await handleESP32DataIngestion({
          deviceId: 'demo-fish-001',
          sensorType: 'fish',
          readings: {
            waterTemp: fishData.waterTemp,
            ec: fishData.ec,
            tds: fishData.tds,
            turbidity: fishData.turbidity,
            ph: fishData.ph
          },
          timestamp: new Date().toISOString(),
          apiKey: 'demo-fish-api-key'
        });
        fishDataIndex++;
      }
      
      // Stream plant data
      if (plantDemoData.length > 0) {
        const plantData = plantDemoData[plantDataIndex % plantDemoData.length];
        await handleESP32DataIngestion({
          deviceId: 'demo-plant-001',
          sensorType: 'plant',
          readings: {
            height: plantData.height,
            plantTemp: plantData.plantTemp,
            humidity: plantData.humidity,
            pressure: plantData.pressure
          },
          timestamp: new Date().toISOString(),
          apiKey: 'demo-plant-api-key'
        });
        plantDataIndex++;
      }
    } catch (error) {
      console.error('Error in demo data streaming:', error);
    }
  }, 5000); // Stream every 5 seconds
  
  // Stop streaming after 5 minutes to prevent infinite execution
  setTimeout(() => {
    clearInterval(streamInterval);
  }, 300000);
  
  return {
    success: true,
    message: 'Demo data streaming started',
    duration: '5 minutes'
  };
};

// Main function handler
export default async ({ req, res, log, error }) => {
  const { path, method } = req;
  
  try {
    // ESP32 data ingestion endpoint
    if (path === '/esp32/data' && method === 'POST') {
      const data = JSON.parse(req.body || '{}');
      const result = await handleESP32DataIngestion(data);
      return res.json(result);
    }
    
    // Device registration endpoint
    if (path === '/device/register' && method === 'POST') {
      const deviceData = JSON.parse(req.body || '{}');
      const result = await handleDeviceRegistration(deviceData);
      return res.json(result);
    }
    
    // Device heartbeat endpoint
    if (path === '/device/heartbeat' && method === 'POST') {
      const data = JSON.parse(req.body || '{}');
      const result = await handleDeviceHeartbeat(data);
      return res.json(result);
    }
    
    // Get devices list
    if (path === '/devices' && method === 'GET') {
      const result = await getDevicesList();
      return res.json(result);
    }
    
    // Get sensor data
    if (path === '/sensor-data' && method === 'GET') {
      const { deviceId, limit } = req.query;
      const result = await getSensorData(deviceId, limit);
      return res.json(result);
    }
    
    // Get real-time events (for polling)
    if (path === '/events' && method === 'GET') {
      const { since } = req.query;
      const result = await getRealtimeEvents(since);
      return res.json(result);
    }
    
    // Start demo data streaming
    if (path === '/start-demo' && method === 'POST') {
      loadDemoData();
      const result = await startDemoDataStreaming();
      return res.json(result);
    }
    
    // Health check endpoint
    if (path === '/status' && method === 'GET') {
      return res.json({ 
        success: true, 
        message: 'ESP32 Real-time Server is running',
        timestamp: new Date().toISOString(),
        endpoints: [
          'POST /esp32/data - ESP32 data ingestion',
          'POST /device/register - Device registration',
          'POST /device/heartbeat - Device heartbeat',
          'GET /devices - Get devices list',
          'GET /sensor-data - Get sensor data',
          'GET /events - Get real-time events',
          'POST /start-demo - Start demo streaming'
        ]
      });
    }
    
    return res.json({ 
      success: false, 
      message: 'Endpoint not found' 
    }, 404);
    
  } catch (err) {
    error('Error in main handler:', err);
    return res.json({ 
      success: false, 
      message: 'Internal server error',
      error: err.message 
    }, 500);
  }
};