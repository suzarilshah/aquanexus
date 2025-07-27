const { MongoClient } = require('mongodb');
const sdk = require('node-appwrite');
const { v4: uuidv4 } = require('uuid');

// Initialize Appwrite SDK
const client = new sdk.Client();
const databases = new sdk.Databases(client);

// Initialize MongoDB client
let mongoClient = null;
let mongoDb = null;

/**
 * Register Device Function
 * This function registers an ESP32 device and associates it with a user's project
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
    const { deviceMac, deviceName, projectId, userId, deviceType } = payload;
    
    if (!deviceMac || !projectId || !userId) {
      return res.json({ success: false, message: 'Device MAC, project ID, and user ID are required' }, 400);
    }
    
    // Connect to MongoDB
    await connectToMongoDB(mongoUri, mongoDbName);
    
    // Check if device already exists
    const existingDevice = await mongoDb.collection('devices').findOne({ macAddress: deviceMac });
    
    if (existingDevice) {
      // Update existing device
      const updatedDevice = await updateExistingDevice(existingDevice._id, deviceName, projectId, userId, deviceType);
      return res.json({
        success: true,
        message: 'Device updated successfully',
        device: updatedDevice
      });
    }
    
    // Register new device
    const deviceId = `device_${uuidv4()}`;
    const apiKey = generateApiKey();
    
    // Create device in Appwrite
    await databases.createDocument(
      'main',
      'devices',
      deviceId,
      {
        name: deviceName || `ESP32 Device ${deviceMac.slice(-6)}`,
        macAddress: deviceMac,
        projectId,
        userId,
        type: deviceType || 'esp32',
        status: 'registered',
        apiKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSeen: null
      }
    );
    
    // Create device in MongoDB
    const device = {
      deviceId,
      name: deviceName || `ESP32 Device ${deviceMac.slice(-6)}`,
      macAddress: deviceMac,
      projectId,
      userId,
      type: deviceType || 'esp32',
      status: 'registered',
      apiKey,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSeen: null,
      config: {
        readingInterval: 300, // 5 minutes in seconds
        alertThresholds: {
          temperature: { min: 20, max: 30 },
          pH: { min: 6.5, max: 8.5 },
          dissolvedOxygen: { min: 5, max: null },
          ammonia: { min: null, max: 0.5 },
          nitrite: { min: null, max: 0.5 },
          nitrate: { min: null, max: 40 },
          ec: { min: 1.0, max: 3.0 },
          lightIntensity: { min: null, max: null },
          humidity: { min: 40, max: 80 }
        }
      }
    };
    
    await mongoDb.collection('devices').insertOne(device);
    
    // Return success response
    return res.json({
      success: true,
      message: 'Device registered successfully',
      device: {
        id: deviceId,
        name: device.name,
        macAddress: deviceMac,
        projectId,
        type: deviceType || 'esp32',
        status: 'registered',
        apiKey
      }
    });
    
  } catch (error) {
    console.error('Error registering device:', error);
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
 * Update existing device
 */
async function updateExistingDevice(deviceId, deviceName, projectId, userId, deviceType) {
  try {
    const updateData = {
      $set: {
        updatedAt: new Date()
      }
    };
    
    if (deviceName) {
      updateData.$set.name = deviceName;
    }
    
    if (projectId) {
      updateData.$set.projectId = projectId;
    }
    
    if (userId) {
      updateData.$set.userId = userId;
    }
    
    if (deviceType) {
      updateData.$set.type = deviceType;
    }
    
    // Update device in MongoDB
    await mongoDb.collection('devices').updateOne(
      { _id: deviceId },
      updateData
    );
    
    // Get updated device
    return await mongoDb.collection('devices').findOne({ _id: deviceId });
  } catch (error) {
    console.error('Error updating device:', error);
    throw error;
  }
}

/**
 * Generate a random API key for the device
 */
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let apiKey = 'aqnx_';
  
  for (let i = 0; i < 32; i++) {
    apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return apiKey;
}