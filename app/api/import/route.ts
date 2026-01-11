import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, fishReadings, plantReadings, plantGrowth } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper function to find column index by various name formats
function findColumnIndex(headers: string[], ...possibleNames: string[]): number {
  for (const name of possibleNames) {
    const idx = headers.findIndex(h =>
      h.includes(name.toLowerCase()) ||
      h.toLowerCase() === name.toLowerCase()
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

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

    // Read and parse CSV (handle BOM encoding)
    let text = await file.text();
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }
    const lines = text.trim().split('\n');

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      );
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const dataRows = lines.slice(1);

    let imported = 0;
    let errors = 0;
    const details: string[] = [];

    if (device[0].deviceType === 'fish') {
      // Fish CSV columns: Timestamp, Water Temperature(°C), EC Values(uS/cm, TDS(mg/L), Turbidity(NTU), Water pH
      const timestampIdx = findColumnIndex(headers, 'timestamp');
      const temperatureIdx = findColumnIndex(headers, 'water temperature', 'temperature');
      const phIdx = findColumnIndex(headers, 'water ph', 'ph');
      const doIdx = findColumnIndex(headers, 'dissolved_oxygen', 'do');
      const turbidityIdx = findColumnIndex(headers, 'turbidity');
      const tdsIdx = findColumnIndex(headers, 'tds');
      const ecIdx = findColumnIndex(headers, 'ec values', 'ec_value', 'ec');

      if (timestampIdx < 0) {
        return NextResponse.json(
          { error: 'Missing required column: timestamp' },
          { status: 400 }
        );
      }

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
            ecValue: ecIdx >= 0 && values[ecIdx] ? values[ecIdx] : null,
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
      // Plant CSV columns: Timestamp, Height of the Plant(cm), Plant Temperature(°C), Humidity(RH), Pressure(Pa)
      const timestampIdx = findColumnIndex(headers, 'timestamp');
      const soilMoistureIdx = findColumnIndex(headers, 'soil_moisture', 'soil moisture');
      const lightLevelIdx = findColumnIndex(headers, 'light_level', 'light level', 'light');
      const temperatureIdx = findColumnIndex(headers, 'plant temperature', 'temperature');
      const humidityIdx = findColumnIndex(headers, 'humidity');
      const heightIdx = findColumnIndex(headers, 'height of the plant', 'height');
      const pressureIdx = findColumnIndex(headers, 'pressure');

      if (timestampIdx < 0) {
        return NextResponse.json(
          { error: 'Missing required column: timestamp' },
          { status: 400 }
        );
      }

      const readings: Array<{
        deviceId: string;
        timestamp: Date;
        soilMoisture: string | null;
        lightLevel: string | null;
        temperature: string | null;
        humidity: string | null;
        pressure: string | null;
        height: string | null;
      }> = [];

      const growthRecords: Array<{
        deviceId: string;
        measuredAt: Date;
        height: string;
        growthRate: string | null;
        daysFromPlanting: number | null;
      }> = [];

      for (let i = 0; i < dataRows.length; i++) {
        const values = dataRows[i].split(',').map((v) => v.trim());

        try {
          const timestamp = new Date(values[timestampIdx]);
          if (isNaN(timestamp.getTime())) {
            throw new Error('Invalid timestamp');
          }

          const heightValue = heightIdx >= 0 && values[heightIdx] ? values[heightIdx] : null;

          readings.push({
            deviceId,
            timestamp,
            soilMoisture: soilMoistureIdx >= 0 && values[soilMoistureIdx] ? values[soilMoistureIdx] : null,
            lightLevel: lightLevelIdx >= 0 && values[lightLevelIdx] ? values[lightLevelIdx] : null,
            temperature: temperatureIdx >= 0 && values[temperatureIdx] ? values[temperatureIdx] : null,
            humidity: humidityIdx >= 0 && values[humidityIdx] ? values[humidityIdx] : null,
            pressure: pressureIdx >= 0 && values[pressureIdx] ? values[pressureIdx] : null,
            height: heightValue,
          });

          // If height is present, prepare growth record
          if (heightValue) {
            growthRecords.push({
              deviceId,
              measuredAt: timestamp,
              height: heightValue,
              growthRate: null, // Will be calculated after sorting
              daysFromPlanting: null, // Will be calculated after sorting
            });
          }

          imported++;
        } catch (err) {
          errors++;
          details.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Invalid data'}`);
        }
      }

      if (readings.length > 0) {
        // Batch insert plant readings in chunks of 100
        const chunkSize = 100;
        for (let i = 0; i < readings.length; i += chunkSize) {
          const chunk = readings.slice(i, i + chunkSize);
          await db.insert(plantReadings).values(chunk);
        }
      }

      // Process growth records if any height data was imported
      if (growthRecords.length > 0) {
        // Sort by timestamp to calculate growth rates
        growthRecords.sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());

        // Calculate growth rates and days from planting
        const plantingDate = growthRecords[0].measuredAt;
        for (let i = 0; i < growthRecords.length; i++) {
          const record = growthRecords[i];

          // Calculate days from planting
          record.daysFromPlanting = Math.floor(
            (record.measuredAt.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Calculate growth rate (cm/day) if not the first record
          if (i > 0) {
            const prevRecord = growthRecords[i - 1];
            const timeDiffDays = (record.measuredAt.getTime() - prevRecord.measuredAt.getTime()) / (1000 * 60 * 60 * 24);
            if (timeDiffDays > 0) {
              const heightDiff = parseFloat(record.height) - parseFloat(prevRecord.height);
              record.growthRate = (heightDiff / timeDiffDays).toFixed(4);
            }
          }
        }

        // Batch insert growth records in chunks of 100
        const growthChunkSize = 100;
        for (let i = 0; i < growthRecords.length; i += growthChunkSize) {
          const chunk = growthRecords.slice(i, i + growthChunkSize);
          await db.insert(plantGrowth).values(chunk);
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
