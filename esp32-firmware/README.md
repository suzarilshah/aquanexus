# AquaNexus ESP32 Firmware

This firmware enables ESP32 devices to collect sensor data and stream it to the AquaNexus platform via Appwrite Edge Functions.

## Features

- **WiFi Connectivity**: Automatic connection and reconnection handling
- **Multi-Sensor Support**: Temperature, pH, dissolved oxygen, and turbidity sensors
- **Real-time Data Streaming**: Direct integration with Appwrite Edge Functions
- **Configuration Management**: JSON-based configuration system
- **Error Handling**: Robust error handling and recovery mechanisms
- **Heartbeat Monitoring**: Regular status updates to the platform
- **OTA Updates**: Support for over-the-air firmware updates (future)

## Hardware Requirements

### ESP32 Development Board
- ESP32-WROOM-32 or compatible
- Minimum 4MB flash memory
- WiFi capability

### Sensors
- **Temperature**: DS18B20 waterproof temperature sensor
- **pH**: Analog pH sensor module
- **Dissolved Oxygen**: Analog DO sensor
- **Turbidity**: Analog turbidity sensor

### Pin Connections

| Sensor | ESP32 Pin | Description |
|--------|-----------|-------------|
| Temperature (DS18B20) | GPIO 4 | OneWire data pin |
| pH Sensor | A0 (GPIO 36) | Analog input |
| DO Sensor | A1 (GPIO 39) | Analog input |
| Turbidity Sensor | A2 (GPIO 34) | Analog input |
| Status LED | GPIO 2 | Built-in LED |
| External Status LED | GPIO 13 | Optional external LED |

## Software Requirements

### Arduino IDE Setup

1. **Install Arduino IDE** (version 1.8.19 or later)
2. **Add ESP32 Board Package**:
   - Go to File → Preferences
   - Add this URL to "Additional Board Manager URLs":
     ```
     https://dl.espressif.com/dl/package_esp32_index.json
     ```
   - Go to Tools → Board → Board Manager
   - Search for "ESP32" and install "ESP32 by Espressif Systems"

3. **Install Required Libraries**:
   - ArduinoJson (version 6.x)
   - OneWire
   - DallasTemperature
   - WiFi (included with ESP32 package)
   - HTTPClient (included with ESP32 package)
   - SPIFFS (included with ESP32 package)

### Library Installation

In Arduino IDE:
1. Go to Sketch → Include Library → Manage Libraries
2. Search and install:
   - "ArduinoJson" by Benoit Blanchon
   - "OneWire" by Jim Studt
   - "DallasTemperature" by Miles Burton

## Configuration

### 1. Device Registration

First, register your device using the AquaNexus web interface:

1. Log into your AquaNexus account
2. Navigate to Device Setup
3. Follow the ESP32 onboarding process
4. Download the generated configuration file

### 2. Configuration File

The configuration file (`config.json`) contains:

```json
{
  "device_id": "ESP32_XXXXXXXX",
  "device_mac": "XX:XX:XX:XX:XX:XX",
  "wifi_ssid": "YourWiFiNetwork",
  "wifi_password": "YourWiFiPassword",
  "appwrite_endpoint": "https://syd.cloud.appwrite.io/v1",
  "appwrite_project_id": "687f8e78001ac206db80",
  "ingest_function_url": "https://syd.cloud.appwrite.io/v1/functions/ingest-sensor-data/executions",
  "api_key": "your-device-api-key",
  "device_type": "fish",
  "reading_interval": 300
}
```

### 3. Upload Configuration

#### Method 1: SPIFFS Upload (Recommended)

1. **Install ESP32 SPIFFS Plugin**:
   - Download from: https://github.com/me-no-dev/arduino-esp32fs-plugin
   - Extract to `Arduino/tools/ESP32FS/tool/esp32fs.jar`
   - Restart Arduino IDE

2. **Create Data Folder**:
   - Create a `data` folder in your sketch directory
   - Place `config.json` in the `data` folder

3. **Upload SPIFFS**:
   - Select your ESP32 board and port
   - Go to Tools → ESP32 Sketch Data Upload
   - Wait for upload to complete

#### Method 2: Serial Upload

Alternatively, you can modify the firmware to accept configuration via serial input during setup.

## Installation Steps

### 1. Hardware Setup

1. **Connect Sensors** according to the pin diagram above
2. **Power Supply**: Use a stable 5V power supply (minimum 1A)
3. **Waterproofing**: Ensure all connections are waterproof for aquatic use

### 2. Firmware Upload

