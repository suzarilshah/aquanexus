// Firmware Generator for ESP32
// Generates Arduino/C++ code based on pin assignments
// Uses WiFiManager for provisioning mode (no hardcoded credentials)

import type { PinAssignment } from '@/components/onboarding/BoardVisualizer';
import type { BoardDefinition } from '@/data/boards';
import type { SensorDefinition, LibraryDependency } from '@/data/sensors';

export interface FirmwareConfig {
  board: BoardDefinition;
  assignments: PinAssignment[];
  deviceName: string;
  deviceType: 'fish' | 'plant' | 'general';
  serverHost: string;
  serverPort: number;
  useWebSocket: boolean;
  useAbly: boolean;
  sensorInterval: number;
  enableOTA: boolean;
  enableDeepSleep: boolean;
  deepSleepDuration: number;
  // New fields for API connection
  apiKey?: string;
  deviceMac?: string;
}

export interface GeneratedFirmware {
  code: string;
  filename: string;
  libraries: LibraryDependency[];
  warnings: string[];
}

// Collect unique libraries from all sensors
function collectLibraries(assignments: PinAssignment[], useAbly: boolean): LibraryDependency[] {
  const libraryMap = new Map<string, LibraryDependency>();

  // Always include WiFiManager for provisioning
  libraryMap.set('WiFiManager', {
    name: 'WiFiManager',
    include: '#include <WiFiManager.h>',
    github: 'https://github.com/tzapu/WiFiManager',
  });

  // Always include ArduinoJson
  libraryMap.set('ArduinoJson', {
    name: 'ArduinoJson',
    include: '#include <ArduinoJson.h>',
  });

  // Always include Preferences for credential storage
  libraryMap.set('Preferences', {
    name: 'Preferences',
    include: '#include <Preferences.h>',
  });

  // Add Ably MQTT if enabled
  if (useAbly) {
    libraryMap.set('PubSubClient', {
      name: 'PubSubClient',
      include: '#include <PubSubClient.h>',
      github: 'https://github.com/knolleary/pubsubclient',
    });
  }

  // Collect from sensors
  for (const assignment of assignments) {
    for (const lib of assignment.sensor.libraries) {
      libraryMap.set(lib.name, lib);
    }
  }

  return Array.from(libraryMap.values());
}

// Generate variable declarations from assignments
function generateVariableDeclarations(assignments: PinAssignment[]): string {
  const declarations: string[] = [];
  const processedSensors = new Set<string>();

  for (const assignment of assignments) {
    const sensorKey = `${assignment.sensor.id}_${assignment.gpio}`;
    if (processedSensors.has(sensorKey)) continue;
    processedSensors.add(sensorKey);

    let decl = assignment.sensor.variableDeclarations;

    // Replace pin placeholders
    decl = decl.replace(/\{\{PIN\}\}/g, String(assignment.gpio));
    decl = decl.replace(/\{\{SDA\}\}/g, String(assignment.gpio));
    decl = decl.replace(/\{\{SCL\}\}/g, String(assignment.gpio));
    decl = decl.replace(/\{\{TRIGGER\}\}/g, String(assignment.gpio));
    decl = decl.replace(/\{\{ECHO\}\}/g, String(assignment.gpio));

    declarations.push(decl);
  }

  return declarations.join('\n');
}

// Generate setup code from assignments
function generateSetupCode(assignments: PinAssignment[]): string {
  const setupCodes: string[] = [];
  const processedSensors = new Set<string>();

  for (const assignment of assignments) {
    const sensorKey = `${assignment.sensor.id}_${assignment.gpio}`;
    if (processedSensors.has(sensorKey)) continue;
    processedSensors.add(sensorKey);

    let setup = assignment.sensor.setupCode;

    // Replace pin placeholders
    setup = setup.replace(/\{\{PIN\}\}/g, String(assignment.gpio));
    setup = setup.replace(/\{\{SDA\}\}/g, String(assignment.gpio));
    setup = setup.replace(/\{\{SCL\}\}/g, String(assignment.gpio));
    setup = setup.replace(/\{\{TRIGGER\}\}/g, String(assignment.gpio));
    setup = setup.replace(/\{\{ECHO\}\}/g, String(assignment.gpio));

    setupCodes.push(setup);
  }

  return setupCodes.join('\n');
}

