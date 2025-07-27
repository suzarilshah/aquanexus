import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  try {
    // Parse request body
    const requestBody = JSON.parse(req.body);
    
    // Handle different payload formats
    let deviceMac, deviceType, sensorData, timestamp, apiKey, isHeartbeat = false;
    
    // Check if it's a heartbeat message
    if (requestBody.type === 'heartbeat') {
      deviceMac = requestBody.deviceMac;
      apiKey = requestBody.apiKey;
      timestamp = requestBody.timestamp;
      isHeartbeat = true;
      log('Received heartbeat from device:', deviceMac);
    }
    // Check if it's ESP32 format (with readings array)
    else if (requestBody.readings && requestBody.deviceMac && requestBody.readingType) {
      deviceMac = requestBody.deviceMac;
      deviceType = requestBody.readingType;
      apiKey = requestBody.apiKey;
      
      // Convert readings array to sensorData object
      sensorData = {};
      for (const reading of requestBody.readings) {
        sensorData[reading.type] = reading.value;
        if (!timestamp) timestamp = reading.timestamp;
      }
    } else {
      // Legacy format
      ({ deviceMac, deviceType, sensorData, timestamp } = requestBody);
    }

    // Validate required fields
    if (!deviceMac) {
      return res.json({
        success: false,
        error: 'Missing required field: deviceMac'
      }, 400);
    }
    
    // For non-heartbeat messages, validate sensor data
    if (!isHeartbeat && (!deviceType || !sensorData)) {
      return res.json({
        success: false,
        error: 'Missing required fields: deviceType, sensorData'
      }, 400);
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Verify device exists and authenticate
    let deviceDoc;
    try {
      const deviceQuery = await databases.listDocuments(
        'aquanexus-main',
        'devices',
        [
          `deviceMac=${deviceMac}`
        ]
      );

      if (deviceQuery.documents.length === 0) {
        return res.json({
          success: false,
          error: 'Device not found'
        }, 404);
      }

      deviceDoc = deviceQuery.documents[0];
      
      // Authenticate device using API key (if provided)
      if (apiKey && deviceDoc.apiKey !== apiKey) {
        return res.json({
          success: false,
          error: 'Invalid API key'
        }, 401);
      }

      // Update device last seen and status
      await databases.updateDocument(
        'aquanexus-main',
        'devices',
        deviceDoc.$id,
        {
          lastSeen: new Date().toISOString(),
          status: 'active'
        }
      );
    } catch (err) {
      error('Error updating device:', err.message);
      return res.json({
        success: false,
        error: 'Device verification failed'
      }, 500);
    }

    let readingDoc = null;
    
    // Process sensor data only if it's not a heartbeat
    if (!isHeartbeat) {
      // Determine collection based on device type
      let collectionId;
      let dataDocument = {
        deviceMac,
        timestamp: timestamp || new Date().toISOString()
      };

      if (deviceType === 'fish') {
        collectionId = 'fish_readings';
        // Add fish-specific sensor data
        if (sensorData.temperature !== undefined) dataDocument.temperature = sensorData.temperature;
        if (sensorData.ph !== undefined) dataDocument.ph = sensorData.ph;
        if (sensorData.dissolvedOxygen !== undefined) dataDocument.dissolvedOxygen = sensorData.dissolvedOxygen;
        if (sensorData.turbidity !== undefined) dataDocument.turbidity = sensorData.turbidity;
      } else if (deviceType === 'plant') {
        collectionId = 'plant_readings';
        // Add plant-specific sensor data
        if (sensorData.soilMoisture !== undefined) dataDocument.soilMoisture = sensorData.soilMoisture;
        if (sensorData.lightLevel !== undefined) dataDocument.lightLevel = sensorData.lightLevel;
        if (sensorData.temperature !== undefined) dataDocument.temperature = sensorData.temperature;
        if (sensorData.humidity !== undefined) dataDocument.humidity = sensorData.humidity;
      } else {
        return res.json({
          success: false,
          error: 'Invalid device type. Must be "fish" or "plant"'
        }, 400);
      }

      // Store sensor reading
      readingDoc = await databases.createDocument(
        'aquanexus-main',
        collectionId,
        ID.unique(),
        dataDocument
      );

      // Check for alerts based on sensor values
      await checkAndCreateAlerts(databases, deviceMac, deviceType, sensorData, log, error);

      log('Sensor data ingested successfully:', readingDoc.$id);
    } else {
      log('Heartbeat processed successfully for device:', deviceMac);
    }

    // Prepare response with configuration updates
    const response = {
      success: true,
      message: isHeartbeat ? 'Heartbeat received successfully' : 'Sensor data ingested successfully'
    };
    
    // Include reading ID for sensor data
    if (readingDoc) {
      response.readingId = readingDoc.$id;
    }
    
    // Include device configuration if available
    if (deviceDoc && deviceDoc.readingInterval) {
      response.config = {
        reading_interval: deviceDoc.readingInterval
      };
    }
    
    return res.json(response);

  } catch (err) {
    error('Error ingesting sensor data:', err.message);
    return res.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
};

// Helper function to check sensor values and create alerts
async function checkAndCreateAlerts(databases, deviceMac, deviceType, sensorData, log, error) {
  try {
    const alerts = [];
    const timestamp = new Date().toISOString();

    if (deviceType === 'fish') {
      // Fish environment thresholds
      if (sensorData.temperature !== undefined) {
        if (sensorData.temperature < 20 || sensorData.temperature > 28) {
          alerts.push({
            deviceMac,
            alertType: 'temperature',
            severity: sensorData.temperature < 15 || sensorData.temperature > 32 ? 'critical' : 'high',
            message: `Fish tank temperature is ${sensorData.temperature}°C (optimal: 20-28°C)`,
            value: sensorData.temperature,
            threshold: sensorData.temperature < 20 ? 20 : 28,
            timestamp,
            resolved: false
          });
        }
      }

      if (sensorData.ph !== undefined) {
        if (sensorData.ph < 6.5 || sensorData.ph > 8.5) {
          alerts.push({
            deviceMac,
            alertType: 'ph',
            severity: sensorData.ph < 6.0 || sensorData.ph > 9.0 ? 'critical' : 'high',
            message: `Fish tank pH is ${sensorData.ph} (optimal: 6.5-8.5)`,
            value: sensorData.ph,
            threshold: sensorData.ph < 6.5 ? 6.5 : 8.5,
            timestamp,
            resolved: false
          });
        }
      }

      if (sensorData.dissolvedOxygen !== undefined) {
        if (sensorData.dissolvedOxygen < 5.0) {
          alerts.push({
            deviceMac,
            alertType: 'dissolved_oxygen',
            severity: sensorData.dissolvedOxygen < 3.0 ? 'critical' : 'high',
            message: `Fish tank dissolved oxygen is ${sensorData.dissolvedOxygen} mg/L (minimum: 5.0 mg/L)`,
            value: sensorData.dissolvedOxygen,
            threshold: 5.0,
            timestamp,
            resolved: false
          });
        }
      }

      if (sensorData.turbidity !== undefined) {
        if (sensorData.turbidity > 10) {
          alerts.push({
            deviceMac,
            alertType: 'turbidity',
            severity: sensorData.turbidity > 20 ? 'critical' : 'medium',
            message: `Fish tank turbidity is ${sensorData.turbidity} NTU (maximum: 10 NTU)`,
            value: sensorData.turbidity,
            threshold: 10,
            timestamp,
            resolved: false
          });
        }
      }
    } else if (deviceType === 'plant') {
      // Plant environment thresholds
      if (sensorData.soilMoisture !== undefined) {
        if (sensorData.soilMoisture < 30) {
          alerts.push({
            deviceMac,
            alertType: 'soil_moisture',
            severity: sensorData.soilMoisture < 20 ? 'high' : 'medium',
            message: `Soil moisture is ${sensorData.soilMoisture}% (minimum: 30%)`,
            value: sensorData.soilMoisture,
            threshold: 30,
            timestamp,
            resolved: false
          });
        }
      }

      if (sensorData.lightLevel !== undefined) {
        if (sensorData.lightLevel < 200) {
          alerts.push({
            deviceMac,
            alertType: 'light_level',
            severity: sensorData.lightLevel < 100 ? 'high' : 'medium',
            message: `Light level is ${sensorData.lightLevel} lux (minimum: 200 lux)`,
            value: sensorData.lightLevel,
            threshold: 200,
            timestamp,
            resolved: false
          });
        }
      }

      if (sensorData.temperature !== undefined) {
        if (sensorData.temperature < 18 || sensorData.temperature > 30) {
          alerts.push({
            deviceMac,
            alertType: 'temperature',
            severity: sensorData.temperature < 10 || sensorData.temperature > 35 ? 'critical' : 'medium',
            message: `Plant environment temperature is ${sensorData.temperature}°C (optimal: 18-30°C)`,
            value: sensorData.temperature,
            threshold: sensorData.temperature < 18 ? 18 : 30,
            timestamp,
            resolved: false
          });
        }
      }

      if (sensorData.humidity !== undefined) {
        if (sensorData.humidity < 40 || sensorData.humidity > 80) {
          alerts.push({
            deviceMac,
            alertType: 'humidity',
            severity: sensorData.humidity < 30 || sensorData.humidity > 90 ? 'high' : 'medium',
            message: `Plant environment humidity is ${sensorData.humidity}% (optimal: 40-80%)`,
            value: sensorData.humidity,
            threshold: sensorData.humidity < 40 ? 40 : 80,
            timestamp,
            resolved: false
          });
        }
      }
    }

    // Create alert documents
    for (const alert of alerts) {
      try {
        await databases.createDocument(
          'aquanexus-main',
          'alerts',
          ID.unique(),
          alert
        );
        log('Alert created:', alert.alertType, alert.severity);
      } catch (err) {
        error('Error creating alert:', err.message);
      }
    }
  } catch (err) {
    error('Error in alert checking:', err.message);
  }
}