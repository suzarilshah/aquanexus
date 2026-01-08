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
  sensorInterval: number;
  enableOTA: boolean;
  enableDeepSleep: boolean;
  deepSleepDuration: number;
}

export interface GeneratedFirmware {
  code: string;
  filename: string;
  libraries: LibraryDependency[];
  warnings: string[];
}

// Collect unique libraries from all sensors
function collectLibraries(assignments: PinAssignment[]): LibraryDependency[] {
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

// Generate JSON payload creation code
function generateJsonPayload(assignments: PinAssignment[], deviceType: string): string {
  const payloadLines: string[] = [];

  for (const assignment of assignments) {
    const gpio = assignment.gpio;
    const sensorId = assignment.sensor.id;

    // Map sensor readings to JSON fields based on sensor type
    switch (sensorId) {
      case 'ds18b20':
        payloadLines.push(`  doc["data"]["temperature"] = temperature_${gpio};`);
        break;
      case 'dht22':
      case 'dht11':
        payloadLines.push(`  doc["data"]["temperature"] = dhtTemp_${gpio};`);
        payloadLines.push(`  doc["data"]["humidity"] = dhtHumidity_${gpio};`);
        break;
      case 'ph-sensor':
        payloadLines.push(`  doc["data"]["ph"] = phValue_${gpio};`);
        break;
      case 'tds-sensor':
        payloadLines.push(`  doc["data"]["tds"] = tdsValue_${gpio};`);
        break;
      case 'turbidity-sensor':
        payloadLines.push(`  doc["data"]["turbidity"] = turbidityNTU_${gpio};`);
        break;
      case 'dissolved-oxygen':
        payloadLines.push(`  doc["data"]["dissolvedOxygen"] = dissolvedOxygen_${gpio};`);
        break;
      case 'water-level':
        payloadLines.push(`  doc["data"]["waterLevel"] = waterLevel_${gpio};`);
        break;
      case 'soil-moisture':
        payloadLines.push(`  doc["data"]["soilMoisture"] = soilMoisture_${gpio};`);
        break;
      case 'bme280':
        payloadLines.push(`  doc["data"]["temperature"] = bmeTemp;`);
        payloadLines.push(`  doc["data"]["humidity"] = bmeHumidity;`);
        payloadLines.push(`  doc["data"]["pressure"] = bmePressure;`);
        break;
      case 'ldr':
        payloadLines.push(`  doc["data"]["lightLevel"] = lightLevel_${gpio};`);
        break;
      case 'bh1750':
        payloadLines.push(`  doc["data"]["lux"] = luxValue;`);
        break;
      case 'hcsr04':
        payloadLines.push(`  doc["data"]["distance"] = distance_${gpio};`);
        break;
      case 'relay':
        payloadLines.push(`  doc["data"]["relay_${gpio}"] = relayState_${gpio};`);
        break;
      case 'pump':
        payloadLines.push(`  doc["data"]["pump_${gpio}"] = pumpState_${gpio};`);
        break;
    }
  }

  return payloadLines.join('\n');
}

// Check for warnings based on pin assignments
function checkWarnings(assignments: PinAssignment[], board: BoardDefinition): string[] {
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

  return warnings;
}

export function generateFirmware(config: FirmwareConfig): GeneratedFirmware {
  const libraries = collectLibraries(config.assignments);
  const warnings = checkWarnings(config.assignments, config.board);

  const includeStatements = libraries.map(lib => lib.include).join('\n');
  const variableDeclarations = generateVariableDeclarations(config.assignments);
  const setupCode = generateSetupCode(config.assignments);
  const loopCode = generateLoopCode(config.assignments);
  const jsonPayload = generateJsonPayload(config.assignments, config.deviceType);

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
#include <HTTPClient.h>
#include <WebSocketsClient.h>
${includeStatements}

// ========== CONFIGURATION ==========
#define DEVICE_NAME "${config.deviceName}"
#define DEVICE_TYPE "${config.deviceType}"
#define SERVER_HOST "${config.serverHost}"
#define SERVER_PORT ${config.serverPort}
#define SENSOR_INTERVAL ${config.sensorInterval}
#define USE_WEBSOCKET ${config.useWebSocket ? 'true' : 'false'}
#define ENABLE_OTA ${config.enableOTA ? 'true' : 'false'}
${config.enableDeepSleep ? `#define ENABLE_DEEP_SLEEP true\n#define DEEP_SLEEP_DURATION ${config.deepSleepDuration}` : '#define ENABLE_DEEP_SLEEP false'}

// Built-in LED for status indication
#define LED_PIN 2

// ========== SENSOR VARIABLES ==========
${variableDeclarations}

// ========== SYSTEM VARIABLES ==========
WiFiManager wifiManager;
WebSocketsClient webSocket;
HTTPClient http;
Preferences preferences;

String deviceId;
String apiKey;
String deviceMac;
bool isProvisioned = false;
bool wifiConnected = false;

unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 30000;

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("===========================================");
  Serial.println("   AquaNexus ESP32 - " DEVICE_NAME);
  Serial.println("===========================================");
  Serial.println();

  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Get device MAC address
  deviceMac = WiFi.macAddress();
  Serial.println("Device MAC: " + deviceMac);

  // Initialize preferences
  preferences.begin("aquanexus", false);
  loadCredentials();

  // ========== WiFiManager Setup (Provisioning Mode) ==========
  // This creates a captive portal if WiFi is not configured
  // The user connects to "AquaNexus-Setup" hotspot to configure WiFi

  wifiManager.setConfigPortalTimeout(180); // 3 minute timeout
  wifiManager.setAPCallback(configModeCallback);
  wifiManager.setSaveConfigCallback(saveConfigCallback);

  // Custom parameters can be added here if needed
  // WiFiManagerParameter custom_server("server", "Server Host", SERVER_HOST, 40);
  // wifiManager.addParameter(&custom_server);

  // Try to connect, if it fails, start config portal
  Serial.println("Connecting to WiFi...");
  Serial.println("If this fails, a setup hotspot will be created.");
  Serial.println();

  if (!wifiManager.autoConnect("AquaNexus-Setup", "aquanexus123")) {
    Serial.println("Failed to connect and hit timeout");
    Serial.println("Restarting in 3 seconds...");
    delay(3000);
    ESP.restart();
  }

  // If we get here, we're connected to WiFi
  wifiConnected = true;
  Serial.println();
  Serial.println("WiFi connected successfully!");
  Serial.println("IP address: " + WiFi.localIP().toString());
  Serial.println("Signal strength: " + String(WiFi.RSSI()) + " dBm");

  // Blink LED to indicate successful connection
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }

  // Initialize sensors
  initializeSensors();

  // Register device with server if not provisioned
  if (!isProvisioned) {
    Serial.println("Device not provisioned. Starting registration...");
    performDeviceRegistration();
  } else {
    Serial.println("Device already provisioned.");
    Serial.println("Device ID: " + deviceId);
  }

  // Connect to server
  if (isProvisioned && USE_WEBSOCKET) {
    connectWebSocket();
  }

  #if ENABLE_OTA
  setupOTA();
  #endif

  Serial.println();
  Serial.println("Setup complete! Starting main loop...");
  Serial.println("===========================================");
  Serial.println();
}

