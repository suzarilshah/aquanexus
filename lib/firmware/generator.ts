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
  // API connection fields
  apiKey?: string;
  deviceMac?: string;
  // WiFi credentials for manual configuration
  wifiSsid?: string;
  wifiPassword?: string;
}

export interface GeneratedFirmware {
  code: string;
  filename: string;
  libraries: LibraryDependency[];
  warnings: string[];
}

// Collect unique libraries from all sensors
function collectLibraries(assignments: PinAssignment[], useAbly: boolean, hasManualWifi: boolean): LibraryDependency[] {
  const libraryMap = new Map<string, LibraryDependency>();

  // Only include WiFiManager if no manual WiFi credentials
  if (!hasManualWifi) {
    libraryMap.set('WiFiManager', {
      name: 'WiFiManager',
      include: '#include <WiFiManager.h>',
      github: 'https://github.com/tzapu/WiFiManager',
    });
  }

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
  const hasManualWifi = !!(config.wifiSsid && config.wifiPassword);
  const libraries = collectLibraries(config.assignments, config.useAbly, hasManualWifi);
  const warnings = checkWarnings(config.assignments, config.board, config);

  // Add warning if no WiFi credentials provided
  if (!hasManualWifi) {
    warnings.push('No WiFi credentials provided - WiFiManager provisioning will be used');
  }

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
 * ${hasManualWifi ? 'WiFi Mode: Manual Configuration (credentials hardcoded)' : 'WiFi Mode: WiFiManager Provisioning (setup hotspot)'}
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

// WiFi Configuration
${hasManualWifi ? `#define WIFI_SSID "${config.wifiSsid}"
#define WIFI_PASSWORD "${config.wifiPassword}"
#define USE_MANUAL_WIFI true` : '#define USE_MANUAL_WIFI false'}

// Server Configuration
#define SERVER_HOST "${config.serverHost}"
#define SERVER_PORT ${config.serverPort}
#define API_ENDPOINT "https://${config.serverHost}/api/telemetry"
#define HEALTHCHECK_ENDPOINT "https://${config.serverHost}/api/telemetry"
#define USE_HTTPS true

// Timing Configuration
#define SENSOR_INTERVAL ${config.sensorInterval}
#define HEARTBEAT_INTERVAL 30000
#define HEALTHCHECK_INTERVAL 60000  // Healthcheck every 60 seconds
#define WIFI_RETRY_INTERVAL 5000
#define MAX_WIFI_RETRIES 20

// Feature Toggles
#define USE_ABLY ${config.useAbly ? 'true' : 'false'}
#define ENABLE_OTA ${config.enableOTA ? 'true' : 'false'}
${config.enableDeepSleep ? `#define ENABLE_DEEP_SLEEP true\n#define DEEP_SLEEP_DURATION ${config.deepSleepDuration}` : '#define ENABLE_DEEP_SLEEP false'}
#define ENABLE_VERBOSE_LOGGING true

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
${hasManualWifi ? '' : 'WiFiManager wifiManager;'}
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

// Device identification
String deviceMac;
String apiKey;
String firmwareVersion = "2.1.0";

// Connection state
bool wifiConnected = false;
int wifiReconnectCount = 0;
int httpSuccessCount = 0;
int httpFailCount = 0;
unsigned long lastSuccessfulSend = 0;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastHealthcheck = 0;
unsigned long bootTime = 0;

// Error tracking
String lastError = "";
int consecutiveErrors = 0;

// ========== HELPER FUNCTION FOR READINGS ==========
void addReading(JsonArray& readings, const char* type, float value, const char* unit) {
  if (!isnan(value) && !isinf(value)) {
    JsonObject reading = readings.createNestedObject();
    reading["type"] = type;
    reading["value"] = value;
    reading["unit"] = unit;
  }
}

// ========== LOGGING FUNCTIONS ==========
void logInfo(const char* message) {
  #if ENABLE_VERBOSE_LOGGING
  Serial.print("[INFO] ");
  Serial.println(message);
  #endif
}

void logInfo(String message) {
  logInfo(message.c_str());
}

void logError(const char* message) {
  Serial.print("[ERROR] ");
  Serial.println(message);
  lastError = message;
  consecutiveErrors++;
}

void logError(String message) {
  logError(message.c_str());
}

void logWarning(const char* message) {
  Serial.print("[WARN] ");
  Serial.println(message);
}

void logWarning(String message) {
  logWarning(message.c_str());
}

void logDebug(const char* component, const char* message) {
  #if ENABLE_VERBOSE_LOGGING
  Serial.print("[DEBUG][");
  Serial.print(component);
  Serial.print("] ");
  Serial.println(message);
  #endif
}

void logDebug(const char* component, String message) {
  logDebug(component, message.c_str());
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);

  bootTime = millis();

  Serial.println();
  Serial.println("╔════════════════════════════════════════════════════════╗");
  Serial.println("║        AquaNexus ESP32 Firmware v" + firmwareVersion + "               ║");
  Serial.println("║        Device: " DEVICE_NAME);
  Serial.println("║        Type: " DEVICE_TYPE);
  Serial.println("╚════════════════════════════════════════════════════════╝");
  Serial.println();

  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Get device MAC address
  #ifdef DEVICE_MAC
  deviceMac = DEVICE_MAC;
  logInfo("Using configured MAC: " + deviceMac);
  #else
  deviceMac = WiFi.macAddress();
  logInfo("Auto-detected MAC: " + deviceMac);
  #endif

  // Load API key
  #ifdef API_KEY
  apiKey = API_KEY;
  if (apiKey.length() > 0) {
    logInfo("API Key configured: " + apiKey.substring(0, 8) + "...");
  } else {
    logWarning("No API key configured! Device registration required.");
  }
  #endif

  // ========== WiFi Connection ==========
  ${hasManualWifi ? `
  // Manual WiFi Configuration
  logInfo("Connecting to WiFi: " WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retryCount = 0;
  while (WiFi.status() != WL_CONNECTED && retryCount < MAX_WIFI_RETRIES) {
    delay(WIFI_RETRY_INTERVAL);
    Serial.print(".");
    retryCount++;
    logDebug("WIFI", "Connection attempt " + String(retryCount) + "/" + String(MAX_WIFI_RETRIES));
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    logError("WiFi connection failed after " + String(MAX_WIFI_RETRIES) + " attempts");
    logError("Check SSID and password configuration");
    Serial.println("Restarting in 10 seconds...");
    delay(10000);
    ESP.restart();
  }
  ` : `
  // WiFiManager Setup (Provisioning Mode)
  wifiManager.setConfigPortalTimeout(180);
  wifiManager.setAPCallback(configModeCallback);
  wifiManager.setSaveConfigCallback(saveConfigCallback);

  logInfo("Connecting to WiFi via WiFiManager...");
  logInfo("If this fails, a setup hotspot will be created.");

  if (!wifiManager.autoConnect("AquaNexus-Setup", "aquanexus123")) {
    logError("WiFiManager failed to connect and hit timeout");
    Serial.println("Restarting in 3 seconds...");
    delay(3000);
    ESP.restart();
  }
  `}

  // WiFi Connected
  wifiConnected = true;
  Serial.println();
  Serial.println("════════════════════════════════════════════════════════");
  Serial.println("✓ WiFi connected successfully!");
  Serial.println("  SSID: " + WiFi.SSID());
  Serial.println("  IP address: " + WiFi.localIP().toString());
  Serial.println("  Gateway: " + WiFi.gatewayIP().toString());
  Serial.println("  DNS: " + WiFi.dnsIP().toString());
  Serial.println("  Signal strength: " + String(WiFi.RSSI()) + " dBm");
  Serial.println("  MAC Address: " + deviceMac);
  Serial.println("════════════════════════════════════════════════════════");

  // Configure secure client for HTTPS
  secureClient.setInsecure(); // For testing - use proper certificates in production
  logDebug("HTTPS", "Secure client configured (insecure mode for testing)");

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
  Serial.println("════════════════════════════════════════════════════════");
  Serial.println();

  // Send initial healthcheck with full device info
  sendHealthcheck();

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
    logDebug("LOOP", "Reading sensors...");
    readAllSensors();
    sendSensorData();
    lastSensorRead = millis();
  }

  // Send heartbeat
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  // Send healthcheck with full device info
  if (millis() - lastHealthcheck >= HEALTHCHECK_INTERVAL) {
    sendHealthcheck();
    lastHealthcheck = millis();
  }

  #if ENABLE_OTA
  ArduinoOTA.handle();
  #endif

  #if ENABLE_DEEP_SLEEP
  if (millis() > 60000) {
    enterDeepSleep();
  }
  #endif

  // Reset consecutive errors on successful operation
  if (consecutiveErrors > 0 && httpSuccessCount > 0) {
    logInfo("Connection recovered after " + String(consecutiveErrors) + " errors");
    consecutiveErrors = 0;
  }

  delay(10);
}

