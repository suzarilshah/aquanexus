/*
 * AquaNexus Plant Environment Monitor
 * ESP32 Firmware for Plant Growing Environment Monitoring (v2.0)
 *
 * Monitors: Air Temperature, Humidity, Light Intensity, Soil Moisture
 * Connects to AquaNexus monitoring system via HTTP POST
 *
 * Updated for Next.js API endpoints
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <EEPROM.h>
#include <Wire.h>
#include <BH1750.h>

// Pin Definitions
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SOIL_MOISTURE_PIN 34
#define LED_PIN 2
#define BUZZER_PIN 5
#define LIGHT_RELAY_PIN 25
#define PUMP_RELAY_PIN 26

// Network Configuration - UPDATE THESE VALUES
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// AquaNexus API Configuration - UPDATE THESE VALUES
const char* API_ENDPOINT = "https://your-aquanexus-domain.vercel.app/api/telemetry";
const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY"; // Get this from the AquaNexus dashboard

// Device Configuration
String deviceMac;
const char* deviceType = "plant";

// Sensor Objects
DHT dht(DHT_PIN, DHT_TYPE);
BH1750 lightMeter;

// Timing Variables
unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;
unsigned long SENSOR_INTERVAL = 300000; // 5 minutes default
const unsigned long HEARTBEAT_INTERVAL = 60000; // 1 minute

// Sensor Data Structure
struct SensorData {
  float temperature;
  float humidity;
  float lightLevel;
  float soilMoisture;
};

// Calibration Values (stored in EEPROM)
struct CalibrationData {
  float soilMoistureOffset;
  float soilMoistureSlope;
};

CalibrationData calibration;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== AquaNexus Plant Monitor v2.0 ===");

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
  Serial.print("Device MAC: ");
  Serial.println(deviceMac);

  // Initialize EEPROM and load calibration
  EEPROM.begin(512);
  loadCalibration();

  // Initialize sensors
  dht.begin();
  Wire.begin();
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("BH1750 light sensor initialized");
  } else {
    Serial.println("BH1750 light sensor not found, using analog fallback");
  }

  // Connect to WiFi
  connectToWiFi();

  // Send initial heartbeat
  sendHeartbeat();

  Serial.println("Plant Monitor initialized successfully!");
  blinkLED(3, 200);
}

void loop() {
  unsigned long currentTime = millis();

  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectToWiFi();
  }

  // Read and send sensor data periodically
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
    SensorData data = readSensors();
    sendSensorData(data);
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

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    blinkLED(2, 100);
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    blinkLED(5, 50);
  }
}

SensorData readSensors() {
  SensorData data;

  // Read DHT22 (temperature and humidity)
  data.temperature = dht.readTemperature();
  data.humidity = dht.readHumidity();

  // Handle DHT read failures
  if (isnan(data.temperature)) data.temperature = 0;
  if (isnan(data.humidity)) data.humidity = 0;

  // Read light intensity from BH1750
  data.lightLevel = lightMeter.readLightLevel();

  // Read soil moisture (with calibration)
  int soilRaw = analogRead(SOIL_MOISTURE_PIN);
  float soilVoltage = soilRaw * (3.3 / 4095.0);
  data.soilMoisture = (soilVoltage * calibration.soilMoistureSlope) + calibration.soilMoistureOffset;
  data.soilMoisture = constrain(data.soilMoisture, 0.0, 100.0);

  // Log to serial
  Serial.println("\n--- Sensor Readings ---");
  Serial.printf("Temperature: %.2f°C\n", data.temperature);
  Serial.printf("Humidity: %.2f%%\n", data.humidity);
  Serial.printf("Light Level: %.2f lux\n", data.lightLevel);
  Serial.printf("Soil Moisture: %.1f%%\n", data.soilMoisture);

  return data;
}

void sendSensorData(SensorData data) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping data send");
    return;
  }

  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  // Create JSON payload matching the new API format
  StaticJsonDocument<512> doc;

  doc["apiKey"] = DEVICE_API_KEY;
  doc["deviceMac"] = deviceMac;
  doc["readingType"] = "plant";

  JsonArray readings = doc.createNestedArray("readings");

  // Soil Moisture reading
  JsonObject soilReading = readings.createNestedObject();
  soilReading["type"] = "soil_moisture";
  soilReading["value"] = data.soilMoisture;
  soilReading["unit"] = "%";

  // Light Level reading
  JsonObject lightReading = readings.createNestedObject();
  lightReading["type"] = "light_level";
  lightReading["value"] = data.lightLevel;
  lightReading["unit"] = "lux";

  // Temperature reading
  JsonObject tempReading = readings.createNestedObject();
  tempReading["type"] = "temperature";
  tempReading["value"] = data.temperature;
  tempReading["unit"] = "celsius";

  // Humidity reading
  JsonObject humidityReading = readings.createNestedObject();
  humidityReading["type"] = "humidity";
  humidityReading["value"] = data.humidity;
  humidityReading["unit"] = "%";

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.println("Sending sensor data to server...");
  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("HTTP Response: %d\n", httpResponseCode);
    Serial.println("Response: " + response);

    if (httpResponseCode == 200) {
      blinkLED(1, 100); // Success indicator
    }
  } else {
    Serial.printf("HTTP Error: %d\n", httpResponseCode);
    blinkLED(3, 50); // Error indicator
  }

  http.end();
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping heartbeat");
    return;
  }

  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  StaticJsonDocument<256> doc;

  doc["apiKey"] = DEVICE_API_KEY;
  doc["deviceMac"] = deviceMac;
  doc["readingType"] = "heartbeat";
  doc["status"] = "online";

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.println("Sending heartbeat...");
  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    Serial.printf("Heartbeat response: %d\n", httpResponseCode);
  } else {
    Serial.printf("Heartbeat error: %d\n", httpResponseCode);
  }

  http.end();
}

void loadCalibration() {
  EEPROM.get(0, calibration);

  // Set default values if EEPROM is empty
  if (isnan(calibration.soilMoistureSlope) || calibration.soilMoistureSlope == 0) {
    calibration.soilMoistureOffset = 0.0;
    calibration.soilMoistureSlope = 30.0; // Default: ~3V = 100%
    saveCalibration();
    Serial.println("Loaded default calibration values");
  } else {
    Serial.println("Loaded calibration from EEPROM");
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

// Control relay functions
void controlLighting(bool state) {
  digitalWrite(LIGHT_RELAY_PIN, state ? HIGH : LOW);
  Serial.printf("Lighting: %s\n", state ? "ON" : "OFF");
}

void controlPump(bool state) {
  digitalWrite(PUMP_RELAY_PIN, state ? HIGH : LOW);
  Serial.printf("Pump: %s\n", state ? "ON" : "OFF");
}

// Deep sleep for battery-powered operation
void enterDeepSleep(int seconds) {
  Serial.printf("Entering deep sleep for %d seconds\n", seconds);
  esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
  esp_deep_sleep_start();
}