// ========== MAIN LOOP ==========
void loop() {
  // Handle WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiReconnection();
    return;
  }

  // WebSocket loop
  if (USE_WEBSOCKET && isProvisioned) {
    webSocket.loop();
  }

  // Read sensors at specified interval
  if (millis() - lastSensorRead >= SENSOR_INTERVAL && isProvisioned) {
    readAllSensors();
    sendSensorData();
    lastSensorRead = millis();
  }

  // Send heartbeat
  if (millis() - lastHeartbeat >= heartbeatInterval && isProvisioned) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  #if ENABLE_OTA
  ArduinoOTA.handle();
  #endif

  #if ENABLE_DEEP_SLEEP
  if (millis() > 60000) { // After 1 minute, enter deep sleep
    enterDeepSleep();
  }
  #endif

  delay(10);
}

// ========== WiFiManager CALLBACKS ==========
void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println();
  Serial.println("===========================================");
  Serial.println("  WIFI SETUP MODE ACTIVATED");
  Serial.println("===========================================");
  Serial.println();
  Serial.println("1. Connect to WiFi network: AquaNexus-Setup");
  Serial.println("2. Password: aquanexus123");
  Serial.println("3. Open browser and go to: 192.168.4.1");
  Serial.println("4. Select your WiFi network and enter password");
  Serial.println();
  Serial.println("Hotspot IP: " + WiFi.softAPIP().toString());
  Serial.println("===========================================");

  // Slow blink to indicate config mode
  digitalWrite(LED_PIN, HIGH);
}

void saveConfigCallback() {
  Serial.println("WiFi configuration saved!");
}

// ========== SENSOR INITIALIZATION ==========
void initializeSensors() {
  Serial.println("Initializing sensors...");
${setupCode}
  Serial.println("All sensors initialized.");
}

// ========== SENSOR READING ==========
void readAllSensors() {
${loopCode}
}

// ========== DATA TRANSMISSION ==========
void sendSensorData() {
  DynamicJsonDocument doc(2048);

  doc["type"] = "sensor_data";
  doc["deviceId"] = deviceId;
  doc["deviceMac"] = deviceMac;
  doc["deviceType"] = DEVICE_TYPE;
  doc["timestamp"] = millis();

${jsonPayload}

  String payload;
  serializeJson(doc, payload);

  if (USE_WEBSOCKET && webSocket.isConnected()) {
    webSocket.sendTXT(payload);
    Serial.println("Data sent via WebSocket");
  } else {
    sendViaHTTP(payload);
  }
}

