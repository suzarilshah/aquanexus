const { MongoClient } = require('mongodb');
const sdk = require('node-appwrite');
const axios = require('axios');

// Initialize Appwrite SDK
const client = new sdk.Client();
const databases = new sdk.Databases(client);

// Initialize MongoDB client
let mongoClient = null;
let mongoDb = null;

/**
 * AI Insights Function
 * This function analyzes sensor data and generates insights using Azure AI
 */
module.exports = async function(req, res) {
  // Initialize Appwrite client
  const appwriteEndpoint = process.env.APPWRITE_FUNCTION_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
  const appwriteProject = process.env.APPWRITE_FUNCTION_PROJECT_ID || '687f8e78001ac206db80';
  const appwriteKey = process.env.APPWRITE_FUNCTION_API_KEY;
  const appwriteDatabaseId = process.env.APPWRITE_DATABASE_ID || 'main';
  
  // Azure AI configuration
  const azureAiEndpoint = process.env.AZURE_AI_ENDPOINT || 'https://ai-rail.cognitiveservices.azure.com/openai/deployments/o4-mini/chat/completions?api-version=2025-01-01-preview';
  const azureAiKey = process.env.AZURE_AI_KEY;
  
  client
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProject)
    .setKey(appwriteKey);
  
  // Initialize MongoDB connection
  const mongoUri = process.env.MONGODB_URI;
  const mongoDbName = process.env.MONGODB_DATABASE || 'aquanexus';
  
  try {
    // Parse request data
    const payload = JSON.parse(req.payload || '{}');
    const { projectId, dataType, timeRange } = payload;
    
    if (!projectId || !dataType) {
      return res.json({ success: false, message: 'Project ID and data type are required' }, 400);
    }
    
    // Connect to MongoDB
    await connectToMongoDB(mongoUri, mongoDbName);
    
    // Get sensor data from MongoDB
    const sensorData = await getSensorData(projectId, dataType, timeRange);
    
    if (!sensorData || sensorData.length === 0) {
      return res.json({ success: false, message: 'No sensor data found for analysis' }, 404);
    }
    
    // Generate insights using Azure AI
    const insights = await generateInsights(sensorData, dataType);
    
    // Store insights in MongoDB
    await storeInsights(projectId, dataType, insights);
    
    // Return success response
    return res.json({
      success: true,
      message: 'AI insights generated successfully',
      insights
    });
    
  } catch (error) {
    console.error('Error generating AI insights:', error);
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
 * Get sensor data from MongoDB
 */
async function getSensorData(projectId, dataType, timeRange) {
  try {
    const collection = mongoDb.collection(dataType === 'fish' ? 'fish_readings' : 'plant_readings');
    
    // Build query based on time range
    const query = { projectId };
    
    if (timeRange) {
      const now = new Date();
      let startDate;
      
      switch (timeRange) {
        case 'day':
          startDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 30)); // Default to 30 days
      }
      
      query.timestamp = { $gte: startDate };
    }
    
    // Get data from MongoDB
    return await collection.find(query).sort({ timestamp: -1 }).limit(100).toArray();
  } catch (error) {
    console.error('Error getting sensor data:', error);
    throw error;
  }
}

/**
 * Generate insights using Azure AI
 */
async function generateInsights(sensorData, dataType) {
  try {
    // Prepare data for AI analysis
    const dataForAnalysis = sensorData.map(reading => {
      const { timestamp, ...metrics } = reading;
      return {
        timestamp: new Date(timestamp).toISOString(),
        ...metrics
      };
    });
    
    // Create prompt for Azure AI
    let prompt = '';
    if (dataType === 'fish') {
      prompt = `Analyze the following fish tank sensor data and provide insights on water quality, fish health, and recommendations for improvement. Focus on pH, temperature, dissolved oxygen, and ammonia levels. Data: ${JSON.stringify(dataForAnalysis)}`;
    } else {
      prompt = `Analyze the following hydroponic plant sensor data and provide insights on plant health, nutrient levels, and recommendations for improvement. Focus on pH, EC, temperature, and light levels. Data: ${JSON.stringify(dataForAnalysis)}`;
    }
    
    // Call Azure AI API
    const response = await axios.post(
      process.env.AZURE_AI_ENDPOINT || 'https://ai-rail.cognitiveservices.azure.com/openai/deployments/o4-mini/chat/completions?api-version=2025-01-01-preview',
      {
        messages: [
          { role: 'system', content: 'You are an expert in aquaponics and hydroponics systems. Analyze sensor data and provide actionable insights.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_AI_KEY
        }
      }
    );
    
    // Extract insights from AI response
    const aiResponse = response.data.choices[0].message.content;
    
    // Parse insights into structured format
    const insights = {
      summary: aiResponse.split('\n\n')[0] || aiResponse.substring(0, 200),
      details: aiResponse,
      timestamp: new Date(),
      dataType,
      dataPoints: sensorData.length
    };
    
    return insights;
  } catch (error) {
    console.error('Error generating insights with Azure AI:', error);
    throw error;
  }
}

/**
 * Store insights in MongoDB
 */
async function storeInsights(projectId, dataType, insights) {
  try {
    const collection = mongoDb.collection('ai_insights');
    
    // Add metadata to insights
    const insightsWithMetadata = {
      ...insights,
      projectId,
      createdAt: new Date()
    };
    
    // Insert insights into MongoDB
    return await collection.insertOne(insightsWithMetadata);
  } catch (error) {
    console.error('Error storing insights in MongoDB:', error);
    throw error;
  }
}