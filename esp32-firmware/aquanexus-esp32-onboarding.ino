/*
 * AquaNexus ESP32 Onboarding and Sensor Data Transmission
 * 
 * This firmware implements:
 * - Secure device onboarding with credential provisioning
 * - WiFi connection management
 * - Sensor data collection and transmission
 * - WebSocket and HTTP communication
 * - Device authentication with API keys
 * - Real-time data streaming
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFiClientSecure.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Pin definitions
#define TEMP_SENSOR_PIN 4
#define PH_SENSOR_PIN A0
#define TURBIDITY_SENSOR_PIN A1
#define DO_SENSOR_PIN A2
#define SOIL_MOISTURE_PIN A3
#define LIGHT_SENSOR_PIN A4
#define HUMIDITY_SENSOR_PIN A5
#define LED_PIN 2
#define BUTTON_PIN 0

// Temperature sensor setup
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature temperatureSensor(&oneWire);

// Network configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* serverHost = "localhost"; // Change to your server IP
const int serverPort = 5173;
const char* apiEndpoint = "/api/esp32";
const char* wsEndpoint = "/ws";

// Device configuration
String deviceMac;
String deviceId;
String apiKey;
String deviceType = "fish"; // or "plant"
bool isOnboarded = false;
bool useWebSocket = true;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long sensorInterval = 5000; // 5 seconds
const unsigned long heartbeatInterval = 30000; // 30 seconds
const unsigned long reconnectInterval = 10000; // 10 seconds

// Objects
Preferences preferences;
WebSocketsClient webSocket;
HTTPClient http;
WiFiClientSecure secureClient;

// Sensor data structure
struct SensorData {
  float temperature;
  float ph;
  float turbidity;
  float dissolvedOxygen;
  float soilMoisture;
  float lightLevel;
  float humidity;
  unsigned long timestamp;
};

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== AquaNexus ESP32 Starting ===");
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Initialize sensors
  temperatureSensor.begin();
  
  // Get device MAC address
  deviceMac = WiFi.macAddress();
  Serial.println("Device MAC: " + deviceMac);
  
  // Initialize preferences
  preferences.begin("aquanexus", false);
  
  // Load stored credentials
  loadCredentials();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Check onboarding status
  if (!isOnboarded) {
    Serial.println("Device not onboarded. Starting onboarding process...");
    performOnboarding();
  } else {
    Serial.println("Device already onboarded. Connecting to server...");
    connectToServer();
  }
  
  Serial.println("Setup complete!");
}

void loop() {
  // Handle WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiReconnection();
    return;
  }
  
  // Handle WebSocket events
  if (useWebSocket && isOnboarded) {
    webSocket.loop();
  }
  
  // Read and send sensor data
  if (millis() - lastSensorRead >= sensorInterval && isOnboarded) {
    SensorData data = readSensors();
    sendSensorData(data);
    lastSensorRead = millis();
  }
  
  // Send heartbeat
  if (millis() - lastHeartbeat >= heartbeatInterval && isOnboarded) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // Handle button press for re-onboarding
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      Serial.println("Button pressed - starting re-onboarding...");
      clearCredentials();
      ESP.restart();
    }
  }
  
  delay(100);
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.println("IP address: " + WiFi.localIP().toString());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\nWiFi connection failed!");
    digitalWrite(LED_PIN, LOW);
  }
}

void handleWiFiReconnection() {
  if (millis() - lastReconnectAttempt >= reconnectInterval) {
    Serial.println("Attempting WiFi reconnection...");
    connectToWiFi();
    lastReconnectAttempt = millis();
  }
}

void loadCredentials() {
  deviceId = preferences.getString("deviceId", "");
  apiKey = preferences.getString("apiKey", "");
  deviceType = preferences.getString("deviceType", "fish");
  
  isOnboarded = (deviceId.length() > 0 && apiKey.length() > 0);
  
  if (isOnboarded) {
    Serial.println("Loaded credentials:");
    Serial.println("Device ID: " + deviceId);
    Serial.println("Device Type: " + deviceType);
    Serial.println("API Key: " + apiKey.substring(0, 8) + "...");
  }
}

void clearCredentials() {
  preferences.clear();
  deviceId = "";
  apiKey = "";
  isOnboarded = false;
  Serial.println("Credentials cleared");
}

void performOnboarding() {
  Serial.println("Starting device onboarding...");
  
  // Create onboarding request
  DynamicJsonDocument doc(1024);
  doc["deviceMac"] = deviceMac;
  doc["deviceType"] = deviceType;
  doc["firmwareVersion"] = "1.0.0";
  doc["capabilities"] = JsonArray();
  
  if (deviceType == "fish") {
    doc["capabilities"].add("temperature");
    doc["capabilities"].add("ph");
    doc["capabilities"].add("turbidity");
    doc["capabilities"].add("dissolvedOxygen");
  } else {
    doc["capabilities"].add("temperature");
    doc["capabilities"].add("soilMoisture");
    doc["capabilities"].add("lightLevel");
    doc["capabilities"].add("humidity");
  }
  
  String payload;
  serializeJson(doc, payload);
  
  // Send onboarding request
  http.begin("http://" + String(serverHost) + ":" + String(serverPort) + "/api/esp32/onboard");
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Onboarding response: " + response);
    
    // Parse response
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);
    
    if (responseDoc["success"].as<bool>()) {
      deviceId = responseDoc["deviceId"].as<String>();
      apiKey = responseDoc["apiKey"].as<String>();
      
      // Store credentials
      preferences.putString("deviceId", deviceId);
      preferences.putString("apiKey", apiKey);
      preferences.putString("deviceType", deviceType);
      
      isOnboarded = true;
      Serial.println("Onboarding successful!");
      Serial.println("Device ID: " + deviceId);
      
      // Connect to server
      connectToServer();
    } else {
      Serial.println("Onboarding failed: " + responseDoc["error"].as<String>());
    }
  } else {
    Serial.println("Onboarding request failed. HTTP code: " + String(httpResponseCode));
  }
  
  http.end();
}

void connectToServer() {
  if (useWebSocket) {
    connectWebSocket();
  }
  Serial.println("Connected to server");
}

void connectWebSocket() {
  Serial.println("Connecting to WebSocket...");
  
  webSocket.begin(serverHost, serverPort, wsEndpoint);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  // Send authentication after connection
  webSocket.setAuthorization(apiKey.c_str());
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      break;
      
    case WStype_CONNECTED:
      Serial.println("WebSocket Connected to: " + String((char*)payload));
      
      // Send authentication message
      DynamicJsonDocument authDoc(256);
      authDoc["type"] = "auth";
      authDoc["deviceId"] = deviceId;
      authDoc["apiKey"] = apiKey;
      
      String authMessage;
      serializeJson(authDoc, authMessage);
      webSocket.sendTXT(authMessage);
      break;
      
    case WStype_TEXT:
      Serial.println("WebSocket message: " + String((char*)payload));
      handleWebSocketMessage(String((char*)payload));
      break;
      
    case WStype_ERROR:
      Serial.println("WebSocket Error");
      break;
      
    default:
      break;
  }
}

void handleWebSocketMessage(String message) {
  DynamicJsonDocument doc(512);
  deserializeJson(doc, message);
  
  String type = doc["type"];
  
  if (type == "auth_success") {
    Serial.println("WebSocket authentication successful");
  } else if (type == "auth_failed") {
    Serial.println("WebSocket authentication failed");
  } else if (type == "command") {
    String command = doc["command"];
    handleCommand(command, doc);
  }
}

void handleCommand(String command, DynamicJsonDocument& doc) {
  if (command == "get_status") {
    sendDeviceStatus();
  } else if (command == "set_interval") {
    // Update sensor reading interval
    // Implementation depends on requirements
  } else if (command == "restart") {
    Serial.println("Restart command received");
    ESP.restart();
  }
}

SensorData readSensors() {
  SensorData data;
  data.timestamp = millis();
  
  // Read temperature
  temperatureSensor.requestTemperatures();
  data.temperature = temperatureSensor.getTempCByIndex(0);
  
  if (deviceType == "fish") {
    // Fish tank sensors
    data.ph = readPHSensor();
    data.turbidity = readTurbiditySensor();
    data.dissolvedOxygen = readDOSensor();
    data.soilMoisture = 0;
    data.lightLevel = 0;
    data.humidity = 0;
  } else {
    // Plant sensors
    data.soilMoisture = readSoilMoistureSensor();
    data.lightLevel = readLightSensor();
    data.humidity = readHumiditySensor();
    data.ph = 0;
    data.turbidity = 0;
    data.dissolvedOxygen = 0;
  }
  
  return data;
}

float readPHSensor() {
  int rawValue = analogRead(PH_SENSOR_PIN);
  // Convert to pH value (calibration needed)
  float voltage = rawValue * (3.3 / 4095.0);
  float ph = 7.0 + ((2.5 - voltage) / 0.18); // Simplified conversion
  return constrain(ph, 0, 14);
}

float readTurbiditySensor() {
  int rawValue = analogRead(TURBIDITY_SENSOR_PIN);
  // Convert to NTU (calibration needed)
  float voltage = rawValue * (3.3 / 4095.0);
  float turbidity = (voltage - 2.5) * 1000; // Simplified conversion
  return max(turbidity, 0.0);
}

float readDOSensor() {
  int rawValue = analogRead(DO_SENSOR_PIN);
  // Convert to mg/L (calibration needed)
  float voltage = rawValue * (3.3 / 4095.0);
  float dissolvedOxygen = voltage * 4; // Simplified conversion
  return max(dissolvedOxygen, 0.0);
}

float readSoilMoistureSensor() {
  int rawValue = analogRead(SOIL_MOISTURE_PIN);
  // Convert to percentage
  float moisture = map(rawValue, 0, 4095, 0, 100);
  return constrain(moisture, 0, 100);
}

float readLightSensor() {
  int rawValue = analogRead(LIGHT_SENSOR_PIN);
  // Convert to lux (calibration needed)
  float lightLevel = map(rawValue, 0, 4095, 0, 2000);
  return max(lightLevel, 0.0);
}

float readHumiditySensor() {
  int rawValue = analogRead(HUMIDITY_SENSOR_PIN);
  // Convert to percentage
  float humidity = map(rawValue, 0, 4095, 0, 100);
  return constrain(humidity, 0, 100);
}

void sendSensorData(SensorData data) {
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["type"] = "sensor_data";
  doc["deviceId"] = deviceId;
  doc["deviceMac"] = deviceMac;
  doc["deviceType"] = deviceType;
  doc["timestamp"] = data.timestamp;
  
  if (deviceType == "fish") {
    doc["data"]["temperature"] = data.temperature;
    doc["data"]["ph"] = data.ph;
    doc["data"]["turbidity"] = data.turbidity;
    doc["data"]["dissolvedOxygen"] = data.dissolvedOxygen;
  } else {
    doc["data"]["temperature"] = data.temperature;
    doc["data"]["soilMoisture"] = data.soilMoisture;
    doc["data"]["lightLevel"] = data.lightLevel;
    doc["data"]["humidity"] = data.humidity;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  if (useWebSocket && webSocket.isConnected()) {
    webSocket.sendTXT(payload);
    Serial.println("Sensor data sent via WebSocket");
  } else {
    sendDataViaHTTP(payload);
  }
}

void sendDataViaHTTP(String payload) {
  http.begin("http://" + String(serverHost) + ":" + String(serverPort) + "/api/esp32/data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + apiKey);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    Serial.println("Sensor data sent via HTTP");
  } else {
    Serial.println("HTTP request failed. Code: " + String(httpResponseCode));
  }
  
  http.end();
}

void sendHeartbeat() {
  DynamicJsonDocument doc(256);
  doc["type"] = "heartbeat";
  doc["deviceId"] = deviceId;
  doc["deviceMac"] = deviceMac;
  doc["timestamp"] = millis();
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["wifiRSSI"] = WiFi.RSSI();
  
  String payload;
  serializeJson(doc, payload);
  
  if (useWebSocket && webSocket.isConnected()) {
    webSocket.sendTXT(payload);
  } else {
    sendDataViaHTTP(payload);
  }
  
  Serial.println("Heartbeat sent");
}

void sendDeviceStatus() {
  DynamicJsonDocument doc(512);
  doc["type"] = "device_status";
  doc["deviceId"] = deviceId;
  doc["deviceMac"] = deviceMac;
  doc["deviceType"] = deviceType;
  doc["isOnboarded"] = isOnboarded;
  doc["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
  doc["wifiSSID"] = WiFi.SSID();
  doc["wifiRSSI"] = WiFi.RSSI();
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["firmwareVersion"] = "1.0.0";
  
  String payload;
  serializeJson(doc, payload);
  
  if (useWebSocket && webSocket.isConnected()) {
    webSocket.sendTXT(payload);
  }
  
  Serial.println("Device status sent");
}