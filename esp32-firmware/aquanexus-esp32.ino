/*
 * AquaNexus ESP32 Firmware
 * 
 * This firmware enables ESP32 devices to collect sensor data and stream it
 * to the AquaNexus platform via Appwrite Edge Functions.
 * 
 * Features:
 * - WiFi connectivity
 * - Sensor data collection (temperature, pH, dissolved oxygen, turbidity)
 * - Real-time data streaming to Appwrite
 * - Configuration via JSON file
 * - Error handling and reconnection logic
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Pin definitions
#define TEMP_SENSOR_PIN 4
#define PH_SENSOR_PIN A0
#define DO_SENSOR_PIN A1
#define TURBIDITY_SENSOR_PIN A2
#define LED_PIN 2
#define STATUS_LED_PIN 13

// Sensor setup
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature temperatureSensor(&oneWire);

// Configuration structure
struct Config {
  String device_id;
  String device_mac;
  String wifi_ssid;
  String wifi_password;
  String appwrite_endpoint;
  String appwrite_project_id;
  String ingest_function_url;
  String api_key;
  String device_type;
  int reading_interval;
};

Config config;
HTTPClient http;
WiFiClient client;

// Timing variables
unsigned long lastReading = 0;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Status variables
bool wifiConnected = false;
bool configLoaded = false;
int failedAttempts = 0;
const int MAX_FAILED_ATTEMPTS = 5;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== AquaNexus ESP32 Starting ===");
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  
  // Initialize SPIFFS
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS initialization failed!");
    return;
  }
  
  // Load configuration
  if (loadConfig()) {
    Serial.println("Configuration loaded successfully");
    configLoaded = true;
  } else {
    Serial.println("Failed to load configuration");
    return;
  }
  
  // Initialize sensors
  temperatureSensor.begin();
  
  // Connect to WiFi
  connectToWiFi();
  
  Serial.println("Setup complete!");
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    digitalWrite(STATUS_LED_PIN, LOW);
    Serial.println("WiFi disconnected, attempting reconnection...");
    connectToWiFi();
    return;
  }
  
  if (!wifiConnected) {
    wifiConnected = true;
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println("WiFi connected!");
  }
  
  unsigned long currentTime = millis();
  
  // Send sensor readings
  if (currentTime - lastReading >= (config.reading_interval * 1000)) {
    if (configLoaded) {
      collectAndSendData();
      lastReading = currentTime;
    }
  }
  
  // Send heartbeat
  if (currentTime - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = currentTime;
  }
  
  // Blink status LED
  digitalWrite(LED_PIN, (millis() / 1000) % 2);
  
  delay(1000);
}

bool loadConfig() {
  File configFile = SPIFFS.open("/config.json", "r");
  if (!configFile) {
    Serial.println("Failed to open config file");
    return false;
  }
  
  String configString = configFile.readString();
  configFile.close();
  
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, configString);
  
  if (error) {
    Serial.print("Failed to parse config: ");
    Serial.println(error.c_str());
    return false;
  }
  
  config.device_id = doc["device_id"].as<String>();
  config.device_mac = doc["device_mac"].as<String>();
  config.wifi_ssid = doc["wifi_ssid"].as<String>();
  config.wifi_password = doc["wifi_password"].as<String>();
  config.appwrite_endpoint = doc["appwrite_endpoint"].as<String>();
  config.appwrite_project_id = doc["appwrite_project_id"].as<String>();
  config.ingest_function_url = doc["ingest_function_url"].as<String>();
  config.api_key = doc["api_key"].as<String>();
  config.device_type = doc["device_type"].as<String>();
  config.reading_interval = doc["reading_interval"] | 300; // Default 5 minutes
  
  Serial.println("Configuration:");
  Serial.println("Device ID: " + config.device_id);
  Serial.println("Device Type: " + config.device_type);
  Serial.println("Reading Interval: " + String(config.reading_interval) + "s");
  
  return true;
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(config.wifi_ssid);
  
  WiFi.begin(config.wifi_ssid.c_str(), config.wifi_password.c_str());
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    wifiConnected = true;
    failedAttempts = 0;
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    wifiConnected = false;
    failedAttempts++;
  }
}

void collectAndSendData() {
  Serial.println("Collecting sensor data...");
  
  // Read sensors based on device type
  DynamicJsonDocument doc(1024);
  JsonArray readings = doc.createNestedArray("readings");
  String currentTimestamp = getTimestamp();
  
  if (config.device_type == "fish") {
    // Fish tank sensors
    float temperature = readTemperature();
    float ph = readPH();
    float dissolvedOxygen = readDissolvedOxygen();
    float turbidity = readTurbidity();
    
    // Add temperature reading
    JsonObject tempReading = readings.createNestedObject();
    tempReading["type"] = "temperature";
    tempReading["value"] = temperature;
    tempReading["unit"] = "celsius";
    tempReading["timestamp"] = currentTimestamp;
    
    // Add pH reading
    JsonObject phReading = readings.createNestedObject();
    phReading["type"] = "ph";
    phReading["value"] = ph;
    phReading["unit"] = "ph";
    phReading["timestamp"] = currentTimestamp;
    
    // Add dissolved oxygen reading
    JsonObject doReading = readings.createNestedObject();
    doReading["type"] = "dissolved_oxygen";
    doReading["value"] = dissolvedOxygen;
    doReading["unit"] = "mg/l";
    doReading["timestamp"] = currentTimestamp;
    
    // Add turbidity reading
    JsonObject turbidityReading = readings.createNestedObject();
    turbidityReading["type"] = "turbidity";
    turbidityReading["value"] = turbidity;
    turbidityReading["unit"] = "ntu";
    turbidityReading["timestamp"] = currentTimestamp;
  } else if (config.device_type == "plant") {
    // Plant monitoring sensors
    float temperature = readTemperature();
    float humidity = readHumidity();
    float soilMoisture = readSoilMoisture();
    float lightLevel = readLightLevel();
    
    // Add temperature reading
    JsonObject tempReading = readings.createNestedObject();
    tempReading["type"] = "temperature";
    tempReading["value"] = temperature;
    tempReading["unit"] = "celsius";
    tempReading["timestamp"] = currentTimestamp;
    
    // Add humidity reading
    JsonObject humidityReading = readings.createNestedObject();
    humidityReading["type"] = "humidity";
    humidityReading["value"] = humidity;
    humidityReading["unit"] = "percent";
    humidityReading["timestamp"] = currentTimestamp;
    
    // Add soil moisture reading
    JsonObject moistureReading = readings.createNestedObject();
    moistureReading["type"] = "soil_moisture";
    moistureReading["value"] = soilMoisture;
    moistureReading["unit"] = "percent";
    moistureReading["timestamp"] = currentTimestamp;
    
    // Add light level reading
    JsonObject lightReading = readings.createNestedObject();
    lightReading["type"] = "light_level";
    lightReading["value"] = lightLevel;
    lightReading["unit"] = "lux";
    lightReading["timestamp"] = currentTimestamp;
  }
  
  // Prepare payload with updated format
  DynamicJsonDocument payload(1024);
  payload["apiKey"] = config.api_key;
  payload["deviceMac"] = config.device_mac;
  payload["readingType"] = config.device_type;
  payload["readings"] = readings;
  
  String payloadString;
  serializeJson(payload, payloadString);
  
  // Send data to Appwrite function
  sendDataToAppwrite(payloadString);
}

void sendDataToAppwrite(String payload) {
  if (!wifiConnected) {
    Serial.println("WiFi not connected, skipping data send");
    return;
  }
  
  http.begin(client, config.ingest_function_url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Appwrite-Project", config.appwrite_project_id);
  
  Serial.println("Sending data to Appwrite...");
  Serial.println("URL: " + config.ingest_function_url);
  Serial.println("Payload: " + payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    
    if (httpResponseCode == 200) {
      Serial.println("Data sent successfully!");
      failedAttempts = 0;
      
      // Parse response for any configuration updates
      DynamicJsonDocument responseDoc(1024);
      DeserializationError error = deserializeJson(responseDoc, response);
      
      if (!error) {
        if (responseDoc.containsKey("reading_interval")) {
          int newInterval = responseDoc["reading_interval"];
          if (newInterval != config.reading_interval && newInterval > 0) {
            config.reading_interval = newInterval;
            Serial.println("Updated reading interval to: " + String(newInterval) + " seconds");
            saveConfig();
          }
        }
        
        // Handle success/error messages
        if (responseDoc.containsKey("message")) {
          String message = responseDoc["message"];
          Serial.println("Server message: " + message);
        }
        
        if (responseDoc.containsKey("error")) {
          String errorMsg = responseDoc["error"];
          Serial.println("Server error: " + errorMsg);
        }
      } else {
        Serial.println("Failed to parse response JSON");
      }
    } else {
      Serial.println("Failed to send data");
      failedAttempts++;
    }
  } else {
    Serial.println("HTTP request failed: " + String(httpResponseCode));
    failedAttempts++;
  }
  
  http.end();
  
  // Handle too many failures
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    Serial.println("Too many failed attempts, restarting...");
    ESP.restart();
  }
}

bool saveConfig() {
  DynamicJsonDocument doc(1024);
  doc["device_id"] = config.device_id;
  doc["device_mac"] = config.device_mac;
  doc["wifi_ssid"] = config.wifi_ssid;
  doc["wifi_password"] = config.wifi_password;
  doc["appwrite_endpoint"] = config.appwrite_endpoint;
  doc["appwrite_project_id"] = config.appwrite_project_id;
  doc["ingest_function_url"] = config.ingest_function_url;
  doc["api_key"] = config.api_key;
  doc["device_type"] = config.device_type;
  doc["reading_interval"] = config.reading_interval;
  
  File configFile = SPIFFS.open("/config.json", "w");
  if (!configFile) {
    Serial.println("Failed to open config file for writing");
    return false;
  }
  
  if (serializeJson(doc, configFile) == 0) {
    Serial.println("Failed to write config file");
    configFile.close();
    return false;
  }
  
  configFile.close();
  Serial.println("Configuration saved successfully");
  return true;
}

void sendHeartbeat() {
  DynamicJsonDocument payload(512);
  payload["apiKey"] = config.api_key;
  payload["deviceMac"] = config.device_mac;
  payload["readingType"] = "heartbeat";
  payload["timestamp"] = getTimestamp();
  payload["status"] = "online";
  payload["freeHeap"] = ESP.getFreeHeap();
  payload["uptime"] = millis();
  
  String payloadString;
  serializeJson(payload, payloadString);
  
  Serial.println("Sending heartbeat...");
  sendDataToAppwrite(payloadString);
}

float readTemperature() {
  temperatureSensor.requestTemperatures();
  float temp = temperatureSensor.getTempCByIndex(0);
  
  if (temp == DEVICE_DISCONNECTED_C) {
    Serial.println("Temperature sensor error");
    return -999.0; // Error value
  }
  
  Serial.println("Temperature: " + String(temp) + "°C");
  return temp;
}

float readPH() {
  int sensorValue = analogRead(PH_SENSOR_PIN);
  float voltage = sensorValue * (3.3 / 4095.0); // ESP32 ADC resolution
  float ph = 3.5 * voltage + 0.0; // Calibration formula (adjust as needed)
  
  Serial.println("pH: " + String(ph));
  return ph;
}

float readDissolvedOxygen() {
  int sensorValue = analogRead(DO_SENSOR_PIN);
  float voltage = sensorValue * (3.3 / 4095.0);
  float dissolvedOxygen = voltage * 4.0; // Calibration formula (adjust as needed)
  
  Serial.println("Dissolved Oxygen: " + String(dissolvedOxygen) + " mg/L");
  return dissolvedOxygen;
}

float readTurbidity() {
  int sensorValue = analogRead(TURBIDITY_SENSOR_PIN);
  float voltage = sensorValue * (3.3 / 4095.0);
  float turbidity = -1120.4 * voltage * voltage + 5742.3 * voltage - 4352.9; // Calibration formula
  
  if (turbidity < 0) turbidity = 0;
  
  Serial.println("Turbidity: " + String(turbidity) + " NTU");
  return turbidity;
}

float readHumidity() {
  // Simulate humidity sensor reading (30-90%)
  return random(30, 90) + random(0, 100) / 100.0;
}

float readSoilMoisture() {
  // Simulate soil moisture sensor reading (10-80%)
  return random(10, 80) + random(0, 100) / 100.0;
}

float readLightLevel() {
  // Simulate light level sensor reading (0-50000 lux)
  return random(0, 50000) + random(0, 100) / 100.0;
}

String getTimestamp() {
  // In a real implementation, you would use NTP to get accurate time
  // For now, return millis as a simple timestamp
  return String(millis());
}

// Error handling and recovery functions
void handleError(String error) {
  Serial.println("Error: " + error);
  
  // Blink error pattern
  for (int i = 0; i < 5; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(100);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(100);
  }
}

void printSystemInfo() {
  Serial.println("\n=== System Information ===");
  Serial.println("Chip Model: " + String(ESP.getChipModel()));
  Serial.println("Chip Revision: " + String(ESP.getChipRevision()));
  Serial.println("Flash Size: " + String(ESP.getFlashChipSize()));
  Serial.println("Free Heap: " + String(ESP.getFreeHeap()));
  Serial.println("WiFi MAC: " + WiFi.macAddress());
  Serial.println("============================\n");
}