${hasManualWifi ? '' : `// ========== WiFiManager CALLBACKS ==========
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
  logInfo("WiFi configuration saved!");
}
`}

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
  logDebug("HTTP", "Starting HTTPS POST to " API_ENDPOINT);

  http.begin(secureClient, API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  unsigned long startTime = millis();
  int httpCode = http.POST(payload);
  unsigned long duration = millis() - startTime;

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    httpSuccessCount++;
    lastSuccessfulSend = millis();
    consecutiveErrors = 0;
    logInfo("✓ Data sent via HTTPS (HTTP " + String(httpCode) + ", " + String(duration) + "ms)");
    logDebug("HTTP", "Response: " + response);
    blinkLED(1);
  } else if (httpCode > 0) {
    String response = http.getString();
    httpFailCount++;
    logError("HTTP Error " + String(httpCode) + ": " + response);
    logDebug("HTTP", "Failed after " + String(duration) + "ms");
    blinkLED(3);
  } else {
    httpFailCount++;
    String errorMsg = http.errorToString(httpCode);
    logError("Connection failed: " + errorMsg);
    logDebug("HTTP", "Error code: " + String(httpCode));

    // Additional diagnostics for connection failures
    if (httpCode == -1) {
      logDebug("HTTP", "Possible causes: DNS failure, server unreachable, or TLS handshake failed");
    } else if (httpCode == -11) {
      logDebug("HTTP", "Connection timed out - check network or server status");
    }
    blinkLED(5);
  }

  http.end();
}

