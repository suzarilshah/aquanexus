import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  try {
    // Parse request body
    const { userId, projectId } = JSON.parse(req.body);

    // Validate required fields
    if (!userId || !projectId) {
      return res.json({
        success: false,
        error: 'Missing required fields: userId, projectId'
      }, 400);
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Create demo devices
    const demoDevices = [
      {
        deviceId: 'demo-fish-001',
        deviceMac: 'AA:BB:CC:DD:EE:01',
        deviceName: 'Demo Fish Tank Monitor',
        deviceType: 'fish',
        projectId,
        userId,
        apiKey: 'demo-api-key-fish',
        status: 'active',
        lastSeen: new Date().toISOString(),
        readingInterval: 300
      },
      {
        deviceId: 'demo-plant-001',
        deviceMac: 'AA:BB:CC:DD:EE:02',
        deviceName: 'Demo Plant Monitor',
        deviceType: 'plant',
        projectId,
        userId,
        apiKey: 'demo-api-key-plant',
        status: 'active',
        lastSeen: new Date().toISOString(),
        readingInterval: 600
      }
    ];

    const createdDevices = [];
    for (const device of demoDevices) {
      try {
        const createdDevice = await databases.createDocument(
          'aquanexus-main',
          'devices',
          ID.unique(),
          device
        );
        createdDevices.push(createdDevice);
        log('Created demo device:', device.deviceName);
      } catch (err) {
        error('Error creating demo device:', err.message);
      }
    }

    // Generate sample fish readings (last 24 hours)
    const fishReadings = [];
    const now = new Date();
    for (let i = 0; i < 48; i++) { // Every 30 minutes for 24 hours
      const timestamp = new Date(now.getTime() - (i * 30 * 60 * 1000));
      
      // Generate realistic fish tank data with some variation
      const baseTemp = 24;
      const basePh = 7.2;
      const baseDo = 6.5;
      const baseTurbidity = 3;
      
      fishReadings.push({
        deviceMac: 'AA:BB:CC:DD:EE:01',
        temperature: baseTemp + (Math.random() - 0.5) * 4, // 22-26°C
        ph: basePh + (Math.random() - 0.5) * 1.5, // 6.45-7.95
        dissolvedOxygen: baseDo + (Math.random() - 0.5) * 2, // 5.5-7.5 mg/L
        turbidity: Math.max(0, baseTurbidity + (Math.random() - 0.5) * 4), // 1-5 NTU
        timestamp: timestamp.toISOString()
      });
    }

    // Generate sample plant readings (last 24 hours)
    const plantReadings = [];
    for (let i = 0; i < 24; i++) { // Every hour for 24 hours
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      
      // Generate realistic plant data with day/night cycles
      const hour = timestamp.getHours();
      const isDaytime = hour >= 6 && hour <= 18;
      
      const baseMoisture = 45;
      const baseLight = isDaytime ? 800 : 50;
      const baseTemp = isDaytime ? 25 : 20;
      const baseHumidity = 60;
      
      plantReadings.push({
        deviceMac: 'AA:BB:CC:DD:EE:02',
        soilMoisture: Math.max(20, baseMoisture + (Math.random() - 0.5) * 20), // 35-55%
        lightLevel: Math.max(0, baseLight + (Math.random() - 0.5) * 200), // Varies by time
        temperature: baseTemp + (Math.random() - 0.5) * 6, // Varies by time
        humidity: baseHumidity + (Math.random() - 0.5) * 20, // 50-70%
        timestamp: timestamp.toISOString()
      });
    }

    // Store fish readings
    let fishReadingsCreated = 0;
    for (const reading of fishReadings) {
      try {
        await databases.createDocument(
          'aquanexus-main',
          'fish_readings',
          ID.unique(),
          reading
        );
        fishReadingsCreated++;
      } catch (err) {
        error('Error creating fish reading:', err.message);
      }
    }

    // Store plant readings
    let plantReadingsCreated = 0;
    for (const reading of plantReadings) {
      try {
        await databases.createDocument(
          'aquanexus-main',
          'plant_readings',
          ID.unique(),
          reading
        );
        plantReadingsCreated++;
      } catch (err) {
        error('Error creating plant reading:', err.message);
      }
    }

    // Create some sample alerts
    const sampleAlerts = [
      {
        deviceMac: 'AA:BB:CC:DD:EE:01',
        alertType: 'temperature',
        severity: 'medium',
        message: 'Fish tank temperature slightly elevated at 26.8°C',
        value: 26.8,
        threshold: 26.0,
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        resolved: true
      },
      {
        deviceMac: 'AA:BB:CC:DD:EE:02',
        alertType: 'soil_moisture',
        severity: 'high',
        message: 'Soil moisture is low at 28% - watering recommended',
        value: 28,
        threshold: 30,
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        resolved: false
      },
      {
        deviceMac: 'AA:BB:CC:DD:EE:01',
        alertType: 'ph',
        severity: 'low',
        message: 'pH levels are optimal at 7.1',
        value: 7.1,
        threshold: 7.0,
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        resolved: true
      }
    ];

    let alertsCreated = 0;
    for (const alert of sampleAlerts) {
      try {
        await databases.createDocument(
          'aquanexus-main',
          'alerts',
          ID.unique(),
          alert
        );
        alertsCreated++;
      } catch (err) {
        error('Error creating sample alert:', err.message);
      }
    }

    log(`Demo account created successfully for user ${userId}`);
    log(`Created: ${createdDevices.length} devices, ${fishReadingsCreated} fish readings, ${plantReadingsCreated} plant readings, ${alertsCreated} alerts`);

    return res.json({
      success: true,
      message: 'Demo account created successfully',
      summary: {
        devicesCreated: createdDevices.length,
        fishReadingsCreated,
        plantReadingsCreated,
        alertsCreated,
        devices: createdDevices.map(d => ({
          id: d.$id,
          name: d.deviceName,
          type: d.deviceType,
          mac: d.deviceMac
        }))
      }
    });

  } catch (err) {
    error('Error creating demo account:', err.message);
    return res.json({
      success: false,
      error: 'Internal server error while creating demo account'
    }, 500);
  }
};