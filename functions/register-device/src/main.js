import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  try {
    // Parse request body
    const { deviceId, deviceMac, deviceName, deviceType, projectId, userId, apiKey } = JSON.parse(req.body);

    // Validate required fields
    if (!deviceId || !deviceMac || !deviceName || !deviceType || !projectId || !userId || !apiKey) {
      return res.json({
        success: false,
        error: 'Missing required fields'
      }, 400);
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Check if device already exists
    try {
      const existingDevice = await databases.listDocuments(
        'aquanexus-main',
        'devices',
        [
          `deviceMac=${deviceMac}`
        ]
      );

      if (existingDevice.documents.length > 0) {
        return res.json({
          success: false,
          error: 'Device with this MAC address already exists'
        }, 409);
      }
    } catch (err) {
      log('Error checking existing device:', err.message);
    }

    // Create device document
    const deviceDoc = await databases.createDocument(
      'aquanexus-main',
      'devices',
      ID.unique(),
      {
        deviceId,
        deviceMac,
        deviceName,
        deviceType,
        projectId,
        userId,
        apiKey,
        status: 'active',
        lastSeen: new Date().toISOString(),
        readingInterval: 300 // Default 5 minutes
      }
    );

    log('Device registered successfully:', deviceDoc.$id);

    return res.json({
      success: true,
      deviceId: deviceDoc.$id,
      message: 'Device registered successfully'
    });

  } catch (err) {
    error('Error registering device:', err.message);
    return res.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
};