// Generate loop code from assignments
function generateLoopCode(assignments: PinAssignment[]): string {
  const loopCodes: string[] = [];
  const processedSensors = new Set<string>();

  for (const assignment of assignments) {
    const sensorKey = `${assignment.sensor.id}_${assignment.gpio}`;
    if (processedSensors.has(sensorKey)) continue;
    processedSensors.add(sensorKey);

    let loop = assignment.sensor.loopCode;

    // Replace pin placeholders
    loop = loop.replace(/\{\{PIN\}\}/g, String(assignment.gpio));
    loop = loop.replace(/\{\{SDA\}\}/g, String(assignment.gpio));
    loop = loop.replace(/\{\{SCL\}\}/g, String(assignment.gpio));
    loop = loop.replace(/\{\{TRIGGER\}\}/g, String(assignment.gpio));
    loop = loop.replace(/\{\{ECHO\}\}/g, String(assignment.gpio));

    loopCodes.push(loop);
  }

  return loopCodes.join('\n');
}

// Generate readings array building code that matches the telemetry API format
function generateReadingsArrayCode(assignments: PinAssignment[], deviceType: string): string {
  const readingLines: string[] = [];

  for (const assignment of assignments) {
    const gpio = assignment.gpio;
    const sensorId = assignment.sensor.id;

    // Generate code to add readings to the array
    // Format: { "type": "sensor_name", "value": value, "unit": "unit" }
    switch (sensorId) {
      case 'ds18b20':
        readingLines.push(`  addReading(readings, "temperature", temperature_${gpio}, "°C");`);
        break;
      case 'dht22':
      case 'dht11':
        readingLines.push(`  addReading(readings, "temperature", dhtTemp_${gpio}, "°C");`);
        readingLines.push(`  addReading(readings, "humidity", dhtHumidity_${gpio}, "%");`);
        break;
      case 'ph-sensor':
        readingLines.push(`  addReading(readings, "ph", phValue_${gpio}, "");`);
        break;
      case 'tds-sensor':
        readingLines.push(`  addReading(readings, "tds", tdsValue_${gpio}, "ppm");`);
        // TDS sensor also provides EC value
        readingLines.push(`  addReading(readings, "ecValue", ecValue_${gpio}, "µS/cm");`);
        break;
      case 'turbidity-sensor':
        readingLines.push(`  addReading(readings, "turbidity", turbidityNTU_${gpio}, "NTU");`);
        break;
      case 'dissolved-oxygen':
        readingLines.push(`  addReading(readings, "dissolvedOxygen", dissolvedOxygen_${gpio}, "mg/L");`);
        break;
      case 'water-level':
        readingLines.push(`  addReading(readings, "waterLevel", waterLevel_${gpio}, "cm");`);
        break;
      case 'soil-moisture':
        readingLines.push(`  addReading(readings, "soilMoisture", soilMoisture_${gpio}, "%");`);
        break;
      case 'bme280':
        readingLines.push(`  addReading(readings, "temperature", bmeTemp, "°C");`);
        readingLines.push(`  addReading(readings, "humidity", bmeHumidity, "%");`);
        readingLines.push(`  addReading(readings, "pressure", bmePressure, "Pa");`);
        break;
      case 'ldr':
        readingLines.push(`  addReading(readings, "lightLevel", lightLevel_${gpio}, "lux");`);
        break;
      case 'bh1750':
        readingLines.push(`  addReading(readings, "lux", luxValue, "lux");`);
        break;
      case 'hcsr04':
        // For plant monitoring, distance sensor measures plant height
        if (deviceType === 'plant') {
          readingLines.push(`  addReading(readings, "height", calculateHeight(distance_${gpio}), "cm");`);
        } else {
          readingLines.push(`  addReading(readings, "distance", distance_${gpio}, "cm");`);
        }
        break;
      case 'relay':
        readingLines.push(`  addReading(readings, "relay_${gpio}", relayState_${gpio} ? 1 : 0, "");`);
        break;
      case 'pump':
        readingLines.push(`  addReading(readings, "pump_${gpio}", pumpState_${gpio} ? 1 : 0, "");`);
        break;
    }
  }

  return readingLines.join('\n');
}