1. **Open Arduino IDE**
2. **Load the Firmware**:
   - Open `aquanexus-esp32.ino`
   - Select Board: "ESP32 Dev Module"
   - Select Port: Your ESP32's COM port

3. **Configure Board Settings**:
   - Upload Speed: 921600
   - CPU Frequency: 240MHz
   - Flash Frequency: 80MHz
   - Flash Mode: QIO
   - Flash Size: 4MB
   - Partition Scheme: Default 4MB with spiffs

4. **Upload Firmware**:
   - Click Upload button
   - Wait for compilation and upload

### 3. Configuration Upload

1. **Upload SPIFFS** (with config.json in data folder)
2. **Verify Upload** via Serial Monitor

### 4. Testing

1. **Open Serial Monitor** (115200 baud)
2. **Reset ESP32** and watch boot sequence
3. **Verify**:
   - Configuration loaded
   - WiFi connected
   - Sensors initialized
   - Data transmission successful

## Usage

### Normal Operation

1. **Power On**: ESP32 boots and loads configuration
2. **WiFi Connection**: Automatically connects to configured network
3. **Sensor Reading**: Collects data at configured intervals
4. **Data Transmission**: Sends readings to AquaNexus platform
5. **Status Monitoring**: Regular heartbeat messages

### LED Indicators

- **Built-in LED (GPIO 2)**: Blinks every second when running
- **Status LED (GPIO 13)**: 
  - ON: WiFi connected and operational
  - OFF: WiFi disconnected or error
  - Rapid Blink: Error condition

### Serial Monitor Output

```
=== AquaNexus ESP32 Starting ===
Configuration loaded successfully
Device ID: ESP32_XXXXXXXX
Device Type: fish
Reading Interval: 300s
Connecting to WiFi: YourNetwork
...
WiFi connected!
IP address: 192.168.1.100
Setup complete!
Collecting sensor data...
Temperature: 24.5°C
pH: 7.2
Dissolved Oxygen: 8.1 mg/L
Turbidity: 2.3 NTU
Sending data to Appwrite...
HTTP Response: 200
Data sent successfully!
```

## Troubleshooting

### Common Issues

#### WiFi Connection Failed
- Check SSID and password in config.json
- Ensure WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)
- Check signal strength

#### Configuration Not Loading
- Verify config.json is in SPIFFS
- Check JSON syntax
- Re-upload SPIFFS data

#### Sensor Reading Errors
- Check sensor connections
- Verify power supply voltage
- Test sensors individually

#### Data Transmission Failed
- Check API key validity
- Verify Appwrite endpoint URL
- Check internet connectivity

### Debug Mode

Enable verbose logging by modifying the firmware:

```cpp
#define DEBUG_MODE 1
```

### Factory Reset

To reset the device:
1. Hold GPIO 0 button during power-on
2. Or erase flash: `esptool.py erase_flash`

## Advanced Configuration

### Sensor Calibration

Calibrate sensors by modifying the conversion formulas in the firmware:

```cpp
// pH calibration
float ph = 3.5 * voltage + offset;

// DO calibration  
float dissolvedOxygen = voltage * slope + offset;

// Turbidity calibration
float turbidity = polynomial_formula(voltage);
```

### Custom Reading Intervals

Modify `reading_interval` in config.json (seconds):
- Minimum: 30 seconds
- Maximum: 3600 seconds (1 hour)
- Default: 300 seconds (5 minutes)

### Power Management

For battery operation, enable deep sleep mode:

```cpp
#define ENABLE_DEEP_SLEEP 1
#define SLEEP_DURATION 300 // seconds
```

## API Integration

### Data Format

The ESP32 sends data in this format:

```json
{
  "apiKey": "device-api-key",
  "deviceMac": "XX:XX:XX:XX:XX:XX",
  "readingType": "fish",
  "readings": [
    {
      "type": "temperature",
      "value": 24.5,
      "unit": "celsius",
      "timestamp": "1234567890"
    },
    {
      "type": "ph",
      "value": 7.2,
      "unit": "ph",
      "timestamp": "1234567890"
    }
  ]
}
```

### Response Handling

The platform responds with:

```json
{
  "success": true,
  "message": "Data processed successfully",
  "config": {
    "reading_interval": 300
  }
}
```

## Security

- **API Keys**: Keep device API keys secure
- **WiFi Credentials**: Use WPA2/WPA3 encryption
- **HTTPS**: All communication uses HTTPS
- **Device Authentication**: Each device has unique credentials

## Support

For technical support:
1. Check the troubleshooting section
2. Review serial monitor output
3. Contact AquaNexus support with device logs

## License

This firmware is part of the AquaNexus project and is licensed under the MIT License.