void sendHeartbeat() {
  if (apiKey.length() == 0) {
    logDebug("HEARTBEAT", "Skipping - no API key configured");
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
    logInfo("✓ Heartbeat sent via MQTT");
    return;
  }
  ` : ''}

  // Send via HTTPS
  http.begin(secureClient, API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int httpCode = http.POST(payload);
  if (httpCode == 200 || httpCode == 201) {
    logInfo("✓ Heartbeat sent");
  } else {
    logDebug("HEARTBEAT", "Failed with code: " + String(httpCode));
  }
  http.end();
}

// ========== COMPREHENSIVE HEALTHCHECK ==========
// Sends complete device information for dashboard monitoring
void sendHealthcheck() {
  if (apiKey.length() == 0) {
    logDebug("HEALTHCHECK", "Skipping - no API key configured");
    return;
  }

  logInfo("Sending healthcheck with device info...");

  DynamicJsonDocument doc(2048);

  // Basic identification
  doc["apiKey"] = apiKey;
  doc["deviceMac"] = deviceMac;
  doc["readingType"] = "healthcheck";
  doc["timestamp"] = getISOTimestamp();

  // Device Information
  JsonObject deviceInfo = doc.createNestedObject("deviceInfo");
  deviceInfo["name"] = DEVICE_NAME;
  deviceInfo["type"] = DEVICE_TYPE;
  deviceInfo["mac"] = deviceMac;
  deviceInfo["firmware"] = firmwareVersion;
  deviceInfo["board"] = "${config.board.name}";
  deviceInfo["chipId"] = String((uint32_t)ESP.getEfuseMac(), HEX);

  // System Status
  JsonObject systemStatus = doc.createNestedObject("systemStatus");
  systemStatus["freeHeap"] = ESP.getFreeHeap();
  systemStatus["heapSize"] = ESP.getHeapSize();
  systemStatus["minFreeHeap"] = ESP.getMinFreeHeap();
  systemStatus["uptime"] = (millis() - bootTime) / 1000;  // seconds
  systemStatus["cpuFreq"] = ESP.getCpuFreqMHz();

  // WiFi Status
  JsonObject wifiStatus = doc.createNestedObject("wifiStatus");
  wifiStatus["connected"] = (WiFi.status() == WL_CONNECTED);
  wifiStatus["ssid"] = WiFi.SSID();
  wifiStatus["rssi"] = WiFi.RSSI();
  wifiStatus["ip"] = WiFi.localIP().toString();
  wifiStatus["gateway"] = WiFi.gatewayIP().toString();
  wifiStatus["dns"] = WiFi.dnsIP().toString();
  wifiStatus["reconnectCount"] = wifiReconnectCount;

  // Connection Statistics
  JsonObject connStats = doc.createNestedObject("connectionStats");
  connStats["httpSuccessCount"] = httpSuccessCount;
  connStats["httpFailCount"] = httpFailCount;
  connStats["consecutiveErrors"] = consecutiveErrors;
  connStats["lastSuccessfulSend"] = lastSuccessfulSend > 0 ? (millis() - lastSuccessfulSend) / 1000 : -1;
  connStats["lastError"] = lastError;

  // Configuration
  JsonObject config = doc.createNestedObject("config");
  config["serverHost"] = SERVER_HOST;
  config["serverPort"] = SERVER_PORT;
  config["sensorInterval"] = SENSOR_INTERVAL;
  config["useAbly"] = USE_ABLY;
  config["enableOTA"] = ENABLE_OTA;
  config["useManualWifi"] = USE_MANUAL_WIFI;

  String payload;
  serializeJson(doc, payload);

  logDebug("HEALTHCHECK", "Payload size: " + String(payload.length()) + " bytes");

  ${config.useAbly ? `
  if (mqtt.connected()) {
    String topic = "aquanexus/" + deviceMac + "/healthcheck";
    if (mqtt.publish(topic.c_str(), payload.c_str())) {
      logInfo("✓ Healthcheck sent via MQTT");
      return;
    }
  }
  ` : ''}

  // Send via HTTPS
  http.begin(secureClient, HEALTHCHECK_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);  // Longer timeout for healthcheck

  unsigned long startTime = millis();
  int httpCode = http.POST(payload);
  unsigned long duration = millis() - startTime;

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    logInfo("✓ Healthcheck sent successfully (HTTP " + String(httpCode) + ", " + String(duration) + "ms)");
    logDebug("HEALTHCHECK", "Response: " + response);
  } else if (httpCode > 0) {
    String response = http.getString();
    logError("Healthcheck failed (HTTP " + String(httpCode) + "): " + response);
  } else {
    logError("Healthcheck connection failed: " + http.errorToString(httpCode));
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
  static int localReconnectAttempts = 0;

  wifiConnected = false;

  if (millis() - lastReconnectAttempt > 10000) {
    localReconnectAttempts++;
    wifiReconnectCount++;

    logWarning("WiFi disconnected. Attempting reconnection... (attempt " + String(localReconnectAttempts) + ")");
    logDebug("WIFI", "Total reconnect count: " + String(wifiReconnectCount));

    WiFi.disconnect();
    delay(100);

    ${hasManualWifi ? `
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    ` : `
    WiFi.reconnect();
    `}

    lastReconnectAttempt = millis();

    // If too many failures, restart the device
    if (localReconnectAttempts > 30) {
      logError("WiFi reconnection failed after 30 attempts. Restarting...");
      delay(1000);
      ESP.restart();
    }
  }

  // Check if reconnected
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    localReconnectAttempts = 0;
    logInfo("WiFi reconnected! IP: " + WiFi.localIP().toString());
    sendHealthcheck();  // Send healthcheck after reconnection
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
