import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, fishReadings, plantReadings, plantGrowth, alerts } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
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

// Define thresholds for alerts (only for parameters in the CSV dataset)
const THRESHOLDS = {
  fish: {
    temperature: { min: 22, max: 28, critical: { min: 18, max: 32 } },
    ph: { min: 6.5, max: 8.0, critical: { min: 6.0, max: 8.5 } },
    ecValue: { min: 200, max: 800, critical: { min: 100, max: 1000 } },
    turbidity: { min: 0, max: 20, critical: { min: 0, max: 30 } },
    tds: { min: 100, max: 500, critical: { min: 50, max: 700 } },
  },
  plant: {
    temperature: { min: 18, max: 32, critical: { min: 15, max: 35 } },
    humidity: { min: 40, max: 80, critical: { min: 30, max: 90 } },
    pressure: { min: 95000, max: 105000, critical: { min: 90000, max: 110000 } },
    // height has no threshold - it's a measurement, not a health indicator
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
      // Parse fish readings (only CSV dataset parameters)
      const fishData: Record<string, number> = {};
      readings.forEach((reading) => {
        switch (reading.type) {
          case 'temperature':
            fishData.temperature = reading.value;
            break;
          case 'ph':
            fishData.ph = reading.value;
            break;
          case 'ecValue':
          case 'ec_value':
          case 'ec':
            fishData.ecValue = reading.value;
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
        ecValue: fishData.ecValue?.toString(),
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
      // Parse plant readings (only CSV dataset parameters)
      const plantData: Record<string, number> = {};
      readings.forEach((reading) => {
        switch (reading.type) {
          case 'height':
          case 'plant_height':
          case 'plantHeight':
            plantData.height = reading.value;
            break;
          case 'temperature':
            plantData.temperature = reading.value;
            break;
          case 'humidity':
            plantData.humidity = reading.value;
            break;
          case 'pressure':
            plantData.pressure = reading.value;
            break;
        }
      });

      const currentTimestamp = new Date();

      // Insert plant reading
      await db.insert(plantReadings).values({
        deviceId: device[0].id,
        height: plantData.height?.toString(),
        temperature: plantData.temperature?.toString(),
        humidity: plantData.humidity?.toString(),
        pressure: plantData.pressure?.toString(),
        timestamp: currentTimestamp,
      });

      // If height is present, calculate growth rate and store in plantGrowth table
      if (plantData.height !== undefined) {
        // Get the most recent height measurement to calculate growth rate
        const previousGrowth = await db
          .select()
          .from(plantGrowth)
          .where(eq(plantGrowth.deviceId, device[0].id))
          .orderBy(desc(plantGrowth.measuredAt))
          .limit(1);

        let growthRate: number | null = null;
        let daysFromPlanting: number | null = null;

        if (previousGrowth.length > 0) {
          const prevHeight = parseFloat(previousGrowth[0].height);
          const prevTime = previousGrowth[0].measuredAt;
          const timeDiffMs = currentTimestamp.getTime() - prevTime.getTime();
          const timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);

          // Calculate growth rate in cm/day (only if time difference > 0)
          if (timeDiffDays > 0) {
            growthRate = (plantData.height - prevHeight) / timeDiffDays;
          }

          // Calculate days from planting (use first record's date as planting date)
          const firstGrowth = await db
            .select()
            .from(plantGrowth)
            .where(eq(plantGrowth.deviceId, device[0].id))
            .orderBy(plantGrowth.measuredAt)
            .limit(1);

          if (firstGrowth.length > 0) {
            const plantingDate = firstGrowth[0].measuredAt;
            daysFromPlanting = Math.floor(
              (currentTimestamp.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
            );
          }
        }

        // Insert into plantGrowth table
        await db.insert(plantGrowth).values({
          deviceId: device[0].id,
          measuredAt: currentTimestamp,
          height: plantData.height.toString(),
          growthRate: growthRate?.toFixed(4),
          daysFromPlanting,
        });

        // Emit SSE update for growth data
        sensorUpdateEmitter.emit({
          type: 'growth_update',
          deviceId: device[0].id,
          deviceMac,
          data: {
            height: plantData.height,
            growthRate,
            daysFromPlanting,
          },
          timestamp: currentTimestamp.toISOString(),
        });
      }

      // Check thresholds
      Object.entries(plantData).forEach(([key, value]) => {
        // Skip height for threshold checking (no standard thresholds)
        if (key === 'height') return;
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
        timestamp: currentTimestamp.toISOString(),
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
