# ESP32 Firmware Setup Guide

## Overview

This comprehensive guide will help you set up and flash the ESP32 firmware for AquaNexus monitoring devices. The AquaNexus platform provides two specialized firmware versions optimized for different aquaponics environments:

- **Fish Monitor** (`aquanexus-fish-monitor.ino`) - For fish tank water quality monitoring
- **Plant Monitor** (`aquanexus-plant-monitor.ino`) - For plant growing environment monitoring

### Key Features
- **Real-time Data Streaming**: WebSocket-based communication with the AquaNexus platform
- **Automatic Device Registration**: Self-registering devices with unique MAC-based identification
- **Sensor Calibration**: Built-in calibration routines for accurate measurements
- **Alert System**: Local buzzer and LED alerts for critical conditions
- **WiFi Management**: Automatic connection with reconnection capabilities
- **Power Management**: Optimized for 24/7 operation with optional deep sleep modes

## Hardware Requirements

### Common Components
- **ESP32 Development Board**: ESP32-WROOM-32 or ESP32-DevKitC recommended
- **Programming Cable**: MicroUSB or USB-C cable (depending on board)
- **Prototyping**: Breadboard, jumper wires, and resistors
- **Power Supply**: 5V 2A adapter for stable operation (3.3V for low-power sensors)
- **Enclosure**: IP65+ rated waterproof enclosure for fish monitors
- **Mounting Hardware**: Brackets, screws, and cable glands
- **Tools**: Multimeter, wire strippers, soldering iron (optional)

### Fish Monitor Sensors
- **DS18B20**: Waterproof digital temperature sensor (±0.5°C accuracy)
- **pH Sensor**: Analog pH probe with BNC connector (pH 0-14 range)
- **Dissolved Oxygen Sensor**: Galvanic or optical DO sensor (0-20 mg/L)
- **Turbidity Sensor**: Analog turbidity sensor (0-3000 NTU)
- **Water Level Sensor**: Ultrasonic (HC-SR04) or float switch
- **Alert Components**: 5V buzzer and status LED
- **Optional**: Water flow sensor, conductivity sensor

### Plant Monitor Sensors
- **DHT22**: Digital temperature and humidity sensor (±0.5°C, ±2% RH)
- **BH1750**: Digital light intensity sensor (I2C, 1-65535 lux)
- **Soil Moisture**: Capacitive soil moisture sensor (corrosion-resistant)
- **Nutrient pH Sensor**: Analog pH probe for hydroponic solutions
- **EC Sensor**: Electrical conductivity sensor for nutrient monitoring
- **Automation**: 2-channel relay module (10A rating for pumps/lights)
- **Alert Components**: 5V buzzer and status LED
- **Optional**: CO2 sensor, air quality sensor

## Pin Connections

### Fish Monitor Wiring
```
ESP32 Pin    | Component           | Notes
-------------|--------------------|-----------------
GPIO 4       | DS18B20 Data       | 4.7kΩ pull-up resistor to 3.3V
GPIO 34      | pH Sensor          | Analog input (0-3.3V)
GPIO 35      | DO Sensor          | Analog input (0-3.3V)
GPIO 32      | Turbidity Sensor   | Analog input (0-3.3V)
GPIO 5       | Water Level Trig   | Ultrasonic HC-SR04 trigger
GPIO 18      | Water Level Echo   | Ultrasonic HC-SR04 echo
GPIO 2       | Buzzer             | 5V buzzer with transistor driver
GPIO 13      | LED Indicator      | Status LED with 220Ω resistor
GPIO 25      | Flow Sensor        | Optional: Water flow pulse input
VIN          | 5V Power           | External 5V 2A power supply
GND          | Ground             | Common ground for all components
3.3V         | Sensor Power       | Power for 3.3V sensors
```

**Important Wiring Notes:**
- Use voltage dividers for 5V sensors on analog pins
- Add 0.1µF capacitors near each sensor for noise filtering
- Use shielded cables for analog sensors to reduce interference
- Ensure proper waterproofing for all connections in fish tanks

