import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, fishReadings, plantReadings, alerts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sensorUpdateEmitter } from '@/lib/realtime';

interface SensorReading {
  type: string;
  value: number;
  unit: string;
  timestamp: string;
}

interface TelemetryPayload {
  apiKey: string;
  deviceMac: string;
  readingType: 'fish' | 'plant' | 'heartbeat';
  readings?: SensorReading[];
  timestamp?: string;
  status?: string;
}

// Define thresholds for alerts
const THRESHOLDS = {
  fish: {
    temperature: { min: 20, max: 30, critical: { min: 18, max: 32 } },
    ph: { min: 6.5, max: 8.0, critical: { min: 6.0, max: 8.5 } },
    dissolvedOxygen: { min: 5, max: 12, critical: { min: 4, max: 15 } },
    turbidity: { min: 0, max: 5, critical: { min: 0, max: 10 } },
  },
  plant: {
    soilMoisture: { min: 30, max: 70, critical: { min: 20, max: 80 } },
    lightLevel: { min: 1000, max: 50000, critical: { min: 500, max: 60000 } },
    temperature: { min: 18, max: 30, critical: { min: 15, max: 35 } },
    humidity: { min: 40, max: 80, critical: { min: 30, max: 90 } },
  },
};

function checkThreshold(
  value: number,
  type: keyof typeof THRESHOLDS.fish | keyof typeof THRESHOLDS.plant,
  deviceType: 'fish' | 'plant'
): { severity: 'low' | 'medium' | 'high' | 'critical'; message: string } | null {
  const thresholds = THRESHOLDS[deviceType][type as keyof (typeof THRESHOLDS)[typeof deviceType]];
  if (!thresholds) return null;

  if (value < thresholds.critical.min || value > thresholds.critical.max) {
    return {
      severity: 'critical',
      message: `${type} is at critical level: ${value}`,
    };
  }
  if (value < thresholds.min || value > thresholds.max) {
    return {
      severity: 'high',
      message: `${type} is out of optimal range: ${value}`,
    };
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const payload: TelemetryPayload = await request.json();

    const { apiKey, deviceMac, readingType, readings, timestamp, status } = payload;

    // Validate required fields
    if (!apiKey || !deviceMac) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, deviceMac' },
        { status: 400 }
      );
    }

    // Verify device exists and API key matches
    const device = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceMac, deviceMac))
      .limit(1);

    if (device.length === 0) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    if (device[0].apiKey !== apiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Handle heartbeat
    if (readingType === 'heartbeat') {
      await db
        .update(devices)
        .set({
          status: 'online',
          lastSeen: new Date(),
        })
        .where(eq(devices.id, device[0].id));

      // Emit SSE update
      sensorUpdateEmitter.emit({
        type: 'heartbeat',
        deviceId: device[0].id,
        deviceMac,
        timestamp: timestamp || new Date().toISOString(),
        status: status || 'online',
      });

      return NextResponse.json({
        success: true,
        message: 'Heartbeat received',
      });
    }

    // Process sensor readings
    if (!readings || readings.length === 0) {
      return NextResponse.json(
        { error: 'No readings provided' },
        { status: 400 }
      );
    }

    const alertsToCreate: Array<{
      deviceId: string;
      alertType: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      value: number;
    }> = [];

    if (readingType === 'fish') {
      // Parse fish readings
      const fishData: Record<string, number> = {};
      readings.forEach((reading) => {
        switch (reading.type) {
          case 'temperature':
            fishData.temperature = reading.value;
            break;
          case 'ph':
            fishData.ph = reading.value;
            break;
          case 'dissolved_oxygen':
          case 'dissolvedOxygen':
            fishData.dissolvedOxygen = reading.value;
            break;
          case 'turbidity':
            fishData.turbidity = reading.value;
            break;
          case 'tds':
            fishData.tds = reading.value;
            break;
        }
      });

      // Insert fish reading
      await db.insert(fishReadings).values({
        deviceId: device[0].id,
        temperature: fishData.temperature?.toString(),
        ph: fishData.ph?.toString(),
        dissolvedOxygen: fishData.dissolvedOxygen?.toString(),
        turbidity: fishData.turbidity?.toString(),
        tds: fishData.tds?.toString(),
        timestamp: new Date(),
      });

      // Check thresholds
      Object.entries(fishData).forEach(([key, value]) => {
        const alert = checkThreshold(value, key as keyof typeof THRESHOLDS.fish, 'fish');
        if (alert) {
          alertsToCreate.push({
            deviceId: device[0].id,
            alertType: key,
            severity: alert.severity,
            message: alert.message,
            value,
          });
        }
      });

      // Emit SSE update with fish data
      sensorUpdateEmitter.emit({
        type: 'fish_reading',
        deviceId: device[0].id,
        deviceMac,
        data: fishData,
        timestamp: new Date().toISOString(),
      });

    } else if (readingType === 'plant') {
      // Parse plant readings
      const plantData: Record<string, number> = {};
      readings.forEach((reading) => {
        switch (reading.type) {
          case 'soil_moisture':
          case 'soilMoisture':
            plantData.soilMoisture = reading.value;
            break;
          case 'light_level':
          case 'lightLevel':
            plantData.lightLevel = reading.value;
            break;
          case 'temperature':
            plantData.temperature = reading.value;
            break;
          case 'humidity':
            plantData.humidity = reading.value;
            break;
        }
      });

      // Insert plant reading
      await db.insert(plantReadings).values({
        deviceId: device[0].id,
        soilMoisture: plantData.soilMoisture?.toString(),
        lightLevel: plantData.lightLevel?.toString(),
        temperature: plantData.temperature?.toString(),
        humidity: plantData.humidity?.toString(),
        timestamp: new Date(),
      });

      // Check thresholds
      Object.entries(plantData).forEach(([key, value]) => {
        const alert = checkThreshold(value, key as keyof typeof THRESHOLDS.plant, 'plant');
        if (alert) {
          alertsToCreate.push({
            deviceId: device[0].id,
            alertType: key,
            severity: alert.severity,
            message: alert.message,
            value,
          });
        }
      });

      // Emit SSE update with plant data
      sensorUpdateEmitter.emit({
        type: 'plant_reading',
        deviceId: device[0].id,
        deviceMac,
        data: plantData,
        timestamp: new Date().toISOString(),
      });
    }

    // Create alerts if any
    if (alertsToCreate.length > 0) {
      await db.insert(alerts).values(
        alertsToCreate.map((a) => ({
          deviceId: a.deviceId,
          alertType: a.alertType,
          severity: a.severity,
          message: a.message,
          value: a.value.toString(),
        }))
      );

      // Emit alerts via SSE
      alertsToCreate.forEach((alert) => {
        sensorUpdateEmitter.emit({
          type: 'alert',
          deviceId: alert.deviceId,
          alert,
          timestamp: new Date().toISOString(),
        });
      });
    }

    // Update device last seen
    await db
      .update(devices)
      .set({
        status: 'online',
        lastSeen: new Date(),
      })
      .where(eq(devices.id, device[0].id));

    return NextResponse.json({
      success: true,
      message: `${readings.length} readings processed`,
      alerts: alertsToCreate.length,
    });
  } catch (error) {
    console.error('Telemetry error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
