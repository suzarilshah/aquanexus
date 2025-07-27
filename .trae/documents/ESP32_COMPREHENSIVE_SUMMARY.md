# ESP32 Comprehensive Setup Summary for AquaNexus

## Overview

The AquaNexus ESP32 firmware provides comprehensive monitoring solutions for aquaponics systems with two specialized variants:

- **Fish Monitor**: Water quality monitoring (temperature, pH, dissolved oxygen, turbidity, water level)
- **Plant Monitor**: Growing environment monitoring (air temp/humidity, light, soil moisture, nutrient pH/EC)

## Key Features

### Core Capabilities
- **Real-time Data Streaming**: WebSocket-based communication with AquaNexus platform
- **Automatic Device Registration**: Self-registering devices with unique MAC-based identification
- **Sensor Calibration**: Built-in calibration routines for accurate measurements
- **Alert System**: Local buzzer and LED alerts for critical conditions
- **WiFi Management**: Automatic connection with reconnection capabilities
- **Power Management**: Optimized for 24/7 operation with optional deep sleep modes

### Hardware Integration
- **ESP32-WROOM-32**: Primary microcontroller platform
- **Multi-sensor Support**: Up to 8 analog and digital sensors per device
- **Relay Control**: Automated pump and lighting control for plant systems
- **Waterproof Design**: IP65+ rated enclosures for fish tank environments

## Hardware Requirements

### Common Components
- **ESP32 Development Board**: ESP32-WROOM-32 or ESP32-DevKitC
- **Programming Cable**: MicroUSB or USB-C (board dependent)
- **Power Supply**: 5V 2A adapter for stable operation
- **Enclosure**: IP65+ rated for fish monitors, standard for plant monitors
- **Tools**: Multimeter, wire strippers, soldering iron (optional)

### Fish Monitor Sensors
- **DS18B20**: Waterproof temperature sensor (±0.5°C accuracy)
- **pH Sensor**: Analog probe with BNC connector (pH 0-14 range)
- **Dissolved Oxygen**: Galvanic or optical sensor (0-20 mg/L)
- **Turbidity Sensor**: Analog sensor (0-3000 NTU)
- **Water Level**: Ultrasonic HC-SR04 or float switch
- **Alert Components**: 5V buzzer and status LED

### Plant Monitor Sensors
- **DHT22**: Digital temperature/humidity sensor (±0.5°C, ±2% RH)
- **BH1750**: Digital light intensity sensor (I2C, 1-65535 lux)
- **Soil Moisture**: Capacitive sensor (corrosion-resistant)
- **Nutrient pH/EC**: Analog sensors for hydroponic solutions
- **Automation**: 2-channel relay module (10A rating)
- **Alert Components**: 5V buzzer and status LED

## Software Setup

### Development Environment
1. **Arduino IDE 2.0+** or PlatformIO
2. **ESP32 Board Support** (v2.0.11+)
3. **Required Libraries**:
   - WebSocketsClient (v2.3.6+)
   - ArduinoJson (v6.21.0+)
   - OneWire & DallasTemperature (fish monitors)
   - DHT sensor library & BH1750 (plant monitors)

### Board Configuration
- **Board**: ESP32 Dev Module
- **Upload Speed**: 921600 (reduce if upload fails)
- **Flash Mode**: QIO (change to DIO if boot issues)
- **Partition Scheme**: Default 4MB with SPIFFS

### Network Configuration
```cpp
// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server Configuration
const char* websocket_server = "your-appwrite-domain.com";
const int websocket_port = 443;  // 443 for HTTPS, 80 for HTTP
const char* websocket_path = "/v1/realtime";
const char* project_id = "YOUR_APPWRITE_PROJECT_ID";
const char* api_key = "YOUR_APPWRITE_API_KEY";

// Device Configuration
const char* device_type = "fish";  // or "plant"
const char* device_location = "Tank_1";
```

## Pin Connections

### Fish Monitor Wiring
```
ESP32 Pin    | Component           | Notes
-------------|--------------------|-----------------
GPIO 4       | DS18B20 Data       | 4.7kΩ pull-up to 3.3V
GPIO 34      | pH Sensor          | Analog input (0-3.3V)
GPIO 35      | DO Sensor          | Analog input (0-3.3V)
GPIO 32      | Turbidity Sensor   | Analog input (0-3.3V)
GPIO 5       | Water Level Trig   | Ultrasonic HC-SR04
GPIO 18      | Water Level Echo   | Ultrasonic HC-SR04
GPIO 2       | Buzzer             | 5V with transistor driver
GPIO 13      | LED Indicator      | 220Ω resistor
VIN          | 5V Power           | External supply
GND          | Ground             | Common ground
```

### Plant Monitor Wiring
```
ESP32 Pin    | Component           | Notes
-------------|--------------------|-----------------
GPIO 4       | DHT22 Data         | 10kΩ pull-up to 3.3V
GPIO 21      | BH1750 SDA         | I2C with 4.7kΩ pull-up
GPIO 22      | BH1750 SCL         | I2C with 4.7kΩ pull-up
GPIO 34      | Soil Moisture      | Analog input (0-3.3V)
GPIO 35      | pH Sensor          | Analog input (0-3.3V)
GPIO 32      | EC Sensor          | Analog input (0-3.3V)
GPIO 26      | Relay 1 (Lights)   | Via optocoupler
GPIO 27      | Relay 2 (Pump)     | Via optocoupler
GPIO 2       | Buzzer             | 5V with transistor driver
GPIO 13      | LED Indicator      | 220Ω resistor
VIN          | 5V Power           | External supply
GND          | Ground             | Common ground
```

## Deployment Process

