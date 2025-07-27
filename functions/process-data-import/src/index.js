const { MongoClient } = require('mongodb');
const sdk = require('node-appwrite');

// Initialize Appwrite SDK
const client = new sdk.Client();
const databases = new sdk.Databases(client);

// Initialize MongoDB client
let mongoClient = null;
let mongoDb = null;

/**
 * Process data import function
 * This function processes CSV or JSON data uploads and stores them in MongoDB
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
    const { fileId, format } = payload;
    
    if (!fileId) {
      return res.json({ success: false, message: 'File ID is required' }, 400);
    }
    
    // Connect to MongoDB
    await connectToMongoDB(mongoUri, mongoDbName);
    
    // Process the file based on format
    let processedData;
    if (format === 'csv') {
      processedData = await processCsvFile(fileId);
    } else if (format === 'json') {
      processedData = await processJsonFile(fileId);
    } else {
      return res.json({ success: false, message: 'Unsupported format' }, 400);
    }
    
    // Store processed data in MongoDB
    const result = await storeDataInMongoDB(processedData, format);
    
    // Return success response
    return res.json({
      success: true,
      message: 'Data import processed successfully',
      recordsProcessed: result.insertedCount || result.length,
      data: processedData.slice(0, 5) // Return first 5 records as sample
    });
    
  } catch (error) {
    console.error('Error processing data import:', error);
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
 * Process CSV file from Appwrite Storage
 */
async function processCsvFile(fileId) {
  try {
    // Get file from Appwrite Storage
    const storage = new sdk.Storage(client);
    const fileContent = await storage.getFileDownload('data-imports', fileId);
    
    // Parse CSV content
    const csvString = Buffer.from(fileContent).toString('utf-8');
    const lines = csvString.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(value => value.trim());
      const record = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      
      data.push(record);
    }
    
    return data;
  } catch (error) {
    console.error('Error processing CSV file:', error);
    throw error;
  }
}

/**
 * Process JSON file from Appwrite Storage
 */
async function processJsonFile(fileId) {
  try {
    // Get file from Appwrite Storage
    const storage = new sdk.Storage(client);
    const fileContent = await storage.getFileDownload('data-imports', fileId);
    
    // Parse JSON content
    const jsonString = Buffer.from(fileContent).toString('utf-8');
    const data = JSON.parse(jsonString);
    
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error('Error processing JSON file:', error);
    throw error;
  }
}

/**
 * Store processed data in MongoDB
 */
async function storeDataInMongoDB(data, format) {
  try {
    const collectionName = format === 'csv' ? 'csv_imports' : 'json_imports';
    const collection = mongoDb.collection(collectionName);
    
    // Add metadata to each record
    const dataWithMetadata = data.map(record => ({
      ...record,
      importedAt: new Date(),
      source: format
    }));
    
    // Insert data into MongoDB
    if (dataWithMetadata.length > 0) {
      return await collection.insertMany(dataWithMetadata);
    }
    
    return { insertedCount: 0 };
  } catch (error) {
    console.error('Error storing data in MongoDB:', error);
    throw error;
  }
}