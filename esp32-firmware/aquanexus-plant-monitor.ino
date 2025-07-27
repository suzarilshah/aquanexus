/*
 * AquaNexus Plant Environment Monitor
 * ESP32 Firmware for Plant Growing Environment Monitoring
 * 
 * Monitors: Air Temperature, Humidity, Light Intensity, Soil Moisture, Nutrient pH, EC
 * Connects to AquaNexus monitoring system via WiFi
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <EEPROM.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <BH1750.h>

// Pin Definitions
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SOIL_MOISTURE_PIN A0
#define NUTRIENT_PH_PIN A1
#define NUTRIENT_EC_PIN A2
#define LIGHT_RELAY_PIN 5
#define PUMP_RELAY_PIN 6
#define LED_PIN 2
#define BUZZER_PIN 7

// Network Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* websocket_server = "ws.airail.uk";
const int websocket_port = 443;
const char* api_endpoint = "https://cloud.appwrite.io/v1";

// Device Configuration
String deviceMac;
String deviceId = "plant-monitor-001";
String deviceType = "plant";
String apiKey = "";

// Sensor Objects
DHT dht(DHT_PIN, DHT_TYPE);
BH1750 lightMeter;

// WebSocket Client
WebSocketsClient webSocket;

// Timing Variables
unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastIrrigation = 0;
const unsigned long SENSOR_INTERVAL = 30000; // 30 seconds
const unsigned long HEARTBEAT_INTERVAL = 60000; // 1 minute
const unsigned long IRRIGATION_INTERVAL = 3600000; // 1 hour

// Sensor Data Structure
struct SensorData {
  float airTemperature;
  float humidity;
  float lightIntensity;
  float soilMoisture;
  float nutrientPH;
  float nutrientEC;
  unsigned long timestamp;
};

// Calibration Values (stored in EEPROM)
struct CalibrationData {
  float soilMoistureOffset;
  float soilMoistureSlope;
  float phOffset;
  float phSlope;
  float ecOffset;
  float ecSlope;
};

CalibrationData calibration;

// Control Settings
struct ControlSettings {
  float targetSoilMoisture;
  float minLightHours;
  float maxLightHours;
  bool autoIrrigation;
  bool autoLighting;
};

ControlSettings settings;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LIGHT_RELAY_PIN, OUTPUT);
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  
  // Initialize relays to OFF
  digitalWrite(LIGHT_RELAY_PIN, LOW);
  digitalWrite(PUMP_RELAY_PIN, LOW);
  
  // Get device MAC address
  deviceMac = WiFi.macAddress();
  
  // Initialize EEPROM and load calibration
  EEPROM.begin(512);
  loadCalibration();
  loadSettings();
  
  // Initialize sensors
  dht.begin();
  Wire.begin();
  lightMeter.begin();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize WebSocket connection
  initWebSocket();
  
  // Register device with server
  registerDevice();
  
  Serial.println("Plant Monitor initialized successfully!");
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
    handleAutomation(data);
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
  } else if (type == "control") {
    String action = doc["action"];
    handleControlCommand(action, doc);
  } else if (type == "config") {
    updateSettings(doc);
  }
}

void handleControlCommand(String action, DynamicJsonDocument& doc) {
  if (action == "irrigate") {
    int duration = doc["duration"] | 5000; // Default 5 seconds
    activateIrrigation(duration);
  } else if (action == "light") {
    bool state = doc["state"];
    controlLighting(state);
  } else if (action == "pump") {
    bool state = doc["state"];
    controlPump(state);
  }
}

SensorData readSensors() {
  SensorData data;
  data.timestamp = millis();
  
  // Read DHT22 (temperature and humidity)
  data.airTemperature = dht.readTemperature();
  data.humidity = dht.readHumidity();
  
  // Read light intensity
  data.lightIntensity = lightMeter.readLightLevel();
  
  // Read soil moisture (with calibration)
  int soilRaw = analogRead(SOIL_MOISTURE_PIN);
  float soilVoltage = soilRaw * (3.3 / 4095.0);
  data.soilMoisture = (soilVoltage * calibration.soilMoistureSlope) + calibration.soilMoistureOffset;
  data.soilMoisture = constrain(data.soilMoisture, 0, 100); // Ensure 0-100%
  
  // Read nutrient solution pH (with calibration)
  int phRaw = analogRead(NUTRIENT_PH_PIN);
  float phVoltage = phRaw * (3.3 / 4095.0);
  data.nutrientPH = (phVoltage * calibration.phSlope) + calibration.phOffset;
  
  // Read nutrient solution EC (with calibration)
  int ecRaw = analogRead(NUTRIENT_EC_PIN);
  float ecVoltage = ecRaw * (3.3 / 4095.0);
  data.nutrientEC = (ecVoltage * calibration.ecSlope) + calibration.ecOffset;
  
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
  readings["airTemperature"] = data.airTemperature;
  readings["humidity"] = data.humidity;
  readings["lightIntensity"] = data.lightIntensity;
  readings["soilMoisture"] = data.soilMoisture;
  readings["nutrientPH"] = data.nutrientPH;
  readings["nutrientEC"] = data.nutrientEC;
  
  // Add system status
  JsonObject status = doc.createNestedObject("status");
  status["lightRelay"] = digitalRead(LIGHT_RELAY_PIN);
  status["pumpRelay"] = digitalRead(PUMP_RELAY_PIN);
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
  
  // Log to serial
  Serial.println("Sensor Data:");
  Serial.printf("Air Temperature: %.2f°C\n", data.airTemperature);
  Serial.printf("Humidity: %.2f%%\n", data.humidity);
  Serial.printf("Light Intensity: %.2f lux\n", data.lightIntensity);
  Serial.printf("Soil Moisture: %.1f%%\n", data.soilMoisture);
  Serial.printf("Nutrient pH: %.2f\n", data.nutrientPH);
  Serial.printf("Nutrient EC: %.2f mS/cm\n", data.nutrientEC);
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
  doc["sensors"] = "airTemperature,humidity,lightIntensity,soilMoisture,nutrientPH,nutrientEC";
  doc["actuators"] = "lightRelay,pumpRelay";
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
}

void checkAlerts(SensorData data) {
  // Temperature alerts
  if (data.airTemperature < 15.0 || data.airTemperature > 35.0) {
    sendAlert("airTemperature", "critical", "Air temperature out of optimal range");
    blinkLED(5, 100);
  }
  
  // Humidity alerts
  if (data.humidity < 40.0 || data.humidity > 80.0) {
    sendAlert("humidity", "high", "Humidity out of optimal range");
    blinkLED(3, 150);
  }
  
  // Soil moisture alerts
  if (data.soilMoisture < 30.0) {
    sendAlert("soilMoisture", "high", "Soil moisture low - irrigation needed");
    blinkLED(3, 150);
  } else if (data.soilMoisture > 90.0) {
    sendAlert("soilMoisture", "medium", "Soil moisture very high - check drainage");
  }
  
  // Light intensity alerts
  if (data.lightIntensity < 200.0) {
    sendAlert("lightIntensity", "medium", "Low light levels detected");
  }
  
  // Nutrient solution alerts
  if (data.nutrientPH < 5.5 || data.nutrientPH > 7.0) {
    sendAlert("nutrientPH", "high", "Nutrient solution pH out of range");
    blinkLED(3, 150);
  }
  
  if (data.nutrientEC < 1.0 || data.nutrientEC > 3.0) {
    sendAlert("nutrientEC", "medium", "Nutrient concentration needs adjustment");
  }
}

void handleAutomation(SensorData data) {
  // Auto irrigation
  if (settings.autoIrrigation && data.soilMoisture < settings.targetSoilMoisture) {
    unsigned long currentTime = millis();
    if (currentTime - lastIrrigation >= IRRIGATION_INTERVAL) {
      activateIrrigation(5000); // 5 second irrigation
      lastIrrigation = currentTime;
    }
  }
  
  // Auto lighting (simplified - would need RTC for proper timing)
  if (settings.autoLighting) {
    if (data.lightIntensity < 500.0) {
      controlLighting(true);
    } else if (data.lightIntensity > 1000.0) {
      controlLighting(false);
    }
  }
}

void activateIrrigation(int duration) {
  Serial.printf("Activating irrigation for %d ms\n", duration);
  digitalWrite(PUMP_RELAY_PIN, HIGH);
  
  // Send irrigation event
  DynamicJsonDocument doc(256);
  doc["type"] = "irrigation";
  doc["deviceMac"] = deviceMac;
  doc["duration"] = duration;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  delay(duration);
  digitalWrite(PUMP_RELAY_PIN, LOW);
  Serial.println("Irrigation completed");
}

void controlLighting(bool state) {
  digitalWrite(LIGHT_RELAY_PIN, state ? HIGH : LOW);
  Serial.printf("Lighting: %s\n", state ? "ON" : "OFF");
  
  // Send lighting event
  DynamicJsonDocument doc(256);
  doc["type"] = "lighting";
  doc["deviceMac"] = deviceMac;
  doc["state"] = state;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
}

void controlPump(bool state) {
  digitalWrite(PUMP_RELAY_PIN, state ? HIGH : LOW);
  Serial.printf("Pump: %s\n", state ? "ON" : "OFF");
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
  if (sensor == "soilMoisture") {
    int rawValue = analogRead(SOIL_MOISTURE_PIN);
    float voltage = rawValue * (3.3 / 4095.0);
    calibration.soilMoistureOffset = referenceValue - (voltage * calibration.soilMoistureSlope);
  } else if (sensor == "nutrientPH") {
    int rawValue = analogRead(NUTRIENT_PH_PIN);
    float voltage = rawValue * (3.3 / 4095.0);
    calibration.phOffset = referenceValue - (voltage * calibration.phSlope);
  } else if (sensor == "nutrientEC") {
    int rawValue = analogRead(NUTRIENT_EC_PIN);
    float voltage = rawValue * (3.3 / 4095.0);
    calibration.ecOffset = referenceValue - (voltage * calibration.ecSlope);
  }
  
  saveCalibration();
  Serial.printf("Calibrated %s sensor\n", sensor.c_str());
}

void updateSettings(DynamicJsonDocument& doc) {
  if (doc.containsKey("targetSoilMoisture")) {
    settings.targetSoilMoisture = doc["targetSoilMoisture"];
  }
  if (doc.containsKey("autoIrrigation")) {
    settings.autoIrrigation = doc["autoIrrigation"];
  }
  if (doc.containsKey("autoLighting")) {
    settings.autoLighting = doc["autoLighting"];
  }
  
  saveSettings();
  Serial.println("Settings updated");
}

void loadCalibration() {
  EEPROM.get(0, calibration);
  
  if (isnan(calibration.soilMoistureSlope)) {
    // Set default calibration values
    calibration.soilMoistureOffset = 0.0;
    calibration.soilMoistureSlope = 30.0;
    calibration.phOffset = 0.0;
    calibration.phSlope = 3.5;
    calibration.ecOffset = 0.0;
    calibration.ecSlope = 2.0;
    saveCalibration();
  }
}

void saveCalibration() {
  EEPROM.put(0, calibration);
  EEPROM.commit();
}

void loadSettings() {
  EEPROM.get(sizeof(CalibrationData), settings);
  
  if (isnan(settings.targetSoilMoisture)) {
    // Set default settings
    settings.targetSoilMoisture = 60.0;
    settings.minLightHours = 12.0;
    settings.maxLightHours = 16.0;
    settings.autoIrrigation = true;
    settings.autoLighting = false;
    saveSettings();
  }
}

void saveSettings() {
  EEPROM.put(sizeof(CalibrationData), settings);
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

// Utility function for deep sleep (battery operation)
void enterDeepSleep(int seconds) {
  Serial.printf("Entering deep sleep for %d seconds\n", seconds);
  esp_sleep_enable_timer_wakeup(seconds * 1000000);
  esp_deep_sleep_start();
}