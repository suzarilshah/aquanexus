# AquaNexus Deployment Guide

## Overview

This guide covers the complete deployment process for the AquaNexus IoT Aquaponics Monitoring Platform, including WebSocket server deployment to Appwrite, function deployments, and ESP32 setup.

## System Architecture

### Frontend Layer
- **React Application**: TypeScript-based SPA with Vite
- **UI Framework**: Tailwind CSS with custom components
- **State Management**: Zustand stores for auth and app state
- **Real-time Communication**: WebSocket client for live data
- **Routing**: React Router for navigation

### Backend Layer
- **Appwrite Cloud**: Authentication, database, and serverless functions
- **WebSocket Server**: Node.js server for real-time communication
- **Database**: Appwrite database for structured data storage
- **Functions**: 5 serverless functions for data processing

### IoT Layer
- **ESP32 Devices**: Fish and plant monitoring sensors
- **WiFi Communication**: Automatic connection and reconnection
- **WebSocket Client**: Real-time data transmission to server
- **Local Alerts**: Buzzer and LED indicators

## WebSocket Server Deployment to Appwrite

### Option 1: Appwrite Functions (Recommended)

Appwrite doesn't natively support persistent WebSocket connections, but you can deploy the WebSocket server as a containerized function:

#### 1. Create WebSocket Function

```bash
# Create new function in Appwrite console
appwrite functions create \
  --functionId="websocket-server" \
  --name="WebSocket Server" \
  --runtime="node-18.0" \
  --execute="any"
```

#### 2. Prepare Function Code

Create `functions/websocket-server/src/main.js`:

```javascript
import { WebSocketServer } from 'ws';
import { Client, Databases } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

export default async ({ req, res, log, error }) => {
  // WebSocket server logic here
  // Note: This approach has limitations due to function timeout
};
```

#### 3. Deploy Function

```bash
cd functions/websocket-server
appwrite deploy function
```

### Option 2: External WebSocket Server (Current Implementation)

Deploy the WebSocket server separately and configure Appwrite to communicate with it:

#### 1. Deploy to Cloud Platform

Deploy `server/esp32-server.js` to:
- **Railway**: `railway deploy`
- **Heroku**: `git push heroku main`
- **DigitalOcean App Platform**: Use GitHub integration
- **AWS EC2**: Manual deployment with PM2

#### 2. Environment Variables

Set these environment variables on your deployment platform:

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=main
PORT=3001
```

#### 3. Update Frontend Configuration

Update `src/lib/websocket.ts`:

```typescript
// WebSocket URL configured for ws.airail.uk domain
const WS_URL = process.env.NODE_ENV === 'production' 
  ? 'wss://ws.airail.uk/ws'
  : 'ws://localhost:3001/ws';
```

## Appwrite Functions Deployment

### 1. Install Appwrite CLI

```bash
npm install -g appwrite-cli
appwrite login
```

### 2. Deploy All Functions

```bash
# Deploy each function
cd functions/ai-insights
appwrite deploy function

cd ../create-demo-account
appwrite deploy function

cd ../ingest-sensor-data
appwrite deploy function

cd ../process-data-import
appwrite deploy function

cd ../register-device
appwrite deploy function
```

### 3. Set Function Environment Variables

For each function, set these variables in Appwrite console:

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=main
MONGODB_CONNECTION_STRING=your_mongodb_connection
AZURE_AI_ENDPOINT=your_azure_endpoint
AZURE_AI_KEY=your_azure_key
```

## Code Changes After WebSocket Deployment

### 1. Update WebSocket Configuration

In `src/lib/websocket.ts`:

```typescript
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  
  // Update WebSocket URL for production
private getWebSocketUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'wss://ws.airail.uk';
  }
  return 'ws://localhost:3001';
}
}
```

### 2. Update API Endpoints

In `src/lib/api.ts`:

```typescript
// Update base URLs for production
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://cloud.appwrite.io/v1'
  : 'http://localhost:3001';
```

### 3. Update ESP32 Firmware

In both ESP32 firmware files, update the WebSocket server URL:

