/**
 * Data Generator for Virtual ESP32 Simulator
 *
 * Parses CSV training data and generates realistic sensor values
 * with small random variations for real-time streaming demo.
 */

export interface SensorReading {
  type: string;
  value: number;
  unit: string;
  timestamp: string;
}

export interface PlantDataRow {
  timestamp: string;
  height: number;
  temperature: number;
  humidity: number;
  pressure: number;
}

export interface FishDataRow {
  timestamp: string;
  waterTemperature: number;
  ecValue: number;
  tds: number;
  turbidity: number;
  waterPh: number;
}

export interface SimulatorState {
  plantIndex: number;
  fishIndex: number;
  plantData: PlantDataRow[];
  fishData: FishDataRow[];
}

/**
 * Parse plant CSV data from text content
 */
export function parsePlantCSV(csvText: string): PlantDataRow[] {
  const lines = csvText.trim().split('\n');
  const rows: PlantDataRow[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length >= 5) {
      rows.push({
        timestamp: parts[0],
        height: parseFloat(parts[1]) || 10,
        temperature: parseFloat(parts[2]) || 30,
        humidity: parseFloat(parts[3]) || 65,
        pressure: parseFloat(parts[4]) || 100210,
      });
    }
  }

  return rows;
}

/**
 * Parse fish CSV data from text content
 */
export function parseFishCSV(csvText: string): FishDataRow[] {
  const lines = csvText.trim().split('\n');
  const rows: FishDataRow[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length >= 6) {
      rows.push({
        timestamp: parts[0],
        waterTemperature: parseFloat(parts[1]) || 29,
        ecValue: parseFloat(parts[2]) || 320,
        tds: parseFloat(parts[3]) || 210,
        turbidity: parseFloat(parts[4]) || 12,
        waterPh: parseFloat(parts[5]) || 7.0,
      });
    }
  }

  return rows;
}

/**
 * Add small random variation to a value
 */
function addVariation(value: number, variationPercent: number = 2): number {
  const variation = value * (variationPercent / 100);
  const delta = (Math.random() - 0.5) * 2 * variation;
  return Number((value + delta).toFixed(2));
}

/**
 * Generate plant sensor readings from a data row
 * ONLY returns parameters that exist in the CSV dataset:
 * - Height (cm)
 * - Temperature (°C)
 * - Humidity (%)
 * - Pressure (Pa)
 */
export function generatePlantReadings(row: PlantDataRow): SensorReading[] {
  const timestamp = new Date().toISOString();

  return [
    {
      type: 'height',
      value: addVariation(row.height, 1),
      unit: 'cm',
      timestamp,
    },
    {
      type: 'temperature',
      value: addVariation(row.temperature, 3),
      unit: '°C',
      timestamp,
    },
    {
      type: 'humidity',
      value: addVariation(row.humidity, 5),
      unit: '%',
      timestamp,
    },
    {
      type: 'pressure',
      value: addVariation(row.pressure, 0.1),
      unit: 'Pa',
      timestamp,
    },
  ];
}

/**
 * Generate fish sensor readings from a data row
 * ONLY returns parameters that exist in the CSV dataset:
 * - Temperature (°C)
 * - EC Value (µS/cm)
 * - TDS (mg/L)
 * - Turbidity (NTU)
 * - pH
 */
export function generateFishReadings(row: FishDataRow): SensorReading[] {
  const timestamp = new Date().toISOString();

  return [
    {
      type: 'temperature',
      value: addVariation(row.waterTemperature, 2),
      unit: '°C',
      timestamp,
    },
    {
      type: 'ecValue',
      value: addVariation(row.ecValue, 3),
      unit: 'µS/cm',
      timestamp,
    },
    {
      type: 'tds',
      value: addVariation(row.tds, 3),
      unit: 'mg/L',
      timestamp,
    },
    {
      type: 'turbidity',
      value: addVariation(row.turbidity, 5),
      unit: 'NTU',
      timestamp,
    },
    {
      type: 'ph',
      value: addVariation(row.waterPh, 2),
      unit: '',
      timestamp,
    },
  ];
}

/**
 * Create telemetry payload for the API
 */
export function createTelemetryPayload(
  apiKey: string,
  deviceMac: string,
  readingType: 'fish' | 'plant',
  readings: SensorReading[]
) {
  return {
    apiKey,
    deviceMac,
    readingType,
    readings,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get the next data row, looping back to start when reaching the end
 */
export function getNextIndex(currentIndex: number, dataLength: number): number {
  return (currentIndex + 1) % dataLength;
}

/**
 * Format reading for display
 */
export function formatReading(reading: SensorReading): string {
  return `${reading.type}: ${reading.value}${reading.unit}`;
}

/**
 * Calculate statistics from data array
 */
export function calculateStats(data: number[]): { min: number; max: number; avg: number } {
  if (data.length === 0) return { min: 0, max: 0, avg: 0 };

  const min = Math.min(...data);
  const max = Math.max(...data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;

  return { min, max, avg: Number(avg.toFixed(2)) };
}
