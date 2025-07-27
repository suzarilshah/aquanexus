# ESP32 Onboarding Server

This server provides local testing capabilities for ESP32 device onboarding and data ingestion for the AquaNexus monitoring system.

## Features

- **Device Onboarding**: Register ESP32 devices and issue secure API keys
- **Real-time Data Ingestion**: Accept sensor data via HTTP POST and WebSocket
- **Device Management**: Handle device status, heartbeats, and commands
- **Mock Appwrite Integration**: Simulate Appwrite functions for local testing
- **WebSocket Communication**: Real-time bidirectional communication with devices
- **Alert System**: Generate alerts based on sensor thresholds

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3001` with WebSocket support.

### 3. Test with Simulated ESP32 Devices

```bash
npm test
```

This will run the test client that simulates two ESP32 devices (fish and plant monitoring).

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and uptime.

### Device Onboarding
```
POST /api/esp32/onboard
Content-Type: application/json

{
  "deviceMac": "AA:BB:CC:DD:EE:FF",
  "deviceType": "fish", // or "plant"
  "firmwareVersion": "1.0.0",
  "capabilities": ["temperature", "ph", "turbidity", "dissolvedOxygen"]
}
```

Response:
```json
{
  "success": true,
  "deviceId": "device_12345",
  "apiKey": "api_key_67890",
  "message": "Device onboarded successfully"
}
```

### Sensor Data Ingestion
```
POST /api/esp32/data
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "type": "sensor_data",
  "deviceId": "device_12345",
  "deviceMac": "AA:BB:CC:DD:EE:FF",
  "deviceType": "fish",
  "timestamp": 1703123456789,
  "data": {
    "temperature": 25.5,
    "ph": 7.2,
    "turbidity": 5.1,
    "dissolvedOxygen": 6.8
  }
}
```

### Device Heartbeat
```
POST /api/esp32/heartbeat
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "deviceId": "device_12345",
  "deviceMac": "AA:BB:CC:DD:EE:FF",
  "timestamp": 1703123456789,
  "uptime": 123456,
  "freeHeap": 200000,
  "wifiRSSI": -45
}
```

## WebSocket Communication

Connect to `ws://localhost:3001` and authenticate:

```json
{
  "type": "auth",
  "deviceId": "device_12345",
  "apiKey": "api_key_67890"
}
```

After authentication, you can send:

- **Sensor Data**: Same format as HTTP endpoint
- **Heartbeat**: Device status updates
- **Device Status**: Complete device information

Server can send:

- **Commands**: Device control commands
- **Alerts**: Threshold-based notifications
- **Acknowledgments**: Message confirmations

## ESP32 Firmware

The `aquanexus-esp32-onboarding.ino` file contains the Arduino code for ESP32 devices. Key features:

- **WiFi Management**: Auto-connect with fallback AP mode
- **Device Onboarding**: Automatic registration with server
- **Sensor Reading**: Support for fish and plant monitoring sensors
- **Data Transmission**: HTTP and WebSocket communication
- **Error Handling**: Robust connection management
- **Credential Storage**: Secure storage in EEPROM

### Sensor Types

**Fish Monitoring:**
- Temperature (DS18B20)
- pH (analog sensor)
- Turbidity (analog sensor)
- Dissolved Oxygen (analog sensor)

**Plant Monitoring:**
- Temperature (DS18B20)
- Soil Moisture (capacitive sensor)
- Light Level (LDR)
- Humidity (DHT22)

## Testing Workflow

1. **Start Server**: `npm start`
2. **Run Test Client**: `npm test`
3. **Monitor Logs**: Watch console output for device activity
4. **Check Data**: Observe sensor data ingestion and alerts
5. **Test Commands**: Send commands via WebSocket

## Configuration

### Server Configuration

Edit `esp32-server.js` to modify:

- Port number (default: 3001)
- Alert thresholds
- Device capabilities
- Mock data responses

### ESP32 Configuration

Edit `aquanexus-esp32-onboarding.ino` to modify:

- WiFi credentials
- Server URL
- Sensor pins
- Transmission intervals
- Device type

## Alert Thresholds

### Fish Monitoring
- Temperature: 18-28°C
- pH: 6.5-8.5
- Turbidity: < 10 NTU
- Dissolved Oxygen: > 5 mg/L

### Plant Monitoring
- Temperature: 15-30°C
- Soil Moisture: 30-70%
- Light Level: > 200 lux
- Humidity: 40-80%

## Integration with AquaNexus

This server simulates the Appwrite Edge Functions that would handle:

1. **Device Registration**: Creating device records
2. **Authentication**: Validating API keys
3. **Data Storage**: Saving sensor data to MongoDB
4. **Alert Generation**: Triggering notifications
5. **Real-time Updates**: WebSocket communication

To integrate with the main AquaNexus app:

1. Replace mock functions with actual Appwrite Edge Function calls
2. Update authentication to use Appwrite sessions
3. Connect to MongoDB for data persistence
4. Integrate with the main WebSocket system
5. Add device management UI components

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Change port in `esp32-server.js`
2. **WebSocket Connection Failed**: Check firewall settings
3. **Authentication Failed**: Verify API key format
4. **Sensor Data Rejected**: Check JSON format and required fields

### Debug Mode

Set `DEBUG=true` in environment variables for verbose logging:

```bash
DEBUG=true npm start
```

## Next Steps

1. **Hardware Testing**: Flash firmware to actual ESP32 devices
2. **Network Testing**: Test over WiFi networks
3. **Scale Testing**: Test with multiple devices
4. **Integration**: Connect to main AquaNexus application
5. **Production**: Deploy to cloud infrastructure

## License

MIT License - see LICENSE file for details.