```cpp
// Update in aquanexus-fish-monitor.ino and aquanexus-plant-monitor.ino
const char* websocket_server = "ws.airail.uk";
const int websocket_port = 443; // Use 443 for WSS
const char* api_endpoint = "https://cloud.appwrite.io/v1";
```

### 4. Environment Variables

Update `.env` file:

```bash
# Production WebSocket Server
VITE_WEBSOCKET_URL=wss://ws.airail.uk

# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=main

# Function URLs (if using external WebSocket)
VITE_WEBSOCKET_FUNCTION_URL=https://cloud.appwrite.io/v1/functions/websocket-server/executions
```

## Frontend Deployment

### 1. Build for Production

```bash
npm run build
```

### 2. Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

### 3. Configure Environment Variables

In Vercel dashboard, add:
- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`
- `VITE_APPWRITE_DATABASE_ID`
- `VITE_WEBSOCKET_URL`

## Database Setup

### 1. Appwrite Database Collections

Create these collections in Appwrite console:

- **devices**: ESP32 device registration
- **sensor_data**: Real-time sensor readings
- **alerts**: System alerts and notifications
- **users**: User accounts and preferences
- **imported_datasets**: Uploaded data files

### 2. Collection Attributes

**devices collection**:
- `deviceId` (string, required)
- `deviceName` (string, required)
- `deviceType` (string, required) // "fish" or "plant"
- `deviceMac` (string, required)
- `status` (string, required) // "online", "offline", "error"
- `lastSeen` (datetime)
- `userId` (string, required)

**sensor_data collection**:
- `deviceId` (string, required)
- `deviceType` (string, required)
- `timestamp` (datetime, required)
- `temperature` (float)
- `ph` (float)
- `dissolvedOxygen` (float)
- `turbidity` (float)
- `humidity` (float)
- `lightIntensity` (float)
- `soilMoisture` (float)

## Security Configuration

### 1. Appwrite Permissions

Set appropriate read/write permissions for each collection:

```javascript
// Example: devices collection
Permissions: [
  Permission.read(Role.user("USER_ID")),
  Permission.write(Role.user("USER_ID")),
  Permission.create(Role.user("USER_ID")),
  Permission.delete(Role.user("USER_ID"))
]
```

### 2. API Key Restrictions

In Appwrite console, restrict API keys to specific:
- Scopes (databases, functions)
- Resources (specific collections)
- Expiration dates

## Monitoring and Logging

### 1. Function Logs

Monitor function execution in Appwrite console:
- Check function logs for errors
- Monitor execution time and memory usage
- Set up alerts for failed executions

### 2. WebSocket Server Monitoring

Implement health checks:

```javascript
// Add to WebSocket server
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: wss.clients.size
  });
});
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check server URL and port
   - Verify SSL certificate for WSS
   - Check firewall settings

2. **Function Timeout**
   - Increase function timeout in Appwrite console
   - Optimize function code for performance
   - Consider breaking large operations into smaller functions

3. **ESP32 Connection Issues**
   - Verify WiFi credentials
   - Check WebSocket server URL in firmware
   - Monitor serial output for error messages

4. **Database Permission Errors**
   - Verify collection permissions
   - Check API key scopes
   - Ensure user authentication

### Debug Commands

```bash
# Check function logs
appwrite functions list-executions --functionId="function-id"

# Test WebSocket connection
wscat -c ws://your-websocket-server.com

# Monitor ESP32 serial output
arduino-cli monitor -p /dev/ttyUSB0 -c baudrate=115200
```

## Performance Optimization

### 1. WebSocket Optimization

- Implement connection pooling
- Use message compression
- Implement heartbeat/ping-pong
- Batch sensor data updates

### 2. Database Optimization

- Create indexes on frequently queried fields
- Implement data archiving for old sensor data
- Use database triggers for real-time updates
- Optimize query patterns

### 3. Frontend Optimization

- Implement virtual scrolling for large datasets
- Use React.memo for expensive components
- Implement proper loading states
- Optimize bundle size with code splitting

This deployment guide ensures a robust, scalable deployment of the AquaNexus platform with proper monitoring, security, and performance considerations.