// Check for warnings based on pin assignments
function checkWarnings(assignments: PinAssignment[], board: BoardDefinition, config: FirmwareConfig): string[] {
  const warnings: string[] = [];

  for (const assignment of assignments) {
    const pin = board.pins.find(p => p.gpio === assignment.gpio);
    if (pin?.strapping) {
      warnings.push(`GPIO ${assignment.gpio} is a strapping pin - may affect boot behavior`);
    }
    if (pin?.bootMode) {
      warnings.push(`GPIO ${assignment.gpio} affects boot mode - use with caution`);
    }
  }

  // Check for I2C conflicts
  const i2cPins = assignments.filter(a =>
    a.sensor.pins.some(p => p.capabilities.includes('I2C_SDA') || p.capabilities.includes('I2C_SCL'))
  );
  if (i2cPins.length > 2) {
    warnings.push('Multiple I2C devices detected - ensure they have different addresses');
  }

  // Check for missing API key
  if (!config.apiKey || config.apiKey.trim() === '') {
    warnings.push('No API key provided - device will need to be registered manually');
  }

  // Check for missing MAC address (manual entry)
  if (config.deviceMac && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(config.deviceMac)) {
    warnings.push('Invalid MAC address format - will use auto-detected MAC');
  }

  return warnings;
}