void sendViaHTTP(String payload) {
  String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + "/api/telemetry";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + apiKey);

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println("Data sent via HTTP");
  } else {
    Serial.println("HTTP POST failed: " + String(httpCode));
  }

  http.end();
}

void sendHeartbeat() {
  DynamicJsonDocument doc(512);

  doc["type"] = "heartbeat";
  doc["deviceId"] = deviceId;
  doc["deviceMac"] = deviceMac;
  doc["timestamp"] = millis();
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["wifiRSSI"] = WiFi.RSSI();
  doc["wifiSSID"] = WiFi.SSID();

  String payload;
  serializeJson(doc, payload);

  if (USE_WEBSOCKET && webSocket.isConnected()) {
    webSocket.sendTXT(payload);
  }

  Serial.println("Heartbeat sent");
}

// ========== DEVICE REGISTRATION ==========
void performDeviceRegistration() {
  DynamicJsonDocument doc(1024);

  doc["deviceMac"] = deviceMac;
  doc["deviceName"] = DEVICE_NAME;
  doc["deviceType"] = DEVICE_TYPE;
  doc["firmwareVersion"] = "2.0.0";

  String payload;
  serializeJson(doc, payload);

  String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + "/api/devices";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();

    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);

    if (responseDoc.containsKey("id")) {
      deviceId = responseDoc["id"].as<String>();
      apiKey = responseDoc["apiKey"].as<String>();

      // Save credentials
      preferences.putString("deviceId", deviceId);
      preferences.putString("apiKey", apiKey);

      isProvisioned = true;
      Serial.println("Device registered successfully!");
      Serial.println("Device ID: " + deviceId);
    }
  } else {
    Serial.println("Registration failed: " + String(httpCode));
  }

  http.end();
}

// ========== CREDENTIAL MANAGEMENT ==========
void loadCredentials() {
  deviceId = preferences.getString("deviceId", "");
  apiKey = preferences.getString("apiKey", "");

  isProvisioned = (deviceId.length() > 0 && apiKey.length() > 0);

  if (isProvisioned) {
    Serial.println("Loaded stored credentials");
    Serial.println("Device ID: " + deviceId);
  }
}

void clearCredentials() {
  preferences.clear();
  deviceId = "";
  apiKey = "";
  isProvisioned = false;
  Serial.println("Credentials cleared");
}

// ========== WEBSOCKET ==========
void connectWebSocket() {
  Serial.println("Connecting to WebSocket server...");

  webSocket.begin(SERVER_HOST, SERVER_PORT, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket disconnected");
      break;

    case WStype_CONNECTED:
      Serial.println("WebSocket connected");
      // Send authentication
      {
        DynamicJsonDocument authDoc(256);
        authDoc["type"] = "auth";
        authDoc["deviceId"] = deviceId;
        authDoc["apiKey"] = apiKey;

        String authMsg;
        serializeJson(authDoc, authMsg);
        webSocket.sendTXT(authMsg);
      }
      break;

    case WStype_TEXT:
      handleWebSocketMessage(String((char *)payload));
      break;

    case WStype_ERROR:
      Serial.println("WebSocket error");
      break;

    default:
      break;
  }
}

void handleWebSocketMessage(String message) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);

  String type = doc["type"].as<String>();

  if (type == "command") {
    String command = doc["command"].as<String>();
    handleCommand(command, doc);
  } else if (type == "auth_success") {
    Serial.println("WebSocket authentication successful");
  }
}

void handleCommand(String command, DynamicJsonDocument &doc) {
  if (command == "restart") {
    Serial.println("Restart command received");
    delay(1000);
    ESP.restart();
  } else if (command == "reset_wifi") {
    Serial.println("WiFi reset command received");
    wifiManager.resetSettings();
    delay(1000);
    ESP.restart();
  } else if (command == "get_status") {
    sendDeviceStatus();
  }
}

void sendDeviceStatus() {
  DynamicJsonDocument doc(512);

  doc["type"] = "device_status";
  doc["deviceId"] = deviceId;
  doc["deviceMac"] = deviceMac;
  doc["deviceType"] = DEVICE_TYPE;
  doc["deviceName"] = DEVICE_NAME;
  doc["wifiSSID"] = WiFi.SSID();
  doc["wifiRSSI"] = WiFi.RSSI();
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["uptime"] = millis() / 1000;

  String payload;
  serializeJson(doc, payload);

  if (webSocket.isConnected()) {
    webSocket.sendTXT(payload);
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
  Serial.println("OTA updates enabled");
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