### Plant Monitor Wiring
```
ESP32 Pin    | Component           | Notes
-------------|--------------------|-----------------
GPIO 4       | DHT22 Data         | 10kΩ pull-up resistor to 3.3V
GPIO 21      | BH1750 SDA         | I2C data line with 4.7kΩ pull-up
GPIO 22      | BH1750 SCL         | I2C clock line with 4.7kΩ pull-up
GPIO 34      | Soil Moisture      | Analog input (0-3.3V)
GPIO 35      | pH Sensor          | Analog input (0-3.3V)
GPIO 32      | EC Sensor          | Analog input (0-3.3V)
GPIO 26      | Relay 1 (Lights)   | Control output via optocoupler
GPIO 27      | Relay 2 (Pump)     | Control output via optocoupler
GPIO 25      | Fan Control        | Optional: PWM fan control
GPIO 33      | CO2 Sensor         | Optional: Analog CO2 input
GPIO 2       | Buzzer             | 5V buzzer with transistor driver
GPIO 13      | LED Indicator      | Status LED with 220Ω resistor
VIN          | 5V Power           | External 5V 2A power supply
GND          | Ground             | Common ground for all components
3.3V         | Sensor Power       | Power for 3.3V sensors
```

**Important Wiring Notes:**
- Use optocouplers to isolate relay control circuits
- Add flyback diodes across relay coils for protection
- Ensure adequate power supply capacity for pumps and lights
- Use proper gauge wire for high-current relay loads

## Software Setup

### Prerequisites

1. **Arduino IDE** (version 2.0+ recommended)
   - Download from: https://www.arduino.cc/en/software
   - Alternative: Use PlatformIO for advanced users

2. **ESP32 Board Support**
   - Open Arduino IDE
   - Go to File → Preferences
   - Add this URL to "Additional Board Manager URLs":
     ```
     https://dl.espressif.com/dl/package_esp32_index.json
     ```
   - Go to Tools → Board → Board Manager
   - Search for "ESP32" and install "ESP32 by Espressif Systems" (version 2.0.11+)

3. **Required Libraries**
   Install these libraries via Library Manager (Tools → Manage Libraries):
   
   **Core Libraries:**
   - `WiFi` (built-in with ESP32 core)
   - `WebSocketsClient` by Markus Sattler (v2.3.6+)
   - `ArduinoJson` by Benoit Blanchon (v6.21.0+)
   
   **Fish Monitor Libraries:**
   - `OneWire` by Jim Studt (v2.3.7+)
   - `DallasTemperature` by Miles Burton (v3.9.0+)
   - `NewPing` by Tim Eckel (for ultrasonic sensors)
   
   **Plant Monitor Libraries:**
   - `DHT sensor library` by Adafruit (v1.4.4+)
   - `BH1750` by Christopher Laws (v1.3.0+)
   - `Adafruit Unified Sensor` by Adafruit (dependency)
   
   **Optional Libraries:**
   - `ESP32Time` for RTC functionality
   - `Preferences` (built-in) for storing calibration data

### Board Configuration

1. **Select Board**
   - Go to Tools → Board → ESP32 Arduino
   - Select "ESP32 Dev Module" or your specific board model
   - For specific boards: "DOIT ESP32 DEVKIT V1" or "NodeMCU-32S"

2. **Configure Settings**
   - **Upload Speed**: 921600 (reduce to 115200 if upload fails)
   - **CPU Frequency**: 240MHz (WiFi/BT)
   - **Flash Frequency**: 80MHz
   - **Flash Mode**: QIO (change to DIO if boot issues occur)
   - **Flash Size**: 4MB (32Mb)
   - **Partition Scheme**: Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)
   - **Core Debug Level**: None (production) / Info (debugging)
   - **PSRAM**: Disabled (unless using PSRAM-enabled board)

3. **Select Port**
   - Connect ESP32 via USB
   - Install CP210x or CH340 drivers if port not detected
   - Go to Tools → Port
   - Select the appropriate COM port (Windows) or /dev/ttyUSB*/cu.usbserial* (Linux/Mac)
   - **Troubleshooting**: Hold BOOT button while connecting if not detected

## Network Configuration

### WiFi Setup

Before flashing, you need to configure your WiFi credentials and server settings in the firmware:

