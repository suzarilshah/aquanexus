/*
 * AquaNexus Fish Environment Monitor
 * ESP32 Firmware for Fish Tank Monitoring
 * 
 * Monitors: Temperature, pH, Dissolved Oxygen, Turbidity, Water Level
 * Connects to AquaNexus monitoring system via WiFi
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <EEPROM.h>
#include <HTTPClient.h>

// Pin Definitions
#define TEMP_SENSOR_PIN 4
#define PH_SENSOR_PIN A0
#define DO_SENSOR_PIN A1
#define TURBIDITY_SENSOR_PIN A2
#define WATER_LEVEL_PIN A3
#define LED_PIN 2
#define BUZZER_PIN 5

// Network Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* websocket_server = "ws.airail.uk";
const int websocket_port = 443;
const char* api_endpoint = "https://cloud.appwrite.io/v1";

// Device Configuration
String deviceMac;
String deviceId = "fish-monitor-001";
String deviceType = "fish";
String apiKey = "";

// Sensor Objects
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature tempSensor(&oneWire);

// WebSocket Client
WebSocketsClient webSocket;

// Timing Variables
unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;
const unsigned long SENSOR_INTERVAL = 30000; // 30 seconds
const unsigned long HEARTBEAT_INTERVAL = 60000; // 1 minute

// Sensor Data Structure
struct SensorData {
  float temperature;
  float ph;
  float dissolvedOxygen;
  float turbidity;
  float waterLevel;
  unsigned long timestamp;
};

// Calibration Values (stored in EEPROM)
struct CalibrationData {
  float phOffset;
  float phSlope;
  float doOffset;
  float doSlope;
  float turbidityOffset;
  float turbiditySlope;
};

CalibrationData calibration;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Get device MAC address
  deviceMac = WiFi.macAddress();
  
  // Initialize EEPROM and load calibration
  EEPROM.begin(512);
  loadCalibration();
  
  // Initialize temperature sensor
  tempSensor.begin();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize WebSocket connection
  initWebSocket();
  
  // Register device with server
  registerDevice();
  
  Serial.println("Fish Monitor initialized successfully!");
  blinkLED(3, 200);
}

void loop() {
  webSocket.loop();
  
  unsigned long currentTime = millis();
  
  // Read sensors periodically
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
    SensorData data = readSensors();
    sendSensorData(data);
    checkAlerts(data);
    lastSensorRead = currentTime;
  }
  
  // Send heartbeat
  if (currentTime - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = currentTime;
  }
  
  delay(1000);
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void initWebSocket() {
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      break;
      
    case WStype_CONNECTED:
      Serial.printf("WebSocket Connected to: %s\n", payload);
      // Send device info on connection
      sendDeviceInfo();
      break;
      
    case WStype_TEXT:
      Serial.printf("Received: %s\n", payload);
      handleWebSocketMessage((char*)payload);
      break;
      
    default:
      break;
  }
}

void handleWebSocketMessage(String message) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);
  
  String type = doc["type"];
  
  if (type == "calibrate") {
    String sensor = doc["sensor"];
    float value = doc["value"];
    calibrateSensor(sensor, value);
  } else if (type == "config") {
    // Handle configuration updates
    if (doc.containsKey("interval")) {
      // Update sensor reading interval
    }
  }
}

SensorData readSensors() {
  SensorData data;
  data.timestamp = millis();
  
  // Read temperature
  tempSensor.requestTemperatures();
  data.temperature = tempSensor.getTempCByIndex(0);
  
  // Read pH (with calibration)
  int phRaw = analogRead(PH_SENSOR_PIN);
  float phVoltage = phRaw * (3.3 / 4095.0);
  data.ph = (phVoltage * calibration.phSlope) + calibration.phOffset;
  
  // Read Dissolved Oxygen (with calibration)
  int doRaw = analogRead(DO_SENSOR_PIN);
  float doVoltage = doRaw * (3.3 / 4095.0);
  data.dissolvedOxygen = (doVoltage * calibration.doSlope) + calibration.doOffset;
  
  // Read Turbidity (with calibration)
  int turbidityRaw = analogRead(TURBIDITY_SENSOR_PIN);
  float turbidityVoltage = turbidityRaw * (3.3 / 4095.0);
  data.turbidity = (turbidityVoltage * calibration.turbiditySlope) + calibration.turbidityOffset;
  
  // Read Water Level
  int waterLevelRaw = analogRead(WATER_LEVEL_PIN);
  data.waterLevel = map(waterLevelRaw, 0, 4095, 0, 100); // Convert to percentage
  
  return data;
}

void sendSensorData(SensorData data) {
  DynamicJsonDocument doc(1024);
  
  doc["type"] = "sensor_data";
  doc["deviceMac"] = deviceMac;
  doc["deviceId"] = deviceId;
  doc["deviceType"] = deviceType;
  doc["timestamp"] = data.timestamp;
  
  JsonObject readings = doc.createNestedObject("readings");
  readings["temperature"] = data.temperature;
  readings["ph"] = data.ph;
  readings["dissolvedOxygen"] = data.dissolvedOxygen;
  readings["turbidity"] = data.turbidity;
  readings["waterLevel"] = data.waterLevel;
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
  
  // Also log to serial
  Serial.println("Sensor Data:");
  Serial.printf("Temperature: %.2f°C\n", data.temperature);
  Serial.printf("pH: %.2f\n", data.ph);
  Serial.printf("Dissolved Oxygen: %.2f mg/L\n", data.dissolvedOxygen);
  Serial.printf("Turbidity: %.2f NTU\n", data.turbidity);
  Serial.printf("Water Level: %.1f%%\n", data.waterLevel);
}

void sendHeartbeat() {
  DynamicJsonDocument doc(512);
  
  doc["type"] = "heartbeat";
  doc["deviceMac"] = deviceMac;
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["status"] = "online";
  doc["wifiSignal"] = WiFi.RSSI();
  doc["freeHeap"] = ESP.getFreeHeap();
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
}

void sendDeviceInfo() {
  DynamicJsonDocument doc(512);
  
  doc["type"] = "device_info";
  doc["deviceMac"] = deviceMac;
  doc["deviceId"] = deviceId;
  doc["deviceType"] = deviceType;
  doc["firmware"] = "1.0.0";
  doc["sensors"] = "temperature,ph,dissolvedOxygen,turbidity,waterLevel";
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
}

void checkAlerts(SensorData data) {
  // Temperature alerts
  if (data.temperature < 18.0 || data.temperature > 30.0) {
    sendAlert("temperature", "critical", "Temperature out of safe range");
    blinkLED(5, 100);
  }
  
  // pH alerts
  if (data.ph < 6.0 || data.ph > 9.0) {
    sendAlert("ph", "critical", "pH out of safe range");
    blinkLED(5, 100);
  }
  
  // Dissolved Oxygen alerts
  if (data.dissolvedOxygen < 4.0) {
    sendAlert("dissolvedOxygen", "high", "Low dissolved oxygen levels");
    blinkLED(3, 150);
  }
  
  // Water level alerts
  if (data.waterLevel < 20.0) {
    sendAlert("waterLevel", "high", "Low water level detected");
    blinkLED(3, 150);
  }
}

void sendAlert(String sensor, String severity, String message) {
  DynamicJsonDocument doc(512);
  
  doc["type"] = "alert";
  doc["deviceMac"] = deviceMac;
  doc["deviceId"] = deviceId;
  doc["sensor"] = sensor;
  doc["severity"] = severity;
  doc["message"] = message;
  doc["timestamp"] = millis();
  
  String alertMessage;
  serializeJson(doc, alertMessage);
  
  webSocket.sendTXT(alertMessage);
  
  Serial.printf("ALERT [%s]: %s\n", severity.c_str(), message.c_str());
}

void registerDevice() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(api_endpoint) + "/functions/register-device/executions");
    http.addHeader("Content-Type", "application/json");
    
    DynamicJsonDocument doc(512);
    doc["deviceMac"] = deviceMac;
    doc["deviceId"] = deviceId;
    doc["deviceType"] = deviceType;
    doc["firmware"] = "1.0.0";
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Device registered successfully");
      
      // Parse response to get API key if provided
      DynamicJsonDocument responseDoc(512);
      deserializeJson(responseDoc, response);
      if (responseDoc.containsKey("apiKey")) {
        apiKey = responseDoc["apiKey"].as<String>();
      }
    } else {
      Serial.printf("Device registration failed: %d\n", httpResponseCode);
    }
    
    http.end();
  }
}

void calibrateSensor(String sensor, float referenceValue) {
  if (sensor == "ph") {
    int rawValue = analogRead(PH_SENSOR_PIN);
    float voltage = rawValue * (3.3 / 4095.0);
    calibration.phOffset = referenceValue - (voltage * calibration.phSlope);
  } else if (sensor == "dissolvedOxygen") {
    int rawValue = analogRead(DO_SENSOR_PIN);
    float voltage = rawValue * (3.3 / 4095.0);
    calibration.doOffset = referenceValue - (voltage * calibration.doSlope);
  } else if (sensor == "turbidity") {
    int rawValue = analogRead(TURBIDITY_SENSOR_PIN);
    float voltage = rawValue * (3.3 / 4095.0);
    calibration.turbidityOffset = referenceValue - (voltage * calibration.turbiditySlope);
  }
  
  saveCalibration();
  Serial.printf("Calibrated %s sensor\n", sensor.c_str());
}

void loadCalibration() {
  EEPROM.get(0, calibration);
  
  // Set default values if EEPROM is empty
  if (isnan(calibration.phSlope)) {
    calibration.phOffset = 0.0;
    calibration.phSlope = 3.5; // Default pH slope
    calibration.doOffset = 0.0;
    calibration.doSlope = 4.0; // Default DO slope
    calibration.turbidityOffset = 0.0;
    calibration.turbiditySlope = 100.0; // Default turbidity slope
    saveCalibration();
  }
}

void saveCalibration() {
  EEPROM.put(0, calibration);
  EEPROM.commit();
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

// Utility function to handle deep sleep (for battery-powered operation)
void enterDeepSleep(int seconds) {
  Serial.printf("Entering deep sleep for %d seconds\n", seconds);
  esp_sleep_enable_timer_wakeup(seconds * 1000000);
  esp_deep_sleep_start();
}