export function generateFirmware(config: FirmwareConfig): GeneratedFirmware {
  const libraries = collectLibraries(config.assignments, config.useAbly);
  const warnings = checkWarnings(config.assignments, config.board, config);

  const includeStatements = libraries.map(lib => lib.include).join('\n');
  const variableDeclarations = generateVariableDeclarations(config.assignments);
  const setupCode = generateSetupCode(config.assignments);
  const loopCode = generateLoopCode(config.assignments);
  const readingsArrayCode = generateReadingsArrayCode(config.assignments, config.deviceType);

  // Determine if we have height sensor for plant type
  const hasHeightSensor = config.deviceType === 'plant' &&
    config.assignments.some(a => a.sensor.id === 'hcsr04');

  const code = `/*
 * AquaNexus ESP32 Firmware
 * Generated by AquaNexus Firmware Configurator
 *
 * Device: ${config.deviceName}
 * Type: ${config.deviceType}
 * Board: ${config.board.name}
 *
 * IMPORTANT: This firmware uses WiFiManager for provisioning.
 * After flashing, the device will create a WiFi hotspot named "AquaNexus-Setup".
 * Connect to this hotspot and configure your WiFi credentials.
 *
 * Libraries Required:
${libraries.map(lib => ` *   - ${lib.name}${lib.github ? ` (${lib.github})` : ''}`).join('\n')}
 */

// ========== LIBRARY INCLUDES ==========
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
${config.useAbly ? '#include <PubSubClient.h>' : ''}
${includeStatements}

// ========== CONFIGURATION ==========
// Device Configuration
#define DEVICE_NAME "${config.deviceName}"
#define DEVICE_TYPE "${config.deviceType}"
${config.deviceMac ? `#define DEVICE_MAC "${config.deviceMac}"` : '// MAC will be auto-detected'}
${config.apiKey ? `#define API_KEY "${config.apiKey}"` : '#define API_KEY ""  // Get this from your AquaNexus dashboard'}

// Server Configuration
#define SERVER_HOST "${config.serverHost}"
#define SERVER_PORT ${config.serverPort}
#define API_ENDPOINT "https://${config.serverHost}/api/telemetry"
#define USE_HTTPS true

// Timing Configuration
#define SENSOR_INTERVAL ${config.sensorInterval}
#define HEARTBEAT_INTERVAL 30000

// Feature Toggles
#define USE_ABLY ${config.useAbly ? 'true' : 'false'}
#define ENABLE_OTA ${config.enableOTA ? 'true' : 'false'}
${config.enableDeepSleep ? `#define ENABLE_DEEP_SLEEP true\n#define DEEP_SLEEP_DURATION ${config.deepSleepDuration}` : '#define ENABLE_DEEP_SLEEP false'}

// Built-in LED for status indication
#define LED_PIN 2

${hasHeightSensor ? `// Plant height calculation
// Adjust SENSOR_HEIGHT_CM to the height of your ultrasonic sensor from the ground
#define SENSOR_HEIGHT_CM 100.0  // Height of sensor from ground in cm
float calculateHeight(float distance) {
  // Height = Sensor height - distance measured
  float height = SENSOR_HEIGHT_CM - distance;
  return height > 0 ? height : 0;
}
` : ''}

// ========== SENSOR VARIABLES ==========
${variableDeclarations}

// ========== SYSTEM VARIABLES ==========
WiFiManager wifiManager;
WiFiClientSecure secureClient;
HTTPClient http;
Preferences preferences;

${config.useAbly ? `// Ably MQTT Configuration
WiFiClient ablyClient;
PubSubClient mqtt(ablyClient);
const char* ABLY_HOST = "mqtt.ably.io";
const int ABLY_PORT = 1883;
String ablyClientId;
` : ''}

String deviceMac;
String apiKey;
bool wifiConnected = false;

unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;

// ========== HELPER FUNCTION FOR READINGS ==========
void addReading(JsonArray& readings, const char* type, float value, const char* unit) {
  if (!isnan(value) && !isinf(value)) {
    JsonObject reading = readings.createNestedObject();
    reading["type"] = type;
    reading["value"] = value;
    reading["unit"] = unit;
  }
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("╔════════════════════════════════════════════╗");
  Serial.println("║      AquaNexus ESP32 Firmware v2.0.0       ║");
  Serial.println("║      Device: " DEVICE_NAME);
  Serial.println("╚════════════════════════════════════════════╝");
  Serial.println();

  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Get device MAC address
  #ifdef DEVICE_MAC
  deviceMac = DEVICE_MAC;
  #else
  deviceMac = WiFi.macAddress();
  #endif
  Serial.println("Device MAC: " + deviceMac);

  // Load API key
  #ifdef API_KEY
  apiKey = API_KEY;
  if (apiKey.length() > 0) {
    Serial.println("API Key configured: " + apiKey.substring(0, 8) + "...");
  } else {
    Serial.println("WARNING: No API key configured!");
    Serial.println("Get your API key from the AquaNexus dashboard.");
  }
  #endif

  // ========== WiFiManager Setup (Provisioning Mode) ==========
  wifiManager.setConfigPortalTimeout(180);
  wifiManager.setAPCallback(configModeCallback);
  wifiManager.setSaveConfigCallback(saveConfigCallback);

  Serial.println("Connecting to WiFi...");
  Serial.println("If this fails, a setup hotspot will be created.");
  Serial.println();

  if (!wifiManager.autoConnect("AquaNexus-Setup", "aquanexus123")) {
    Serial.println("Failed to connect and hit timeout");
    Serial.println("Restarting in 3 seconds...");
    delay(3000);
    ESP.restart();
  }

  // WiFi Connected
  wifiConnected = true;
  Serial.println();
  Serial.println("✓ WiFi connected successfully!");
  Serial.println("  IP address: " + WiFi.localIP().toString());
  Serial.println("  Signal strength: " + String(WiFi.RSSI()) + " dBm");

  // Configure secure client for HTTPS
  secureClient.setInsecure(); // For testing - use proper certificates in production

  // Blink LED to indicate successful connection
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }

  // Initialize sensors
  initializeSensors();

  ${config.useAbly ? `// Connect to Ably MQTT
  setupAblyMQTT();` : ''}

  #if ENABLE_OTA
  setupOTA();
  #endif

  Serial.println();
  Serial.println("✓ Setup complete! Starting main loop...");
  Serial.println("════════════════════════════════════════════");
  Serial.println();

  // Send initial heartbeat
  sendHeartbeat();
}

