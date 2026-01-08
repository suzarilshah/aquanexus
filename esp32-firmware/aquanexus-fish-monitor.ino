/*
 * AquaNexus Fish Environment Monitor
 * ESP32 Firmware for Fish Tank Monitoring (v2.0)
 *
 * Monitors: Temperature, pH, Dissolved Oxygen, Turbidity, TDS
 * Connects to AquaNexus monitoring system via HTTP POST
 *
 * Updated for Next.js API endpoints
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <EEPROM.h>

// Pin Definitions
#define TEMP_SENSOR_PIN 4
#define PH_SENSOR_PIN 34
#define DO_SENSOR_PIN 35
#define TURBIDITY_SENSOR_PIN 32
#define TDS_SENSOR_PIN 33
#define LED_PIN 2
#define BUZZER_PIN 5

// Network Configuration - UPDATE THESE VALUES
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// AquaNexus API Configuration - UPDATE THESE VALUES
const char* API_ENDPOINT = "https://your-aquanexus-domain.vercel.app/api/telemetry";
const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY"; // Get this from the AquaNexus dashboard

// Device Configuration
String deviceMac;
const char* deviceType = "fish";

// Sensor Objects
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature tempSensor(&oneWire);

// Timing Variables
unsigned long lastSensorRead = 0;
unsigned long lastHeartbeat = 0;
unsigned long SENSOR_INTERVAL = 300000; // 5 minutes default (configurable)
const unsigned long HEARTBEAT_INTERVAL = 60000; // 1 minute

// Sensor Data Structure
struct SensorData {
  float temperature;
  float ph;
  float dissolvedOxygen;
  float turbidity;
  float tds;
};

// Calibration Values (stored in EEPROM)
struct CalibrationData {
  float phOffset;
  float phSlope;
  float doOffset;
  float doSlope;
  float turbidityOffset;
  float turbiditySlope;
  float tdsOffset;
  float tdsSlope;
};

CalibrationData calibration;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== AquaNexus Fish Monitor v2.0 ===");

  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Get device MAC address
  deviceMac = WiFi.macAddress();
  Serial.print("Device MAC: ");
  Serial.println(deviceMac);

  // Initialize EEPROM and load calibration
  EEPROM.begin(512);
  loadCalibration();

  // Initialize temperature sensor
  tempSensor.begin();

  // Connect to WiFi
  connectToWiFi();

  // Send initial heartbeat
  sendHeartbeat();

  Serial.println("Fish Monitor initialized successfully!");
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

  // Read temperature
  tempSensor.requestTemperatures();
  data.temperature = tempSensor.getTempCByIndex(0);

  // Read pH (with calibration)
  int phRaw = analogRead(PH_SENSOR_PIN);
  float phVoltage = phRaw * (3.3 / 4095.0);
  data.ph = (phVoltage * calibration.phSlope) + calibration.phOffset;
  data.ph = constrain(data.ph, 0.0, 14.0);

  // Read Dissolved Oxygen (with calibration)
  int doRaw = analogRead(DO_SENSOR_PIN);
  float doVoltage = doRaw * (3.3 / 4095.0);
  data.dissolvedOxygen = (doVoltage * calibration.doSlope) + calibration.doOffset;
  data.dissolvedOxygen = constrain(data.dissolvedOxygen, 0.0, 20.0);

  // Read Turbidity (with calibration)
  int turbidityRaw = analogRead(TURBIDITY_SENSOR_PIN);
  float turbidityVoltage = turbidityRaw * (3.3 / 4095.0);
  data.turbidity = (turbidityVoltage * calibration.turbiditySlope) + calibration.turbidityOffset;
  data.turbidity = constrain(data.turbidity, 0.0, 1000.0);

  // Read TDS (with calibration)
  int tdsRaw = analogRead(TDS_SENSOR_PIN);
  float tdsVoltage = tdsRaw * (3.3 / 4095.0);
  data.tds = (tdsVoltage * calibration.tdsSlope) + calibration.tdsOffset;
  data.tds = constrain(data.tds, 0.0, 5000.0);

  // Log to serial
  Serial.println("\n--- Sensor Readings ---");
  Serial.printf("Temperature: %.2f°C\n", data.temperature);
  Serial.printf("pH: %.2f\n", data.ph);
  Serial.printf("Dissolved Oxygen: %.2f mg/L\n", data.dissolvedOxygen);
  Serial.printf("Turbidity: %.2f NTU\n", data.turbidity);
  Serial.printf("TDS: %.0f ppm\n", data.tds);

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
  doc["readingType"] = "fish";

  JsonArray readings = doc.createNestedArray("readings");

  // Temperature reading
  JsonObject tempReading = readings.createNestedObject();
  tempReading["type"] = "temperature";
  tempReading["value"] = data.temperature;
  tempReading["unit"] = "celsius";

  // pH reading
  JsonObject phReading = readings.createNestedObject();
  phReading["type"] = "ph";
  phReading["value"] = data.ph;
  phReading["unit"] = "pH";

  // Dissolved Oxygen reading
  JsonObject doReading = readings.createNestedObject();
  doReading["type"] = "dissolved_oxygen";
  doReading["value"] = data.dissolvedOxygen;
  doReading["unit"] = "mg/L";

  // Turbidity reading
  JsonObject turbidityReading = readings.createNestedObject();
  turbidityReading["type"] = "turbidity";
  turbidityReading["value"] = data.turbidity;
  turbidityReading["unit"] = "NTU";

  // TDS reading
  JsonObject tdsReading = readings.createNestedObject();
  tdsReading["type"] = "tds";
  tdsReading["value"] = data.tds;
  tdsReading["unit"] = "ppm";

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
  if (isnan(calibration.phSlope) || calibration.phSlope == 0) {
    calibration.phOffset = 0.0;
    calibration.phSlope = 3.5;
    calibration.doOffset = 0.0;
    calibration.doSlope = 4.0;
    calibration.turbidityOffset = 0.0;
    calibration.turbiditySlope = 100.0;
    calibration.tdsOffset = 0.0;
    calibration.tdsSlope = 500.0;
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

// Deep sleep for battery-powered operation
void enterDeepSleep(int seconds) {
  Serial.printf("Entering deep sleep for %d seconds\n", seconds);
  esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
  esp_deep_sleep_start();
}
