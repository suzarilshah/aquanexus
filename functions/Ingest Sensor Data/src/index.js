const { MongoClient } = require('mongodb');
const sdk = require('node-appwrite');

// Initialize Appwrite SDK
const client = new sdk.Client();
const databases = new sdk.Databases(client);

// Initialize MongoDB client
let mongoClient = null;
let mongoDb = null;

/**
 * Ingest Sensor Data Function
 * This function receives sensor data from ESP32 devices and stores it in MongoDB
 */
module.exports = async function(req, res) {
  // Initialize Appwrite client
  const appwriteEndpoint = process.env.APPWRITE_FUNCTION_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
  const appwriteProject = process.env.APPWRITE_FUNCTION_PROJECT_ID || '687f8e78001ac206db80';
  const appwriteKey = process.env.APPWRITE_FUNCTION_API_KEY || 'standard_2c0b3177b1c27be45830633b9bc9142f19d0b0764211810fc449fbdcc4afe39c5bf32a0fc3dc0a468c44ca9ea7883739da70317047e5ada06c75eb294ee820181063c0a75f69262b07cad631f611f22188c50c553d424b92bdfbb4855dc04deb90cae07ec23d2072d30c3dd2541bd70b80d2fc65902303281712593078a7ff6c';
  const appwriteDatabaseId = process.env.APPWRITE_DATABASE_ID || 'main';
  
  client
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProject)
    .setKey(appwriteKey);
  
  // Initialize MongoDB connection
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://suzarilshah:h7VvXMXASkcZ31OY@aquanexusdb.meuxndd.mongodb.net/';
  const mongoDbName = process.env.MONGODB_DATABASE || 'aquanexus';
  
  try {
    // Parse request data
    const payload = JSON.parse(req.payload || '{}');
    const { apiKey, deviceMac, readings, readingType } = payload;
    
    if (!apiKey || !deviceMac || !readings || !readingType) {
      return res.json({ success: false, message: 'API key, device MAC, readings, and reading type are required' }, 400);
    }
    
    // Connect to MongoDB
    await connectToMongoDB(mongoUri, mongoDbName);
    
    // Authenticate device
    const device = await authenticateDevice(apiKey, deviceMac);
    
    if (!device) {
      return res.json({ success: false, message: 'Invalid API key or device MAC' }, 401);
    }
    
    // Update device last seen timestamp
    await updateDeviceLastSeen(device._id);
    
    // Process and store sensor readings
    const result = await processSensorReadings(device, readings, readingType);
    
    // Check for alerts
    const alerts = await checkForAlerts(device, readings, readingType);
    
    // Return success response
    return res.json({
      success: true,
      message: 'Sensor data ingested successfully',
      recordsProcessed: result.insertedCount,
      alerts: alerts.length > 0 ? alerts : null,
      config: device.config
    });
    
  } catch (error) {
    console.error('Error ingesting sensor data:', error);
    return res.json({ success: false, message: error.message }, 500);
  } finally {
    // Close MongoDB connection
    if (mongoClient) {
      await mongoClient.close();
    }
  }
};

/**
 * Connect to MongoDB
 */
async function connectToMongoDB(uri, dbName) {
  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    mongoDb = mongoClient.db(dbName);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Authenticate device using API key and MAC address
 */
async function authenticateDevice(apiKey, deviceMac) {
  try {
    return await mongoDb.collection('devices').findOne({
      apiKey,
      macAddress: deviceMac,
      status: { $ne: 'disabled' }
    });
  } catch (error) {
    console.error('Error authenticating device:', error);
    throw error;
  }
}

/**
 * Update device last seen timestamp
 */
async function updateDeviceLastSeen(deviceId) {
  try {
    await mongoDb.collection('devices').updateOne(
      { _id: deviceId },
      {
        $set: {
          lastSeen: new Date(),
          status: 'online'
        }
      }
    );
  } catch (error) {
    console.error('Error updating device last seen:', error);
    throw error;
  }
}

/**
 * Process and store sensor readings
 */
async function processSensorReadings(device, readings, readingType) {
  try {
    // Determine collection based on reading type
    const collectionName = readingType === 'fish' ? 'fish_readings' : 'plant_readings';
    
    // Prepare readings for insertion
    const timestamp = new Date();
    const readingsToInsert = Array.isArray(readings) ? readings : [readings];
    
    const formattedReadings = readingsToInsert.map(reading => ({
      deviceId: device.deviceId,
      projectId: device.projectId,
      timestamp: reading.timestamp ? new Date(reading.timestamp) : timestamp,
      ...reading,
      createdAt: timestamp,
      source: 'device'
    }));
    
    // Insert readings into MongoDB
    return await mongoDb.collection(collectionName).insertMany(formattedReadings);
  } catch (error) {
    console.error('Error processing sensor readings:', error);
    throw error;
  }
}

/**
 * Check for alerts based on sensor readings and device thresholds
 */
async function checkForAlerts(device, readings, readingType) {
  try {
    const alerts = [];
    const thresholds = device.config?.alertThresholds || {};
    const readingsArray = Array.isArray(readings) ? readings : [readings];
    
    // Check each reading against thresholds
    readingsArray.forEach(reading => {
      Object.entries(reading).forEach(([key, value]) => {
        // Skip non-numeric values and timestamp
        if (typeof value !== 'number' || key === 'timestamp') return;
        
        const threshold = thresholds[key];
        if (!threshold) return;
        
        // Check if value is outside threshold range
        if ((threshold.min !== null && value < threshold.min) ||
            (threshold.max !== null && value > threshold.max)) {
          
          // Create alert
          const alert = {
            deviceId: device.deviceId,
            projectId: device.projectId,
            parameter: key,
            value,
            threshold: threshold.min !== null && value < threshold.min ? threshold.min : threshold.max,
            type: threshold.min !== null && value < threshold.min ? 'below_minimum' : 'above_maximum',
            readingType,
            timestamp: new Date(),
            status: 'new'
          };
          
          alerts.push(alert);
        }
      });
    });
    
    // Store alerts in MongoDB if any
    if (alerts.length > 0) {
      await mongoDb.collection('alerts').insertMany(alerts);
    }
    
    return alerts;
  } catch (error) {
    console.error('Error checking for alerts:', error);
    throw error;
  }
}