// ========== MAIN LOOP ==========
void loop() {
  // Handle WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiReconnection();
    return;
  }

  ${config.useAbly ? `// Handle MQTT
  if (!mqtt.connected()) {
    reconnectMQTT();
  }
  mqtt.loop();` : ''}

  // Read sensors at specified interval
  if (millis() - lastSensorRead >= SENSOR_INTERVAL) {
    readAllSensors();
    sendSensorData();
    lastSensorRead = millis();
  }

  // Send heartbeat
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  #if ENABLE_OTA
  ArduinoOTA.handle();
  #endif

  #if ENABLE_DEEP_SLEEP
  if (millis() > 60000) {
    enterDeepSleep();
  }
  #endif

  delay(10);
}

// ========== WiFiManager CALLBACKS ==========
void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println();
  Serial.println("╔════════════════════════════════════════════╗");
  Serial.println("║        WIFI SETUP MODE ACTIVATED           ║");
  Serial.println("╚════════════════════════════════════════════╝");
  Serial.println();
  Serial.println("1. Connect to WiFi: AquaNexus-Setup");
  Serial.println("2. Password: aquanexus123");
  Serial.println("3. Open browser: 192.168.4.1");
  Serial.println("4. Select your WiFi network");
  Serial.println();
  Serial.println("Hotspot IP: " + WiFi.softAPIP().toString());
  Serial.println("════════════════════════════════════════════");

  digitalWrite(LED_PIN, HIGH);
}

void saveConfigCallback() {
  Serial.println("✓ WiFi configuration saved!");
}

// ========== SENSOR INITIALIZATION ==========
void initializeSensors() {
  Serial.println("Initializing sensors...");
${setupCode}
  Serial.println("✓ All sensors initialized.");
}

// ========== SENSOR READING ==========
void readAllSensors() {
  Serial.println("Reading sensors...");
${loopCode}
}

// ========== DATA TRANSMISSION ==========
// Send sensor data to AquaNexus API
// API Format: POST /api/telemetry
// {
//   "apiKey": "your-api-key",
//   "deviceMac": "AA:BB:CC:DD:EE:FF",
//   "readingType": "fish" | "plant",
//   "readings": [{ "type": "temperature", "value": 25.5, "unit": "°C" }]
// }
void sendSensorData() {
  if (apiKey.length() == 0) {
    Serial.println("ERROR: No API key configured. Cannot send data.");
    return;
  }

  DynamicJsonDocument doc(2048);

  // Build payload matching AquaNexus telemetry API format
  doc["apiKey"] = apiKey;
  doc["deviceMac"] = deviceMac;
  doc["readingType"] = DEVICE_TYPE;
  doc["timestamp"] = getISOTimestamp();

  // Create readings array
  JsonArray readings = doc.createNestedArray("readings");

  // Add sensor readings to array
${readingsArrayCode}

  String payload;
  serializeJson(doc, payload);

  Serial.println("Sending data to AquaNexus...");
  Serial.println("Payload: " + payload);

  ${config.useAbly ? `
  // Send via MQTT if connected
  if (mqtt.connected()) {
    String topic = "aquanexus/" + deviceMac + "/telemetry";
    if (mqtt.publish(topic.c_str(), payload.c_str())) {
      Serial.println("✓ Data sent via MQTT");
      blinkLED(1);
      return;
    }
  }
  ` : ''}

  // Send via HTTPS
  sendViaHTTPS(payload);
}

void sendViaHTTPS(String payload) {
  http.begin(secureClient, API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  int httpCode = http.POST(payload);

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.println("✓ Data sent via HTTPS");
    Serial.println("Response: " + response);
    blinkLED(1);
  } else if (httpCode > 0) {
    String response = http.getString();
    Serial.println("✗ HTTP Error " + String(httpCode) + ": " + response);
    blinkLED(3);
  } else {
    Serial.println("✗ Connection failed: " + http.errorToString(httpCode));
    blinkLED(5);
  }

  http.end();
}

