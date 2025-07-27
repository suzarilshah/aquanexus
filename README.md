# AquaNexus - Smart Aquaponics Monitoring System

AquaNexus is a comprehensive IoT platform for monitoring and managing aquaponics systems. It combines real-time sensor data collection, intelligent analytics, and user-friendly dashboards to help aquaponics enthusiasts and professionals optimize their systems.

## Architecture

AquaNexus uses a modern architecture with the following components:

- **Frontend**: React with TypeScript, Vite, and TailwindCSS
- **Backend**: Appwrite Cloud for authentication, database, storage, and serverless functions
- **Database**: MongoDB Atlas for scalable data storage
- **AI Processing**: Azure AI for insights and predictions
- **IoT Integration**: ESP32-based sensor nodes for data collection

## Backend Functions

The system uses Appwrite Edge Functions to handle server-side operations:

1. **process-data-import**: Processes CSV or JSON data uploads and stores them in MongoDB
2. **ai-insights**: Analyzes sensor data using Azure AI to generate insights and recommendations
3. **create-demo-account**: Creates a demo account with pre-populated sample data
4. **register-device**: Handles ESP32 device registration and onboarding
5. **ingest-sensor-data**: Processes incoming sensor data from IoT devices

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Appwrite Cloud account
- MongoDB Atlas account
- Azure AI account (for AI insights)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://syd.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=main
VITE_APPWRITE_API_KEY=your_api_key

# MongoDB Configuration
VITE_MONGODB_CONNECTION_STRING=your_mongodb_connection_string

# Azure AI Configuration
VITE_AZURE_AI_ENDPOINT=your_azure_ai_endpoint
VITE_AZURE_AI_KEY=your_azure_ai_key
```

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

### Deploying Functions

To deploy the Appwrite Edge Functions:

1. Install Appwrite CLI: `npm install -g appwrite-cli`
2. Login to Appwrite: `appwrite login`
3. Navigate to each function directory and deploy: `appwrite deploy function`

## Features

- Real-time monitoring of water quality parameters (pH, temperature, dissolved oxygen, etc.)
- Plant growth tracking and analysis
- Fish health monitoring
- AI-powered insights and recommendations
- Anomaly detection and alerts
- Historical data visualization and trends
- Mobile-responsive design for monitoring on the go

## License

MIT
