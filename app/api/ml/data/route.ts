import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { devices, plantReadings, plantGrowth, fishReadings } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET endpoint to fetch historical data for ML training or visualization
export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const dataType = searchParams.get('type') || 'plant'; // 'plant', 'fish', 'growth'
    const metric = searchParams.get('metric'); // Optional: specific metric to return
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Verify device ownership
    const device = await db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.id, deviceId),
          eq(devices.userId, session.userId)
        )
      )
      .limit(1);

    if (device.length === 0) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 180 days ago
    const end = endDate ? new Date(endDate) : new Date();

    let data: Record<string, unknown>[] = [];

    if (dataType === 'growth') {
      // Fetch plant growth data
      const growthData = await db
        .select()
        .from(plantGrowth)
        .where(
          and(
            eq(plantGrowth.deviceId, deviceId),
            gte(plantGrowth.measuredAt, start),
            lte(plantGrowth.measuredAt, end)
          )
        )
        .orderBy(asc(plantGrowth.measuredAt))
        .limit(limit);

      data = growthData.map(r => ({
        timestamp: r.measuredAt.toISOString(),
        height: r.height ? parseFloat(r.height) : null,
        growthRate: r.growthRate ? parseFloat(r.growthRate) : null,
        growthStage: r.growthStage,
        daysFromPlanting: r.daysFromPlanting,
      }));
    } else if (dataType === 'plant') {
      // Fetch plant readings
      const plantData = await db
        .select()
        .from(plantReadings)
        .where(
          and(
            eq(plantReadings.deviceId, deviceId),
            gte(plantReadings.timestamp, start),
            lte(plantReadings.timestamp, end)
          )
        )
        .orderBy(asc(plantReadings.timestamp))
        .limit(limit);

      data = plantData.map(r => ({
        timestamp: r.timestamp.toISOString(),
        soilMoisture: r.soilMoisture ? parseFloat(r.soilMoisture) : null,
        lightLevel: r.lightLevel ? parseFloat(r.lightLevel) : null,
        temperature: r.temperature ? parseFloat(r.temperature) : null,
        humidity: r.humidity ? parseFloat(r.humidity) : null,
        height: r.height ? parseFloat(r.height) : null,
      }));
    } else if (dataType === 'fish') {
      // Fetch fish readings
      const fishData = await db
        .select()
        .from(fishReadings)
        .where(
          and(
            eq(fishReadings.deviceId, deviceId),
            gte(fishReadings.timestamp, start),
            lte(fishReadings.timestamp, end)
          )
        )
        .orderBy(asc(fishReadings.timestamp))
        .limit(limit);

      data = fishData.map(r => ({
        timestamp: r.timestamp.toISOString(),
        temperature: r.temperature ? parseFloat(r.temperature) : null,
        ph: r.ph ? parseFloat(r.ph) : null,
        dissolvedOxygen: r.dissolvedOxygen ? parseFloat(r.dissolvedOxygen) : null,
        turbidity: r.turbidity ? parseFloat(r.turbidity) : null,
        tds: r.tds ? parseFloat(r.tds) : null,
      }));
    }

    // Filter by specific metric if requested
    if (metric && data.length > 0) {
      data = data.map(row => ({
        timestamp: row.timestamp,
        [metric]: row[metric],
      }));
    }

    // Return as CSV if requested
    if (format === 'csv' && data.length > 0) {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row =>
        Object.values(row).map(v => v === null ? '' : v).join(',')
      );
      const csv = [headers, ...rows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${dataType}_data_${deviceId}.csv"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json({
      success: true,
      deviceId,
      deviceType: device[0].deviceType,
      dataType,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      recordCount: data.length,
      data,
    });
  } catch (error) {
    console.error('Data fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
