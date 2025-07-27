require('dotenv').config();
const { MongoClient } = require('mongodb');

/**
 * Test MongoDB Connection Script
 * This script tests the connection to MongoDB Atlas and verifies required collections
 */
async function testMongoDBConnection() {
  // Get MongoDB connection string from environment variables
  // Note: We're not hardcoding credentials for security reasons
  const mongoUri = process.env.MONGODB_URI;
  const mongoDbName = process.env.MONGODB_DATABASE || 'aquanexus';
  
  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI environment variable is not set');
    console.log('Please check your .env file or environment configuration');
    return false;
  }
  
  console.log('🔄 Testing MongoDB connection...');
  console.log(`🔹 Attempting to connect to database: ${mongoDbName}`);
  
  let client = null;
  
  try {
    // Create MongoDB client
    client = new MongoClient(mongoUri);
    
    // Connect to MongoDB
    await client.connect();
    
    // Get database reference
    const db = client.db(mongoDbName);
    
    // List collections to verify connection
    const collections = await db.listCollections().toArray();
    
    console.log('✅ Successfully connected to MongoDB!');
    console.log(`\n📊 Database: ${mongoDbName}`);
    console.log('Available collections:');
    
    if (collections.length === 0) {
      console.log('   No collections found in the database.');
    } else {
      collections.forEach(collection => {
        console.log(`   - ${collection.name}`);
      });
    }
    
    // Check for specific collections used by AquaNexus
    const requiredCollections = ['fish_readings', 'plant_readings', 'alerts', 'ai_insights', 'devices', 'projects'];
    console.log('\n🔍 Checking for required AquaNexus collections:');
    
    const existingCollections = collections.map(c => c.name);
    requiredCollections.forEach(collectionName => {
      if (existingCollections.includes(collectionName)) {
        console.log(`   ✅ ${collectionName} - Found`);
      } else {
        console.log(`   ❓ ${collectionName} - Not found (will be created when needed)`);
      }
    });
    
    console.log('\n🎉 MongoDB connection test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Please check your connection string and network connectivity.');
    return false;
  } finally {
    // Close MongoDB connection
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

// Run the test
testMongoDBConnection()
  .then(success => {
    if (!success) {
      console.log('\n❌ MongoDB connection test failed.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error running MongoDB connection test:', error);
    process.exit(1);
  });