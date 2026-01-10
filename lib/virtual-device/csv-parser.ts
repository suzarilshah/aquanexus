import fs from 'fs';
import path from 'path';

// Types for CSV data
export interface FishDataRow {
  timestamp: string;
  waterTemperature: number;
  ecValue: number;
  tds: number;
  turbidity: number;
  waterPh: number;
  rowIndex: number;
}

export interface PlantDataRow {
  timestamp: string;
  height: number;
  temperature: number;
  humidity: number;
  pressure: number;
  rowIndex: number;
}

export interface ParsedCSVData {
  rows: (FishDataRow | PlantDataRow)[];
  totalRows: number;
  firstTimestamp: Date;
  lastTimestamp: Date;
  datasetDurationMs: number;
}

// Cache for parsed CSV data
let fishDataCache: ParsedCSVData | null = null;
let plantDataCache: ParsedCSVData | null = null;

/**
 * Parse the Fish CSV file and return typed data
 */
export function parseFishCSV(): ParsedCSVData {
  if (fishDataCache) {
    return fishDataCache;
  }

  const csvPath = path.join(process.cwd(), 'public', 'fish_initial.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  const rows: FishDataRow[] = dataLines.map((line, index) => {
    // Handle the CSV format: Timestamp,Water Temperature(°C),EC Values(uS/cm,TDS(mg/L),Turbidity(NTU),Water pH
    // Note: EC Values column header has a typo in the CSV (missing closing parenthesis)
    const parts = line.split(',');

    return {
      timestamp: parts[0]?.trim() || '',
      waterTemperature: parseFloat(parts[1]) || 0,
      ecValue: parseFloat(parts[2]) || 0,
      tds: parseFloat(parts[3]) || 0,
      turbidity: parseFloat(parts[4]) || 0,
      waterPh: parseFloat(parts[5]) || 0,
      rowIndex: index,
    };
  }).filter(row => row.timestamp); // Filter out empty rows

  const firstTimestamp = parseCSVTimestamp(rows[0].timestamp);
  const lastTimestamp = parseCSVTimestamp(rows[rows.length - 1].timestamp);
  const datasetDurationMs = lastTimestamp.getTime() - firstTimestamp.getTime();

  fishDataCache = {
    rows,
    totalRows: rows.length,
    firstTimestamp,
    lastTimestamp,
    datasetDurationMs,
  };

  return fishDataCache;
}

/**
 * Parse the Plant CSV file and return typed data
 */
export function parsePlantCSV(): ParsedCSVData {
  if (plantDataCache) {
    return plantDataCache;
  }

  const csvPath = path.join(process.cwd(), 'public', 'plant_initial.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  const rows: PlantDataRow[] = dataLines.map((line, index) => {
    // Handle the CSV format: Timestamp,Height of the Plant(cm),Plant Temperature(°C),Humidity(RH),Pressure(Pa)
    const parts = line.split(',');

    return {
      timestamp: parts[0]?.trim() || '',
      height: parseFloat(parts[1]) || 0,
      temperature: parseFloat(parts[2]) || 0,
      humidity: parseFloat(parts[3]) || 0,
      pressure: parseFloat(parts[4]) || 0,
      rowIndex: index,
    };
  }).filter(row => row.timestamp); // Filter out empty rows

  const firstTimestamp = parseCSVTimestamp(rows[0].timestamp);
  const lastTimestamp = parseCSVTimestamp(rows[rows.length - 1].timestamp);
  const datasetDurationMs = lastTimestamp.getTime() - firstTimestamp.getTime();

  plantDataCache = {
    rows,
    totalRows: rows.length,
    firstTimestamp,
    lastTimestamp,
    datasetDurationMs,
  };

  return plantDataCache;
}

/**
 * Parse CSV timestamp format (e.g., "2024-03-01 0:10") to Date
 */
export function parseCSVTimestamp(timestamp: string): Date {
  // Format: "2024-03-01 0:10" or "2024-03-01 15:08"
  const [datePart, timePart] = timestamp.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Clear the CSV cache (useful for testing or reloading)
 */
export function clearCSVCache(): void {
  fishDataCache = null;
  plantDataCache = null;
}

/**
 * Get data summary for logging
 */
export function getDatasetSummary(type: 'fish' | 'plant'): {
  totalRows: number;
  firstTimestamp: string;
  lastTimestamp: string;
  durationDays: number;
} {
  const data = type === 'fish' ? parseFishCSV() : parsePlantCSV();

  return {
    totalRows: data.totalRows,
    firstTimestamp: data.firstTimestamp.toISOString(),
    lastTimestamp: data.lastTimestamp.toISOString(),
    durationDays: Math.round(data.datasetDurationMs / (1000 * 60 * 60 * 24)),
  };
}

/**
 * Get a specific row from the dataset
 */
export function getRow(type: 'fish' | 'plant', index: number): FishDataRow | PlantDataRow | null {
  const data = type === 'fish' ? parseFishCSV() : parsePlantCSV();

  if (index < 0 || index >= data.totalRows) {
    return null;
  }

  return data.rows[index];
}

/**
 * Get all rows in a range
 */
export function getRowRange(
  type: 'fish' | 'plant',
  startIndex: number,
  endIndex: number
): (FishDataRow | PlantDataRow)[] {
  const data = type === 'fish' ? parseFishCSV() : parsePlantCSV();

  const safeStart = Math.max(0, startIndex);
  const safeEnd = Math.min(data.totalRows, endIndex);

  return data.rows.slice(safeStart, safeEnd);
}
