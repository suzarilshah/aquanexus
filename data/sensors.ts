// Sensor definitions for firmware generation
// Each sensor type has its required pins, libraries, and code templates

import type { PinCapability } from './boards';

export type SensorCategory = 'temperature' | 'water_quality' | 'environment' | 'light' | 'relay' | 'display' | 'communication';

export interface SensorPin {
  name: string;
  description: string;
  required: boolean;
  capabilities: PinCapability[];
  defaultGPIO?: number;
}

export interface SensorDefinition {
  id: string;
  name: string;
  category: SensorCategory;
  description: string;
  icon: string;
  pins: SensorPin[];
  libraries: LibraryDependency[];
  codeTemplate: string;
  setupCode: string;
  loopCode: string;
  variableDeclarations: string;
  color: string;
}

export interface LibraryDependency {
  name: string;
  version?: string;
  include: string;
  github?: string;
}

export const SENSORS: SensorDefinition[] = [
  // Temperature Sensors
  {
    id: 'ds18b20',
    name: 'DS18B20',
    category: 'temperature',
    description: 'Waterproof digital temperature sensor (OneWire)',
    icon: 'Thermometer',
    color: '#ef4444',
    pins: [
      {
        name: 'DATA',
        description: 'Data pin (requires 4.7kΩ pull-up)',
        required: true,
        capabilities: ['GPIO'],
        defaultGPIO: 4,
      },
    ],
    libraries: [
      { name: 'OneWire', include: '#include <OneWire.h>' },
      { name: 'DallasTemperature', include: '#include <DallasTemperature.h>' },
    ],
    variableDeclarations: `
OneWire oneWire_{{PIN}}({{PIN}});
DallasTemperature ds18b20_{{PIN}}(&oneWire_{{PIN}});
float temperature_{{PIN}} = 0;`,
    setupCode: `
  // Initialize DS18B20 on GPIO {{PIN}}
  ds18b20_{{PIN}}.begin();
  Serial.println("DS18B20 initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read DS18B20 temperature
  ds18b20_{{PIN}}.requestTemperatures();
  temperature_{{PIN}} = ds18b20_{{PIN}}.getTempCByIndex(0);`,
    codeTemplate: '',
  },
  {
    id: 'dht22',
    name: 'DHT22',
    category: 'temperature',
    description: 'Temperature and humidity sensor',
    icon: 'Droplets',
    color: '#3b82f6',
    pins: [
      {
        name: 'DATA',
        description: 'Data pin',
        required: true,
        capabilities: ['GPIO'],
        defaultGPIO: 4,
      },
    ],
    libraries: [{ name: 'DHT sensor library', include: '#include <DHT.h>' }],
    variableDeclarations: `
#define DHT_TYPE_{{PIN}} DHT22
DHT dht_{{PIN}}({{PIN}}, DHT_TYPE_{{PIN}});
float dhtTemp_{{PIN}} = 0;
float dhtHumidity_{{PIN}} = 0;`,
    setupCode: `
  // Initialize DHT22 on GPIO {{PIN}}
  dht_{{PIN}}.begin();
  Serial.println("DHT22 initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read DHT22 sensor
  dhtTemp_{{PIN}} = dht_{{PIN}}.readTemperature();
  dhtHumidity_{{PIN}} = dht_{{PIN}}.readHumidity();`,
    codeTemplate: '',
  },
  {
    id: 'dht11',
    name: 'DHT11',
    category: 'temperature',
    description: 'Basic temperature and humidity sensor',
    icon: 'Droplets',
    color: '#22c55e',
    pins: [
      {
        name: 'DATA',
        description: 'Data pin',
        required: true,
        capabilities: ['GPIO'],
        defaultGPIO: 4,
      },
    ],
    libraries: [{ name: 'DHT sensor library', include: '#include <DHT.h>' }],
    variableDeclarations: `
#define DHT_TYPE_{{PIN}} DHT11
DHT dht_{{PIN}}({{PIN}}, DHT_TYPE_{{PIN}});
float dhtTemp_{{PIN}} = 0;
float dhtHumidity_{{PIN}} = 0;`,
    setupCode: `
  // Initialize DHT11 on GPIO {{PIN}}
  dht_{{PIN}}.begin();
  Serial.println("DHT11 initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read DHT11 sensor
  dhtTemp_{{PIN}} = dht_{{PIN}}.readTemperature();
  dhtHumidity_{{PIN}} = dht_{{PIN}}.readHumidity();`,
    codeTemplate: '',
  },

  // Water Quality Sensors
  {
    id: 'ph-sensor',
    name: 'pH Sensor',
    category: 'water_quality',
    description: 'Analog pH probe sensor module',
    icon: 'TestTube',
    color: '#a855f7',
    pins: [
      {
        name: 'ANALOG',
        description: 'Analog output pin',
        required: true,
        capabilities: ['ADC'],
        defaultGPIO: 34,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define PH_PIN_{{PIN}} {{PIN}}
float phValue_{{PIN}} = 0;
float phVoltage_{{PIN}} = 0;`,
    setupCode: `
  // pH sensor on GPIO {{PIN}}
  pinMode(PH_PIN_{{PIN}}, INPUT);
  Serial.println("pH sensor initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read pH sensor
  int phRaw_{{PIN}} = analogRead(PH_PIN_{{PIN}});
  phVoltage_{{PIN}} = phRaw_{{PIN}} * (3.3 / 4095.0);
  phValue_{{PIN}} = 7.0 + ((2.5 - phVoltage_{{PIN}}) / 0.18);
  phValue_{{PIN}} = constrain(phValue_{{PIN}}, 0, 14);`,
    codeTemplate: '',
  },
  {
    id: 'tds-sensor',
    name: 'TDS Sensor',
    category: 'water_quality',
    description: 'Total Dissolved Solids sensor',
    icon: 'Waves',
    color: '#06b6d4',
    pins: [
      {
        name: 'ANALOG',
        description: 'Analog output pin',
        required: true,
        capabilities: ['ADC'],
        defaultGPIO: 35,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define TDS_PIN_{{PIN}} {{PIN}}
float tdsValue_{{PIN}} = 0;`,
    setupCode: `
  // TDS sensor on GPIO {{PIN}}
  pinMode(TDS_PIN_{{PIN}}, INPUT);
  Serial.println("TDS sensor initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read TDS sensor
  int tdsRaw_{{PIN}} = analogRead(TDS_PIN_{{PIN}});
  float tdsVoltage_{{PIN}} = tdsRaw_{{PIN}} * (3.3 / 4095.0);
  tdsValue_{{PIN}} = (133.42 * pow(tdsVoltage_{{PIN}}, 3) - 255.86 * pow(tdsVoltage_{{PIN}}, 2) + 857.39 * tdsVoltage_{{PIN}}) * 0.5;`,
    codeTemplate: '',
  },
  {
    id: 'turbidity-sensor',
    name: 'Turbidity Sensor',
    category: 'water_quality',
    description: 'Water clarity/turbidity sensor',
    icon: 'CloudFog',
    color: '#78716c',
    pins: [
      {
        name: 'ANALOG',
        description: 'Analog output pin',
        required: true,
        capabilities: ['ADC'],
        defaultGPIO: 32,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define TURBIDITY_PIN_{{PIN}} {{PIN}}
float turbidityNTU_{{PIN}} = 0;`,
    setupCode: `
  // Turbidity sensor on GPIO {{PIN}}
  pinMode(TURBIDITY_PIN_{{PIN}}, INPUT);
  Serial.println("Turbidity sensor initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read turbidity sensor
  int turbidityRaw_{{PIN}} = analogRead(TURBIDITY_PIN_{{PIN}});
  float turbidityVoltage_{{PIN}} = turbidityRaw_{{PIN}} * (3.3 / 4095.0);
  turbidityNTU_{{PIN}} = -1120.4 * pow(turbidityVoltage_{{PIN}}, 2) + 5742.3 * turbidityVoltage_{{PIN}} - 4352.9;
  turbidityNTU_{{PIN}} = max(turbidityNTU_{{PIN}}, 0.0f);`,
    codeTemplate: '',
  },
  {
    id: 'dissolved-oxygen',
    name: 'DO Sensor',
    category: 'water_quality',
    description: 'Dissolved Oxygen sensor',
    icon: 'Wind',
    color: '#0ea5e9',
    pins: [
      {
        name: 'ANALOG',
        description: 'Analog output pin',
        required: true,
        capabilities: ['ADC'],
        defaultGPIO: 33,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define DO_PIN_{{PIN}} {{PIN}}
float dissolvedOxygen_{{PIN}} = 0;`,
    setupCode: `
  // Dissolved Oxygen sensor on GPIO {{PIN}}
  pinMode(DO_PIN_{{PIN}}, INPUT);
  Serial.println("DO sensor initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read dissolved oxygen sensor
  int doRaw_{{PIN}} = analogRead(DO_PIN_{{PIN}});
  float doVoltage_{{PIN}} = doRaw_{{PIN}} * (3.3 / 4095.0);
  dissolvedOxygen_{{PIN}} = doVoltage_{{PIN}} * 4.0; // Simplified conversion`,
    codeTemplate: '',
  },
  {
    id: 'water-level',
    name: 'Water Level',
    category: 'water_quality',
    description: 'Analog water level sensor',
    icon: 'Waves',
    color: '#2563eb',
    pins: [
      {
        name: 'ANALOG',
        description: 'Analog output pin',
        required: true,
        capabilities: ['ADC'],
        defaultGPIO: 36,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define WATER_LEVEL_PIN_{{PIN}} {{PIN}}
int waterLevel_{{PIN}} = 0;`,
    setupCode: `
  // Water level sensor on GPIO {{PIN}}
  pinMode(WATER_LEVEL_PIN_{{PIN}}, INPUT);
  Serial.println("Water level sensor initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read water level sensor
  waterLevel_{{PIN}} = map(analogRead(WATER_LEVEL_PIN_{{PIN}}), 0, 4095, 0, 100);`,
    codeTemplate: '',
  },

  // Environment Sensors
  {
    id: 'soil-moisture',
    name: 'Soil Moisture',
    category: 'environment',
    description: 'Capacitive soil moisture sensor',
    icon: 'Droplet',
    color: '#84cc16',
    pins: [
      {
        name: 'ANALOG',
        description: 'Analog output pin',
        required: true,
        capabilities: ['ADC'],
        defaultGPIO: 34,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define SOIL_MOISTURE_PIN_{{PIN}} {{PIN}}
int soilMoisture_{{PIN}} = 0;`,
    setupCode: `
  // Soil moisture sensor on GPIO {{PIN}}
  pinMode(SOIL_MOISTURE_PIN_{{PIN}}, INPUT);
  Serial.println("Soil moisture sensor initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read soil moisture sensor (inverted: lower reading = more moisture)
  int soilRaw_{{PIN}} = analogRead(SOIL_MOISTURE_PIN_{{PIN}});
  soilMoisture_{{PIN}} = map(soilRaw_{{PIN}}, 4095, 0, 0, 100);
  soilMoisture_{{PIN}} = constrain(soilMoisture_{{PIN}}, 0, 100);`,
    codeTemplate: '',
  },
  {
    id: 'bme280',
    name: 'BME280',
    category: 'environment',
    description: 'Temperature, humidity, and pressure sensor (I2C)',
    icon: 'Gauge',
    color: '#f97316',
    pins: [
      {
        name: 'SDA',
        description: 'I2C Data pin',
        required: true,
        capabilities: ['I2C_SDA'],
        defaultGPIO: 21,
      },
      {
        name: 'SCL',
        description: 'I2C Clock pin',
        required: true,
        capabilities: ['I2C_SCL'],
        defaultGPIO: 22,
      },
    ],
    libraries: [
      { name: 'Adafruit BME280', include: '#include <Adafruit_BME280.h>' },
      { name: 'Adafruit Sensor', include: '#include <Adafruit_Sensor.h>' },
      { name: 'Wire', include: '#include <Wire.h>' },
    ],
    variableDeclarations: `
Adafruit_BME280 bme280;
float bmeTemp = 0;
float bmeHumidity = 0;
float bmePressure = 0;`,
    setupCode: `
  // Initialize BME280 (I2C on GPIO {{SDA}}/{{SCL}})
  Wire.begin({{SDA}}, {{SCL}});
  if (!bme280.begin(0x76)) {
    Serial.println("BME280 not found!");
  } else {
    Serial.println("BME280 initialized");
  }`,
    loopCode: `
  // Read BME280 sensor
  bmeTemp = bme280.readTemperature();
  bmeHumidity = bme280.readHumidity();
  bmePressure = bme280.readPressure() / 100.0F;`,
    codeTemplate: '',
  },

  // Light Sensors
  {
    id: 'ldr',
    name: 'LDR',
    category: 'light',
    description: 'Light Dependent Resistor (photoresistor)',
    icon: 'Sun',
    color: '#fbbf24',
    pins: [
      {
        name: 'ANALOG',
        description: 'Analog input pin',
        required: true,
        capabilities: ['ADC'],
        defaultGPIO: 36,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define LDR_PIN_{{PIN}} {{PIN}}
int lightLevel_{{PIN}} = 0;`,
    setupCode: `
  // LDR on GPIO {{PIN}}
  pinMode(LDR_PIN_{{PIN}}, INPUT);
  Serial.println("LDR initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Read LDR
  lightLevel_{{PIN}} = map(analogRead(LDR_PIN_{{PIN}}), 0, 4095, 0, 100);`,
    codeTemplate: '',
  },
  {
    id: 'bh1750',
    name: 'BH1750',
    category: 'light',
    description: 'Digital light intensity sensor (I2C)',
    icon: 'Sun',
    color: '#eab308',
    pins: [
      {
        name: 'SDA',
        description: 'I2C Data pin',
        required: true,
        capabilities: ['I2C_SDA'],
        defaultGPIO: 21,
      },
      {
        name: 'SCL',
        description: 'I2C Clock pin',
        required: true,
        capabilities: ['I2C_SCL'],
        defaultGPIO: 22,
      },
    ],
    libraries: [
      { name: 'BH1750', include: '#include <BH1750.h>' },
      { name: 'Wire', include: '#include <Wire.h>' },
    ],
    variableDeclarations: `
BH1750 lightMeter;
float luxValue = 0;`,
    setupCode: `
  // Initialize BH1750 (I2C)
  Wire.begin({{SDA}}, {{SCL}});
  if (lightMeter.begin()) {
    Serial.println("BH1750 initialized");
  } else {
    Serial.println("BH1750 not found!");
  }`,
    loopCode: `
  // Read BH1750 light sensor
  luxValue = lightMeter.readLightLevel();`,
    codeTemplate: '',
  },

  // Relays and Actuators
  {
    id: 'relay',
    name: 'Relay Module',
    category: 'relay',
    description: 'Single channel relay for controlling devices',
    icon: 'Power',
    color: '#dc2626',
    pins: [
      {
        name: 'SIGNAL',
        description: 'Control signal pin',
        required: true,
        capabilities: ['GPIO'],
        defaultGPIO: 26,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define RELAY_PIN_{{PIN}} {{PIN}}
bool relayState_{{PIN}} = false;`,
    setupCode: `
  // Relay on GPIO {{PIN}}
  pinMode(RELAY_PIN_{{PIN}}, OUTPUT);
  digitalWrite(RELAY_PIN_{{PIN}}, LOW);
  Serial.println("Relay initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Relay control available via relayState_{{PIN}}
  digitalWrite(RELAY_PIN_{{PIN}}, relayState_{{PIN}} ? HIGH : LOW);`,
    codeTemplate: '',
  },
  {
    id: 'pump',
    name: 'Water Pump',
    category: 'relay',
    description: 'Water pump control via relay/MOSFET',
    icon: 'Droplets',
    color: '#0284c7',
    pins: [
      {
        name: 'CONTROL',
        description: 'Pump control pin',
        required: true,
        capabilities: ['GPIO', 'PWM'],
        defaultGPIO: 25,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define PUMP_PIN_{{PIN}} {{PIN}}
bool pumpState_{{PIN}} = false;
int pumpSpeed_{{PIN}} = 255;`,
    setupCode: `
  // Water pump on GPIO {{PIN}}
  pinMode(PUMP_PIN_{{PIN}}, OUTPUT);
  digitalWrite(PUMP_PIN_{{PIN}}, LOW);
  Serial.println("Water pump initialized on GPIO {{PIN}}");`,
    loopCode: `
  // Pump control - use PWM for speed control
  if (pumpState_{{PIN}}) {
    analogWrite(PUMP_PIN_{{PIN}}, pumpSpeed_{{PIN}});
  } else {
    digitalWrite(PUMP_PIN_{{PIN}}, LOW);
  }`,
    codeTemplate: '',
  },

  // Ultrasonic Distance
  {
    id: 'hcsr04',
    name: 'HC-SR04',
    category: 'environment',
    description: 'Ultrasonic distance sensor',
    icon: 'Ruler',
    color: '#8b5cf6',
    pins: [
      {
        name: 'TRIGGER',
        description: 'Trigger pin',
        required: true,
        capabilities: ['GPIO'],
        defaultGPIO: 5,
      },
      {
        name: 'ECHO',
        description: 'Echo pin',
        required: true,
        capabilities: ['GPIO'],
        defaultGPIO: 18,
      },
    ],
    libraries: [],
    variableDeclarations: `
#define TRIG_PIN_{{TRIGGER}} {{TRIGGER}}
#define ECHO_PIN_{{ECHO}} {{ECHO}}
float distance_{{TRIGGER}} = 0;`,
    setupCode: `
  // HC-SR04 ultrasonic sensor
  pinMode(TRIG_PIN_{{TRIGGER}}, OUTPUT);
  pinMode(ECHO_PIN_{{ECHO}}, INPUT);
  Serial.println("HC-SR04 initialized");`,
    loopCode: `
  // Read HC-SR04 distance
  digitalWrite(TRIG_PIN_{{TRIGGER}}, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN_{{TRIGGER}}, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN_{{TRIGGER}}, LOW);
  long duration_{{TRIGGER}} = pulseIn(ECHO_PIN_{{ECHO}}, HIGH);
  distance_{{TRIGGER}} = duration_{{TRIGGER}} * 0.034 / 2;`,
    codeTemplate: '',
  },
];

export const SENSOR_CATEGORIES: Record<SensorCategory, { name: string; icon: string; color: string }> = {
  temperature: { name: 'Temperature', icon: 'Thermometer', color: '#ef4444' },
  water_quality: { name: 'Water Quality', icon: 'TestTube', color: '#3b82f6' },
  environment: { name: 'Environment', icon: 'Leaf', color: '#22c55e' },
  light: { name: 'Light', icon: 'Sun', color: '#fbbf24' },
  relay: { name: 'Relays & Actuators', icon: 'Power', color: '#dc2626' },
  display: { name: 'Displays', icon: 'Monitor', color: '#6366f1' },
  communication: { name: 'Communication', icon: 'Radio', color: '#ec4899' },
};

export function getSensorById(id: string): SensorDefinition | undefined {
  return SENSORS.find((s) => s.id === id);
}

export function getSensorsByCategory(category: SensorCategory): SensorDefinition[] {
  return SENSORS.filter((s) => s.category === category);
}

export function getAllSensorCategories(): SensorCategory[] {
  return Object.keys(SENSOR_CATEGORIES) as SensorCategory[];
}

// Aquaponics sensor IDs based on actual CSV dataset parameters
export const AQUAPONICS_SENSORS = {
  // Fish environment: water temperature (°C), pH, EC/TDS (µS/cm, mg/L), turbidity (NTU)
  fish: ['ds18b20', 'ph-sensor', 'tds-sensor', 'turbidity-sensor'],
  // Plant environment: plant height (cm), air temp (°C), humidity (RH), pressure (Pa)
  plant: ['hcsr04', 'bme280'],
};

export function getAquaponicsSensors(deviceType: 'fish' | 'plant' | 'general'): SensorDefinition[] {
  if (deviceType === 'general') {
    // Return all aquaponics sensors for general
    const allIds = [...AQUAPONICS_SENSORS.fish, ...AQUAPONICS_SENSORS.plant];
    return SENSORS.filter((s) => allIds.includes(s.id));
  }
  const sensorIds = AQUAPONICS_SENSORS[deviceType] || [];
  return SENSORS.filter((s) => sensorIds.includes(s.id));
}

export function isAquaponicsSensor(sensorId: string): boolean {
  const allIds = [...AQUAPONICS_SENSORS.fish, ...AQUAPONICS_SENSORS.plant];
  return allIds.includes(sensorId);
}