void sendHeartbeat() {
  if (apiKey.length() == 0) {
    return;
  }

  DynamicJsonDocument doc(512);

  doc["apiKey"] = apiKey;
  doc["deviceMac"] = deviceMac;
  doc["readingType"] = "heartbeat";
  doc["timestamp"] = getISOTimestamp();
  doc["status"] = "online";

  String payload;
  serializeJson(doc, payload);

  ${config.useAbly ? `
  if (mqtt.connected()) {
    String topic = "aquanexus/" + deviceMac + "/heartbeat";
    mqtt.publish(topic.c_str(), payload.c_str());
    Serial.println("✓ Heartbeat sent via MQTT");
    return;
  }
  ` : ''}

  // Send via HTTPS
  http.begin(secureClient, API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int httpCode = http.POST(payload);
  if (httpCode == 200 || httpCode == 201) {
    Serial.println("✓ Heartbeat sent");
  }
  http.end();
}

// ========== UTILITY FUNCTIONS ==========
String getISOTimestamp() {
  // Returns a timestamp string (millis since boot - for real timestamps, use NTP)
  unsigned long ms = millis();
  return String(ms);
}

void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(50);
    digitalWrite(LED_PIN, LOW);
    delay(50);
  }
}

// ========== WIFI RECONNECTION ==========
void handleWiFiReconnection() {
  static unsigned long lastReconnectAttempt = 0;

  if (millis() - lastReconnectAttempt > 10000) {
    Serial.println("WiFi disconnected. Attempting reconnection...");
    WiFi.reconnect();
    lastReconnectAttempt = millis();
  }
}

${config.useAbly ? `
// ========== ABLY MQTT ==========
void setupAblyMQTT() {
  ablyClientId = "aquanexus-" + deviceMac;
  ablyClientId.replace(":", "");

  mqtt.setServer(ABLY_HOST, ABLY_PORT);
  mqtt.setCallback(mqttCallback);

  reconnectMQTT();
}

void reconnectMQTT() {
  if (!mqtt.connected()) {
    Serial.println("Connecting to Ably MQTT...");

    // For Ably, username is API key name, password is API key secret
    // Use device MAC as client ID
    if (mqtt.connect(ablyClientId.c_str())) {
      Serial.println("✓ Connected to Ably MQTT");

      // Subscribe to commands topic
      String cmdTopic = "aquanexus/" + deviceMac + "/commands";
      mqtt.subscribe(cmdTopic.c_str());
    } else {
      Serial.println("✗ Ably MQTT connection failed, rc=" + String(mqtt.state()));
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println("MQTT message received: " + message);

  DynamicJsonDocument doc(512);
  deserializeJson(doc, message);

  String command = doc["command"].as<String>();
  if (command == "restart") {
    Serial.println("Restart command received");
    ESP.restart();
  } else if (command == "reset_wifi") {
    wifiManager.resetSettings();
    ESP.restart();
  }
}
` : ''}

#if ENABLE_OTA
// ========== OTA UPDATE ==========
void setupOTA() {
  ArduinoOTA.setHostname(DEVICE_NAME);

  ArduinoOTA.onStart([]() {
    Serial.println("OTA Update starting...");
  });

  ArduinoOTA.onEnd([]() {
    Serial.println("OTA Update complete!");
  });

  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("OTA Progress: %u%%\\r", (progress / (total / 100)));
  });

  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("OTA Error[%u]: ", error);
  });

  ArduinoOTA.begin();
  Serial.println("✓ OTA updates enabled");
}
#endif

#if ENABLE_DEEP_SLEEP
// ========== DEEP SLEEP ==========
void enterDeepSleep() {
  Serial.println("Entering deep sleep for " + String(DEEP_SLEEP_DURATION) + " seconds...");
  esp_sleep_enable_timer_wakeup(DEEP_SLEEP_DURATION * 1000000ULL);
  esp_deep_sleep_start();
}
#endif
`;

  return {
    code,
    filename: `${config.deviceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_firmware.ino`,
    libraries,
    warnings,
  };
}

// Export a simple version for preview
export function generateFirmwarePreview(config: Partial<FirmwareConfig>): string {
  const sensorCount = config.assignments?.length || 0;
  const sensorList = config.assignments?.map(a => a.sensor.name).join(', ') || 'None';

  return `// AquaNexus Firmware Preview
// Device: ${config.deviceName || 'Unnamed'}
// Board: ${config.board?.name || 'ESP32'}
// Sensors (${sensorCount}): ${sensorList}
//
// This firmware uses WiFiManager for WiFi provisioning.
// No hardcoded credentials needed!`;
}
