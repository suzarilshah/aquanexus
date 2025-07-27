const { MongoClient } = require('mongodb');
const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Appwrite SDK
const client = new sdk.Client();
const users = new sdk.Users(client);
const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);

// Initialize MongoDB client
let mongoClient = null;
let mongoDb = null;

/**
 * Create Demo Account Function
 * This function creates a demo account with pre-populated data
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
    const { email, password, name } = payload;
    
    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required' }, 400);
    }
    
    // Connect to MongoDB
    await connectToMongoDB(mongoUri, mongoDbName);
    
    // Create user in Appwrite
    const userId = `demo_${uuidv4()}`;
    const user = await users.create(userId, email, password, name || 'Demo User');
    
    // Create demo project
    const projectId = await createDemoProject(userId);
    
    // Load and process demo data
    await loadDemoData(projectId);
    
    // Create session token for auto-login
    const token = await users.createToken(userId);
    
    // Return success response
    return res.json({
      success: true,
      message: 'Demo account created successfully',
      user: {
        id: user.$id,
        email: user.email,
        name: user.name
      },
      token: token.token,
      secret: token.secret,
      projectId
    });
    
  } catch (error) {
    console.error('Error creating demo account:', error);
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
 * Create a demo project for the user
 */
async function createDemoProject(userId) {
  try {
    // Create project in Appwrite
    const projectId = `demo_${uuidv4()}`;
    await databases.createDocument(
      'main',
      'projects',
      projectId,
      {
        name: 'Demo Aquaponics System',
        description: 'A pre-populated demo system with 3 months of fish and plant data',
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        type: 'aquaponics',
        location: 'Demo Location',
        isDemo: true
      }
    );
    
    // Create project in MongoDB
    await mongoDb.collection('projects').insertOne({
      projectId,
      name: 'Demo Aquaponics System',
      description: 'A pre-populated demo system with 3 months of fish and plant data',
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      type: 'aquaponics',
      location: 'Demo Location',
      isDemo: true
    });
    
    return projectId;
  } catch (error) {
    console.error('Error creating demo project:', error);
    throw error;
  }
}

/**
 * Load demo data from CSV files and store in MongoDB
 */
async function loadDemoData(projectId) {
  try {
    // Load fish data
    const fishInitialData = await loadCsvFile('fish_initial.csv');
    const fishValidateData = await loadCsvFile('fish_validate.csv');
    
    // Load plant data
    const plantInitialData = await loadCsvFile('plant_initial.csv');
    const plantValidateData = await loadCsvFile('plant_validate.csv');
    
    // Process and store fish data
    await processFishData(projectId, [...fishInitialData, ...fishValidateData]);
    
    // Process and store plant data
    await processPlantData(projectId, [...plantInitialData, ...plantValidateData]);
    
    console.log('Demo data loaded successfully');
  } catch (error) {
    console.error('Error loading demo data:', error);
    throw error;
  }
}

/**
 * Load CSV file from storage
 */
async function loadCsvFile(filename) {
  try {
    // Get file from storage
    const fileList = await storage.listFiles('demo-data');
    const file = fileList.files.find(f => f.name === filename);
    
    if (!file) {
      throw new Error(`Demo data file not found: ${filename}`);
    }
    
    const fileContent = await storage.getFileDownload('demo-data', file.$id);
    const csvString = Buffer.from(fileContent).toString('utf-8');
    
    // Parse CSV content
    const lines = csvString.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(value => value.trim());
      const record = {};
      
      headers.forEach((header, index) => {
        // Convert numeric values
        const value = values[index];
        record[header] = isNaN(value) ? value : parseFloat(value);
      });
      
      data.push(record);
    }
    
    return data;
  } catch (error) {
    console.error(`Error loading CSV file ${filename}:`, error);
    throw error;
  }
}

/**
 * Process and store fish data
 */
async function processFishData(projectId, data) {
  try {
    // Transform data for MongoDB
    const fishReadings = data.map(record => ({
      projectId,
      timestamp: new Date(record.timestamp || new Date()),
      temperature: record.temperature,
      pH: record.pH,
      dissolvedOxygen: record.dissolvedOxygen,
      ammonia: record.ammonia,
      nitrite: record.nitrite,
      nitrate: record.nitrate,
      source: 'demo',
      createdAt: new Date()
    }));
    
    // Store in MongoDB
    if (fishReadings.length > 0) {
      await mongoDb.collection('fish_readings').insertMany(fishReadings);
      console.log(`Inserted ${fishReadings.length} fish readings`);
    }
  } catch (error) {
    console.error('Error processing fish data:', error);
    throw error;
  }
}

/**
 * Process and store plant data
 */
async function processPlantData(projectId, data) {
  try {
    // Transform data for MongoDB
    const plantReadings = data.map(record => ({
      projectId,
      timestamp: new Date(record.timestamp || new Date()),
      temperature: record.temperature,
      pH: record.pH,
      ec: record.ec,
      lightIntensity: record.lightIntensity,
      humidity: record.humidity,
      nutrientLevel: record.nutrientLevel,
      source: 'demo',
      createdAt: new Date()
    }));
    
    // Store in MongoDB
    if (plantReadings.length > 0) {
      await mongoDb.collection('plant_readings').insertMany(plantReadings);
      console.log(`Inserted ${plantReadings.length} plant readings`);
    }
  } catch (error) {
    console.error('Error processing plant data:', error);
    throw error;
  }
}