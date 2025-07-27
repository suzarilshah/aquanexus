import { SensorReading } from '@/store/useStore';

export interface ParsedCSVData {
  fishData: SensorReading[];
  plantData: SensorReading[];
}

// Fish CSV columns: Timestamp, Water Temperature(°C), EC Values(uS/cm), TDS(mg/L), Turbidity(NTU), Water pH
export function parseFishCSV(csvContent: string): SensorReading[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data: SensorReading[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;
    
    const timestamp = values[0];
    const temperature = parseFloat(values[1]);
    const ecValues = parseFloat(values[2]);
    const tds = parseFloat(values[3]);
    const turbidity = parseFloat(values[4]);
    const ph = parseFloat(values[5]);
    
    // Create sensor readings for each parameter
    if (!isNaN(temperature)) {
      data.push({
        timestamp,
        value: temperature,
        unit: '°C',
        status: getSensorStatus(temperature, { min: 20, max: 28 }),
        deviceMac: 'imported-fish-device',
        sensorType: 'temperature'
      });
    }
    
    if (!isNaN(ecValues)) {
      data.push({
        timestamp,
        value: ecValues,
        unit: 'uS/cm',
        status: getSensorStatus(ecValues, { min: 100, max: 2000 }),
        deviceMac: 'imported-fish-device',
        sensorType: 'ec'
      });
    }
    
    if (!isNaN(tds)) {
      data.push({
        timestamp,
        value: tds,
        unit: 'mg/L',
        status: getSensorStatus(tds, { min: 50, max: 1000 }),
        deviceMac: 'imported-fish-device',
        sensorType: 'tds'
      });
    }
    
    if (!isNaN(turbidity)) {
      data.push({
        timestamp,
        value: turbidity,
        unit: 'NTU',
        status: getSensorStatus(turbidity, { min: 0, max: 50 }),
        deviceMac: 'imported-fish-device',
        sensorType: 'turbidity'
      });
    }
    
    if (!isNaN(ph)) {
      data.push({
        timestamp,
        value: ph,
        unit: 'pH',
        status: getSensorStatus(ph, { min: 6.5, max: 8.0 }),
        deviceMac: 'imported-fish-device',
        sensorType: 'ph'
      });
    }
  }
  
  return data;
}

// Plant CSV columns: Timestamp, Height of the Plant(cm), Plant Temperature(°C), Humidity(RH), Pressure(Pa)
export function parsePlantCSV(csvContent: string): SensorReading[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data: SensorReading[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;
    
    const timestamp = values[0];
    const height = parseFloat(values[1]);
    const temperature = parseFloat(values[2]);
    const humidity = parseFloat(values[3]);
    const pressure = parseFloat(values[4]);
    
    // Create sensor readings for each parameter
    if (!isNaN(height)) {
      data.push({
        timestamp,
        value: height,
        unit: 'cm',
        status: getSensorStatus(height, { min: 5, max: 50 }),
        deviceMac: 'imported-plant-device',
        sensorType: 'height'
      });
    }
    
    if (!isNaN(temperature)) {
      data.push({
        timestamp,
        value: temperature,
        unit: '°C',
        status: getSensorStatus(temperature, { min: 18, max: 30 }),
        deviceMac: 'imported-plant-device',
        sensorType: 'temperature'
      });
    }
    
    if (!isNaN(humidity)) {
      data.push({
        timestamp,
        value: humidity,
        unit: '%',
        status: getSensorStatus(humidity, { min: 50, max: 90 }),
        deviceMac: 'imported-plant-device',
        sensorType: 'humidity'
      });
    }
    
    if (!isNaN(pressure)) {
      data.push({
        timestamp,
        value: pressure,
        unit: 'Pa',
        status: getSensorStatus(pressure, { min: 95000, max: 105000 }),
        deviceMac: 'imported-plant-device',
        sensorType: 'pressure'
      });
    }
  }
  
  return data;
}

function getSensorStatus(value: number, thresholds: { min: number; max: number }): 'normal' | 'warning' | 'critical' {
  if (value < thresholds.min || value > thresholds.max) {
    return 'critical';
  }
  const range = thresholds.max - thresholds.min;
  const warningMargin = range * 0.1;
  if (value < thresholds.min + warningMargin || value > thresholds.max - warningMargin) {
    return 'warning';
  }
  return 'normal';
}

export async function loadCSVFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function loadCSVFromPath(path: string): Promise<string> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load CSV from ${path}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading CSV:', error);
    throw error;
  }
}