1. Open the appropriate `.ino` file
2. Locate the configuration section at the top:

```cpp
// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server Configuration  
const char* websocket_server = "your-appwrite-domain.com";  // or IP address
const int websocket_port = 443;  // 443 for HTTPS, 80 for HTTP
const char* websocket_path = "/v1/realtime";
const char* project_id = "YOUR_APPWRITE_PROJECT_ID";
const char* api_key = "YOUR_APPWRITE_API_KEY";

// Device Configuration
const char* device_type = "fish";  // or "plant"
const char* device_location = "Tank_1";  // customize as needed
```

3. Replace the placeholder values with your actual credentials
4. **Security Note**: For production, consider using WiFi Manager for dynamic configuration

### Network Requirements
- **WiFi**: 2.4GHz network (ESP32 doesn't support 5GHz)
- **Internet**: Stable connection for WebSocket communication
- **Firewall**: Ensure WebSocket ports (80/443) are not blocked
- **Bandwidth**: Minimal (~1KB/minute per device)

### 5. Configure Device Settings

```cpp
// Device Configuration
String deviceId = "fish-monitor-001";  // Unique device identifier
String deviceType = "fish";            // "fish" or "plant"
```

## Flashing the Firmware

### 1. Connect ESP32

1. Connect ESP32 to computer via USB
2. Select the correct board: **Tools > Board > ESP32 Arduino > ESP32 Dev Module**
3. Select the correct port: **Tools > Port > [Your ESP32 Port]**

### 2. Upload Firmware

1. Open the appropriate `.ino` file in Arduino IDE
2. Click **Upload** button (arrow icon)
3. Wait for compilation and upload to complete
4. Open **Serial Monitor** (Tools > Serial Monitor) to view debug output

### 3. Verify Operation

After successful upload, you should see:

```
Connecting to WiFi...
WiFi connected!
IP address: 192.168.1.xxx
WebSocket Connected to: ws://your-server.com:8080/
Device registered successfully
Fish/Plant Monitor initialized successfully!
```

## Sensor Calibration

### pH Sensor Calibration

1. Prepare pH 4.0, 7.0, and 10.0 calibration solutions
2. Send calibration commands via WebSocket:

```json
{
  "type": "calibrate",
  "sensor": "ph",
  "value": 7.0
}
```

### Dissolved Oxygen Calibration

1. Use air-saturated water at known temperature
2. Send calibration command with expected DO value

### Soil Moisture Calibration

1. Test in completely dry soil (0%)
2. Test in water-saturated soil (100%)
3. Send calibration commands for both points

## Troubleshooting

### Upload and Flashing Issues

#### Upload Failed / Port Not Detected
- **Driver Issues**: Install proper USB drivers (CP210x, CH340, or FTDI)
- **Cable Problems**: Use data cable, not charge-only cable
- **Boot Mode**: Hold BOOT button while connecting USB or during upload
- **Upload Speed**: Reduce to 115200 or 460800 if 921600 fails
- **Port Selection**: Verify correct board and port are selected
- **USB Port**: Try different USB port on computer
- **Permissions**: On Mac, grant permission in System Preferences → Security

#### Boot Loop / Continuous Restart
- **Power Supply**: Ensure stable 5V 2A minimum power
- **Wiring**: Check for short circuits in connections
- **Flash Mode**: Try "DIO" mode instead of "QIO"
- **Complete Erase**: Erase flash completely and reflash
- **Pin Conflicts**: Verify no conflicting pin assignments

### Network Connection Issues

#### WiFi Connection Failed
- **Credentials**: Verify SSID and password (case-sensitive)
- **Frequency**: Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- **Special Characters**: Check for special characters in credentials
- **Signal Strength**: Move closer to router
- **MAC Filtering**: Disable MAC address filtering temporarily
- **Hotspot Test**: Try mobile hotspot for testing
- **Client Limit**: Check router's maximum client limit

#### WebSocket Connection Failed
- **Server Details**: Verify URL, port, and path
- **Internet**: Test basic internet connectivity
- **Firewall**: Ensure WebSocket ports (80/443) are allowed
- **SSL Certificates**: Verify certificates for HTTPS connections
- **Credentials**: Check Appwrite project ID and API key
- **Serial Monitor**: Monitor output for specific error codes

### Sensor Issues

#### Inaccurate or No Readings
- **Wiring**: Verify all connections with multimeter
- **Power**: Check sensor power supply (3.3V/5V as required)
- **Pull-up Resistors**: Ensure proper resistors (4.7kΩ for I2C, 10kΩ for DHT)
- **Noise Filtering**: Add 0.1µF capacitors near sensors
- **Interference**: Check for electromagnetic interference
- **Calibration**: Calibrate sensors with known reference values
- **Replacement**: Replace faulty sensors

#### I2C Communication Errors
- **Connections**: Verify SDA/SCL wiring
- **Pull-ups**: Check 4.7kΩ pull-up resistors to 3.3V
- **Address Scan**: Use I2C scanner sketch to find devices
- **Address Conflicts**: Ensure unique addresses for each device
- **Cable Length**: Keep I2C cables under 1 meter

### Performance Issues

#### Frequent Disconnections
- **Watchdog Timer**: Implement hardware watchdog
- **Retry Logic**: Add connection retry mechanisms
- **Power Stability**: Monitor power supply stability
- **Memory Usage**: Check for memory leaks
- **Data Frequency**: Reduce transmission frequency
- **Sleep Modes**: Use deep sleep between readings

### Debugging Tools

#### Serial Monitor Setup
- Set baud rate to 115200
- Enable timestamps for better debugging
- Monitor for error messages and connection status

#### Diagnostic Code
```cpp
// Add to setup() for debugging
Serial.println("ESP32 Chip ID: " + String((uint32_t)ESP.getEfuseMac()));
Serial.println("Free Heap: " + String(ESP.getFreeHeap()));
Serial.println("WiFi MAC: " + WiFi.macAddress());
Serial.println("Signal Strength: " + String(WiFi.RSSI()) + " dBm");
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `WiFi connection failed` | Wrong credentials or weak signal | Check SSID/password, move closer to router |
| `WebSocket connection failed` | Server unreachable or wrong URL | Verify server URL, check network connectivity |
| `Sensor reading NaN` | Wiring issue or sensor failure | Check connections, verify power supply |
| `Device registration failed` | API endpoint or credentials wrong | Verify Appwrite settings, check server logs |
| `Brownout detector triggered` | Insufficient power supply | Use higher capacity power adapter |
| `Guru Meditation Error` | Memory corruption or stack overflow | Check for infinite loops, reduce memory usage |

## Production Deployment

### Enclosure and Mounting

#### Waterproof Enclosure (Fish Monitors)
- **Rating**: Use IP65 or higher (IP67 recommended for harsh environments)
- **Size**: Minimum 200x120x75mm for adequate component spacing
- **Material**: ABS plastic or aluminum for durability and heat dissipation
- **Features**: Include viewing window for status LED visibility
- **Sealing**: Install cable glands with proper O-ring sealing
- **Moisture Control**: Add desiccant packets to prevent condensation
- **Ventilation**: Use IP-rated vents for heat dissipation
- **Positioning**: Mount 30cm+ above water level to prevent splash damage

#### General Mounting (Both Types)
- **Sensor Placement**:
  - **Fish Tanks**: Position sensors in water flow areas, avoid dead zones
  - **Plant Systems**: Place soil sensors in root zones, light sensors at canopy level
- **Protection**: Use sensor guards to prevent physical damage
- **Accessibility**: Maintain easy access for calibration and maintenance
- **Labeling**: Clearly label all sensor locations and connections
- **Cable Management**: Use marine-grade cables and proper strain relief

### Power Management

#### Primary Power Systems
- **Power Supply**: Use switching power supplies for efficiency
  - Minimum 5V 3A for systems with relays and pumps
  - Medical/industrial grade for 24/7 operation
  - Include power LED indicator for status
- **Power Protection**:
  - GFCI protection for all water-adjacent installations
  - Surge protectors on all AC inputs
  - Proper grounding (earth ground connection)
  - Fused protection for high-current circuits

#### Backup Power
- **UPS Systems**: For critical monitoring applications
- **Battery Backup**: 12V 7Ah batteries for 8+ hours runtime
- **Solar Power**: 20W minimum panels for remote installations
- **Low-Battery Alerts**: Integrate battery monitoring and alerts

#### Power Monitoring
- Monitor supply voltage and current consumption
- Implement brownout detection and recovery
- Log power events for troubleshooting
- Set up alerts for power failures

### Security and Network

#### Network Security
- **WiFi Encryption**: Use WPA3 (WPA2 minimum)
- **Network Isolation**: Implement dedicated IoT network/VLAN
- **Access Control**: MAC address filtering and regular password rotation
- **Device Security**: Change default passwords, use encrypted communication

#### Remote Management
- **OTA Updates**: Implement secure Over-The-Air firmware updates
- **Health Monitoring**: Set up heartbeat monitoring and automated alerts
- **Performance Tracking**: Monitor uptime, data quality, and sensor drift
- **Rollback Capability**: Maintain ability to revert firmware updates

### Maintenance Schedule

#### Weekly Maintenance
- Visual inspection of all connections and enclosures
- Check status LEDs and system alerts
- Verify data transmission and connectivity
- Clean sensor surfaces (especially optical sensors)

#### Monthly Maintenance
- **pH Sensor Calibration**:
  1. Rinse with distilled water
  2. Calibrate with pH 7.0 buffer at 25°C
  3. Calibrate with pH 4.0 or 10.0 buffer
  4. Store in pH 4.0 storage solution
  5. Document calibration date and values
- **Temperature Verification**: Check against certified reference thermometer
- **Water Level Accuracy**: Verify ultrasonic sensor readings
- **Enclosure Inspection**: Check seals and clean interior
- **Firmware Updates**: Install available updates during maintenance windows

#### Quarterly Maintenance
- Deep clean all sensors with appropriate solutions
- Inspect and tighten all electrical connections
- Test backup power systems and UPS functionality
- Review system logs and performance metrics
- Replace desiccant packets in enclosures
- Update network security credentials

### Performance Optimization

#### Data Transmission
- **Frequency**: Optimize based on application needs (30s-5min intervals)
- **Compression**: Use JSON compression for large datasets
- **Buffering**: Implement local data buffering for network outages
- **Quality Control**: Filter out obviously erroneous readings

#### Power Efficiency
- **Sleep Modes**: Implement deep sleep between readings
- **Sensor Management**: Power down sensors when not in use
- **WiFi Optimization**: Use WiFi sleep modes and connection pooling
- **Processing**: Minimize complex calculations on device

### Scalability Considerations

#### Multi-Device Deployment
- **Device Naming**: Use consistent naming conventions (location-type-number)
- **Network Planning**: Consider bandwidth and router capacity
- **Data Management**: Plan for increased data storage and processing
- **Maintenance Scheduling**: Stagger maintenance across devices

#### System Integration
- **API Rate Limits**: Respect Appwrite API limitations
- **Database Scaling**: Plan for data growth and archival
- **Alert Management**: Implement intelligent alert aggregation
- **Monitoring Dashboard**: Set up centralized monitoring for all devices

## Advanced Configuration

### Custom Sensor Intervals

Modify these constants in the firmware:

```cpp
const unsigned long SENSOR_INTERVAL = 30000;    // 30 seconds
const unsigned long HEARTBEAT_INTERVAL = 60000; // 1 minute
```

### Alert Thresholds

Customize alert conditions in the `checkAlerts()` function:

```cpp
// Temperature alerts
if (data.temperature < 18.0 || data.temperature > 30.0) {
  sendAlert("temperature", "critical", "Temperature out of safe range");
}
```

### Automation Settings

For plant monitors, configure automation:

```cpp
settings.targetSoilMoisture = 60.0;  // Target moisture percentage
settings.autoIrrigation = true;      // Enable auto irrigation
settings.autoLighting = false;       // Disable auto lighting
```

## Support

For technical support:

1. Check the serial monitor output for error messages
2. Verify all connections and power supplies
3. Ensure firmware configuration matches your setup
4. Check server-side logs for connection issues

For additional help, refer to the main AquaNexus documentation or create an issue in the project repository.