### 1. Hardware Assembly
1. **Breadboard Prototyping**: Test all connections on breadboard first
2. **Sensor Calibration**: Calibrate all sensors before final installation
3. **Enclosure Preparation**: Install cable glands and mounting hardware
4. **Final Assembly**: Transfer to permanent enclosure with proper cable management

### 2. Firmware Configuration
1. **Download Firmware**: Get appropriate .ino file from AquaNexus repository
2. **Configure Settings**: Update WiFi credentials and Appwrite settings
3. **Customize Parameters**: Adjust sensor intervals and alert thresholds
4. **Upload Firmware**: Flash to ESP32 using Arduino IDE

### 3. Installation and Testing
1. **Physical Installation**: Mount device in appropriate location
2. **Power Connection**: Connect to stable 5V power supply
3. **Network Testing**: Verify WiFi connection and WebSocket communication
4. **Sensor Verification**: Test all sensor readings and calibration
5. **Alert Testing**: Verify buzzer and LED functionality

## Integration with AquaNexus Platform

### WebSocket Communication
- **Real-time Data**: Continuous sensor data streaming
- **Device Registration**: Automatic registration with platform
- **Command Reception**: Remote calibration and configuration
- **Alert Transmission**: Critical condition notifications

### Data Flow
1. **Sensor Reading**: ESP32 collects data from all connected sensors
2. **Data Processing**: Local filtering and validation
3. **WebSocket Transmission**: JSON data sent to AquaNexus platform
4. **Platform Processing**: Data stored in Appwrite database
5. **AI Analysis**: Processed by AI insights function
6. **User Interface**: Displayed in web dashboard

### Device Management
- **Unique Identification**: MAC address-based device IDs
- **Type Classification**: Automatic fish/plant type detection
- **Location Tracking**: User-configurable location labels
- **Status Monitoring**: Real-time connection and health status

## Production Deployment

### Power Management
- **Primary Power**: 5V 3A switching power supplies
- **Backup Power**: UPS systems for critical monitoring
- **Power Protection**: GFCI, surge protection, proper grounding
- **Monitoring**: Voltage/current monitoring with brownout detection

### Environmental Protection
- **Enclosures**: IP65+ rated for fish monitors
- **Cable Management**: Marine-grade cables with strain relief
- **Mounting**: Secure mounting 30cm+ above water level
- **Ventilation**: IP-rated vents for heat dissipation

### Network Security
- **WiFi Encryption**: WPA3 (WPA2 minimum)
- **Network Isolation**: Dedicated IoT VLAN
- **Device Security**: Encrypted communication, secure OTA updates
- **Access Control**: MAC filtering and credential rotation

## Maintenance Schedule

### Weekly Tasks
- Visual inspection of connections and enclosures
- Status LED and alert verification
- Data transmission monitoring
- Sensor surface cleaning

### Monthly Tasks
- **pH Sensor Calibration**: Using pH 4.0, 7.0, and 10.0 buffers
- **Temperature Verification**: Against certified reference
- **Enclosure Inspection**: Seal integrity and moisture control
- **Firmware Updates**: Install available updates

### Quarterly Tasks
- Deep sensor cleaning and inspection
- Electrical connection tightening
- Backup power system testing
- Performance metric review
- Security credential updates

## Troubleshooting Guide

### Common Issues
1. **Upload Failures**: Driver issues, cable problems, boot mode
2. **WiFi Connection**: Credential verification, signal strength, frequency band
3. **Sensor Readings**: Wiring verification, power supply, calibration
4. **WebSocket Issues**: Server connectivity, firewall, credentials
5. **Performance**: Memory usage, power stability, interference

### Diagnostic Tools
- **Serial Monitor**: Real-time debugging and error messages
- **Multimeter**: Electrical connection verification
- **WiFi Analyzer**: Signal strength and interference detection
- **I2C Scanner**: Device address verification

## Scalability Considerations

### Multi-Device Deployment
- **Naming Conventions**: Consistent device identification
- **Network Planning**: Bandwidth and router capacity
- **Data Management**: Storage and processing scaling
- **Maintenance Coordination**: Staggered maintenance schedules

### System Integration
- **API Rate Limits**: Respect Appwrite limitations
- **Database Scaling**: Plan for data growth
- **Alert Management**: Intelligent aggregation
- **Monitoring Dashboard**: Centralized device management

## Performance Optimization

### Data Transmission
- **Frequency**: 30 seconds to 5 minutes based on needs
- **Compression**: JSON optimization for large datasets
- **Buffering**: Local storage for network outages
- **Quality Control**: Erroneous reading filtering

### Power Efficiency
- **Sleep Modes**: Deep sleep between readings
- **Sensor Management**: Power cycling unused sensors
- **WiFi Optimization**: Connection pooling and sleep modes
- **Processing**: Minimize on-device calculations

## Support and Resources

### Documentation
- **Hardware Setup**: Detailed wiring and assembly guides
- **Software Configuration**: Step-by-step firmware setup
- **Troubleshooting**: Comprehensive problem resolution
- **API Reference**: WebSocket communication protocols

### Development Tools
- **Arduino IDE**: Primary development environment
- **PlatformIO**: Advanced development option
- **Serial Monitor**: Real-time debugging
- **OTA Updates**: Remote firmware management

### Community Support
- **GitHub Repository**: Source code and issue tracking
- **Documentation Wiki**: Community-maintained guides
- **Discussion Forums**: User support and feature requests
- **Video Tutorials**: Visual setup and troubleshooting guides

This comprehensive summary provides all essential information for successfully deploying ESP32-based monitoring devices in AquaNexus aquaponics systems, from initial hardware assembly through production deployment and ongoing maintenance.