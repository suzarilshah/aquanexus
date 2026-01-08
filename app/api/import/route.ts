import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, fishReadings, plantReadings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const deviceId = formData.get('deviceId') as string;

    if (!file || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, deviceId' },
        { status: 400 }
      );
    }

    // Verify device ownership
    const device = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.userId, session.userId)))
      .limit(1);

    if (device.length === 0) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Read and parse CSV
    const text = await file.text();
    const lines = text.trim().split('\n');

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      );
    }

    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const dataRows = lines.slice(1);

    let imported = 0;
    let errors = 0;
    const details: string[] = [];

    if (device[0].deviceType === 'fish') {
      // Expected columns: timestamp, temperature, ph, dissolved_oxygen, turbidity, tds
      const requiredColumns = ['timestamp'];
      const missingColumns = requiredColumns.filter((c) => !headers.includes(c));

      if (missingColumns.length > 0) {
        return NextResponse.json(
          { error: `Missing required columns: ${missingColumns.join(', ')}` },
          { status: 400 }
        );
      }

      const timestampIdx = headers.indexOf('timestamp');
      const temperatureIdx = headers.indexOf('temperature');
      const phIdx = headers.indexOf('ph');
      const doIdx = headers.indexOf('dissolved_oxygen');
      const turbidityIdx = headers.indexOf('turbidity');
      const tdsIdx = headers.indexOf('tds');

      const readings = [];

      for (let i = 0; i < dataRows.length; i++) {
        const values = dataRows[i].split(',').map((v) => v.trim());

        try {
          const timestamp = new Date(values[timestampIdx]);
          if (isNaN(timestamp.getTime())) {
            throw new Error('Invalid timestamp');
          }

          readings.push({
            deviceId,
            timestamp,
            temperature: temperatureIdx >= 0 && values[temperatureIdx] ? values[temperatureIdx] : null,
            ph: phIdx >= 0 && values[phIdx] ? values[phIdx] : null,
            dissolvedOxygen: doIdx >= 0 && values[doIdx] ? values[doIdx] : null,
            turbidity: turbidityIdx >= 0 && values[turbidityIdx] ? values[turbidityIdx] : null,
            tds: tdsIdx >= 0 && values[tdsIdx] ? values[tdsIdx] : null,
          });

          imported++;
        } catch (err) {
          errors++;
          details.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Invalid data'}`);
        }
      }

      if (readings.length > 0) {
        // Batch insert in chunks of 100
        const chunkSize = 100;
        for (let i = 0; i < readings.length; i += chunkSize) {
          const chunk = readings.slice(i, i + chunkSize);
          await db.insert(fishReadings).values(chunk);
        }
      }
    } else {
      // Plant device: timestamp, soil_moisture, light_level, temperature, humidity
      const requiredColumns = ['timestamp'];
      const missingColumns = requiredColumns.filter((c) => !headers.includes(c));

      if (missingColumns.length > 0) {
        return NextResponse.json(
          { error: `Missing required columns: ${missingColumns.join(', ')}` },
          { status: 400 }
        );
      }

      const timestampIdx = headers.indexOf('timestamp');
      const soilMoistureIdx = headers.indexOf('soil_moisture');
      const lightLevelIdx = headers.indexOf('light_level');
      const temperatureIdx = headers.indexOf('temperature');
      const humidityIdx = headers.indexOf('humidity');

      const readings = [];

      for (let i = 0; i < dataRows.length; i++) {
        const values = dataRows[i].split(',').map((v) => v.trim());

        try {
          const timestamp = new Date(values[timestampIdx]);
          if (isNaN(timestamp.getTime())) {
            throw new Error('Invalid timestamp');
          }

          readings.push({
            deviceId,
            timestamp,
            soilMoisture: soilMoistureIdx >= 0 && values[soilMoistureIdx] ? values[soilMoistureIdx] : null,
            lightLevel: lightLevelIdx >= 0 && values[lightLevelIdx] ? values[lightLevelIdx] : null,
            temperature: temperatureIdx >= 0 && values[temperatureIdx] ? values[temperatureIdx] : null,
            humidity: humidityIdx >= 0 && values[humidityIdx] ? values[humidityIdx] : null,
          });

          imported++;
        } catch (err) {
          errors++;
          details.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Invalid data'}`);
        }
      }

      if (readings.length > 0) {
        // Batch insert in chunks of 100
        const chunkSize = 100;
        for (let i = 0; i < readings.length; i += chunkSize) {
          const chunk = readings.slice(i, i + chunkSize);
          await db.insert(plantReadings).values(chunk);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed successfully`,
      imported,
      errors,
      details: details.length > 0 ? details : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
