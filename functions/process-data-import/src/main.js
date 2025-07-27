import { Client, Databases, Storage, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  try {
    // Parse request body
    const { fileId, deviceMac, deviceType, userId } = JSON.parse(req.body);

    // Validate required fields
    if (!fileId || !deviceMac || !deviceType || !userId) {
      return res.json({
        success: false,
        error: 'Missing required fields: fileId, deviceMac, deviceType, userId'
      }, 400);
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const storage = new Storage(client);

    // Download and read the CSV file
    const file = await storage.getFileDownload('data-imports', fileId);
    const csvContent = Buffer.from(file).toString('utf-8');
    
    // Parse CSV content
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return res.json({
        success: false,
        error: 'CSV file must contain at least a header and one data row'
      }, 400);
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dataRows = lines.slice(1);

    // Validate CSV structure based on device type
    let requiredFields, optionalFields, collectionId;
    
    if (deviceType === 'fish') {
      requiredFields = ['timestamp'];
      optionalFields = ['temperature', 'ph', 'dissolved_oxygen', 'turbidity'];
      collectionId = 'fish_readings';
    } else if (deviceType === 'plant') {
      requiredFields = ['timestamp'];
      optionalFields = ['soil_moisture', 'light_level', 'temperature', 'humidity'];
      collectionId = 'plant_readings';
    } else {
      return res.json({
        success: false,
        error: 'Invalid device type. Must be "fish" or "plant"'
      }, 400);
    }

    // Check if required fields are present
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    if (missingFields.length > 0) {
      return res.json({
        success: false,
        error: `Missing required CSV columns: ${missingFields.join(', ')}`
      }, 400);
    }

    // Process each data row
    const processedRecords = [];
    const errors = [];
    let successCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const values = dataRows[i].split(',').map(v => v.trim());
        
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 2}: Column count mismatch`);
          continue;
        }

        // Create document object
        const document = {
          deviceMac
        };

        // Process each column
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          const value = values[j];

          if (value === '' || value === null || value === undefined) {
            continue; // Skip empty values
          }

          if (header === 'timestamp') {
            // Parse timestamp
            const timestamp = new Date(value);
            if (isNaN(timestamp.getTime())) {
              errors.push(`Row ${i + 2}: Invalid timestamp format`);
              continue;
            }
            document.timestamp = timestamp.toISOString();
          } else if (optionalFields.includes(header)) {
            // Parse numeric values
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
              errors.push(`Row ${i + 2}: Invalid numeric value for ${header}`);
              continue;
            }
            
            // Map CSV column names to database field names
            const fieldMapping = {
              'dissolved_oxygen': 'dissolvedOxygen',
              'soil_moisture': 'soilMoisture',
              'light_level': 'lightLevel'
            };
            
            const fieldName = fieldMapping[header] || header;
            document[fieldName] = numValue;
          }
        }

        // Ensure timestamp is present
        if (!document.timestamp) {
          errors.push(`Row ${i + 2}: Missing or invalid timestamp`);
          continue;
        }

        // Store the document
        const createdDoc = await databases.createDocument(
          'aquanexus-main',
          collectionId,
          ID.unique(),
          document
        );

        processedRecords.push(createdDoc.$id);
        successCount++;

      } catch (err) {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    // Clean up the uploaded file
    try {
      await storage.deleteFile('data-imports', fileId);
    } catch (err) {
      log('Warning: Could not delete uploaded file:', err.message);
    }

    log(`Data import completed: ${successCount} records processed, ${errors.length} errors`);

    return res.json({
      success: true,
      message: `Data import completed successfully`,
      summary: {
        totalRows: dataRows.length,
        successCount,
        errorCount: errors.length,
        processedRecords: processedRecords.length
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Limit errors to first 10
    });

  } catch (err) {
    error('Error processing data import:', err.message);
    return res.json({
      success: false,
      error: 'Internal server error during data import'
    }, 500);
  }
};