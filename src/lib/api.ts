import { Client, Account, Databases, Functions, Storage, Query } from 'appwrite';
import { Project, SensorReading, Alert, AIInsight } from '@/store/useStore';

// Appwrite Configuration
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '687f8e78001ac206db80';
const APPWRITE_DATABASE_ID = 'aquanexus-main';
const APPWRITE_API_KEY = import.meta.env.VITE_APPWRITE_API_KEY || 'standard_2c0b3177b1c27be45830633b9bc9142f19d0b0764211810fc449fbdcc4afe39c5bf32a0fc3dc0a468c44ca9ea7883739da70317047e5ada06c75eb294ee820181063c0a75f69262b07cad631f611f22188c50c553d424b92bdfbb4855dc04deb90cae07ec23d2072d30c3dd2541bd70b80d2fc65902303281712593078a7ff6c';

// Note: MongoDB operations are handled server-side via Appwrite Edge Functions
// This client-side code only uses Appwrite for browser compatibility

// Appwrite Client
class AppwriteClient {
  private client: Client;
  private account: Account;
  private databases: Databases;
  private functions: Functions;
  private storage: Storage;
  private isServerSide: boolean;

  constructor(serverSide: boolean = false) {
    this.isServerSide = serverSide;
    this.client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID);
    
    // Use API key for server-side operations
    if (this.isServerSide && APPWRITE_API_KEY) {
      // Note: setKey is not available in client-side SDK
      // API key should be used server-side only
    }
    
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.functions = new Functions(this.client);
    this.storage = new Storage(this.client);
  }

  // Authentication methods
  async login(email: string, password: string) {
    try {
      const session = await this.account.createEmailPasswordSession(email, password);
      return session;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(email: string, password: string, name: string) {
    try {
      const user = await this.account.create('unique()', email, password, name);
      await this.account.createEmailPasswordSession(email, password);
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async createDemoAccount(email: string, password: string, name: string) {
    try {
      // First create the user account
      const user = await this.account.create('unique()', email, password, name);
      await this.account.createEmailPasswordSession(email, password);
      
      // Call the create-demo-account function to populate sample data
      const response = await this.functions.createExecution(
        'create-demo-account',
        JSON.stringify({
          userId: user.$id,
          projectId: APPWRITE_PROJECT_ID
        }),
        false
      );
      
      const result = JSON.parse(response.responseBody);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create demo account');
      }
      
      return { user, ...result };
    } catch (error) {
      console.error('Demo account creation error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.account.deleteSession('current');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      return await this.account.get();
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // AI Processing methods
  async generateAIInsights(deviceMac: string, deviceType: 'fish' | 'plant', timeRange?: string) {
    try {
      console.log('Generating AI insights for device:', deviceMac, 'deviceType:', deviceType);
      
      const response = await this.functions.createExecution(
        'ai-insights',
        JSON.stringify({
          deviceMac,
          deviceType,
          timeRange
        }),
        false
      );
      
      console.log('AI insights raw response:', response);
      
      // Check if response is valid
      if (!response || !response.responseBody) {
        console.error('Invalid AI insights response:', response);
        throw new Error('Invalid response from AI insights function');
      }
      
      const result = JSON.parse(response.responseBody);
      console.log('AI insights parsed result:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to generate AI insights');
      }
      
      return result.insights;
    } catch (error) {
      console.error('AI insights error:', error);
      // Return fallback insights when function is not available
      return this.generateFallbackInsights(deviceMac, deviceType, timeRange);
    }
  }

  // Fallback AI insights when cloud function is unavailable
  private async generateFallbackInsights(deviceMac: string, deviceType: 'fish' | 'plant', timeRange?: string) {
    try {
      // Get recent sensor data for analysis
      const readings = await this.getSensorReadings(deviceMac, deviceType, timeRange);
      
      if (readings.length === 0) {
        return {
          summary: 'No recent data available for analysis. Ensure your device is connected and transmitting data.',
          recommendations: [
            'Check device connectivity',
            'Verify sensor functionality',
            'Ensure proper power supply'
          ],
          trends: {},
          alerts: 0,
          dataPoints: 0
        };
      }

      // Analyze data based on device type
      if (deviceType === 'fish') {
        return this.analyzeFishDataFallback(readings, timeRange || '24h');
      } else {
        return this.analyzePlantDataFallback(readings, timeRange || '24h');
      }
    } catch (error) {
      console.error('Fallback insights error:', error);
      return {
        summary: 'Unable to generate insights at this time. Please check your device connection.',
        recommendations: ['Verify device connectivity', 'Check sensor status'],
        trends: {},
        alerts: 0,
        dataPoints: 0
      };
    }
  }

  private analyzeFishDataFallback(readings: any[], timeRange: string) {
    const dataPoints = readings.length;
    const latest = readings[readings.length - 1];
    
    // Calculate averages
    const temps = readings.filter(r => r.temperature !== undefined).map(r => r.temperature);
    const phs = readings.filter(r => r.ph !== undefined).map(r => r.ph);
    const dos = readings.filter(r => r.dissolvedOxygen !== undefined).map(r => r.dissolvedOxygen);
    
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const avgPh = phs.length > 0 ? phs.reduce((a, b) => a + b, 0) / phs.length : null;
    const avgDo = dos.length > 0 ? dos.reduce((a, b) => a + b, 0) / dos.length : null;
    
    const recommendations = [];
    
    // Temperature analysis
    if (avgTemp !== null) {
      if (avgTemp < 20) {
        recommendations.push('Water temperature is low - consider increasing to 20-28°C range');
      } else if (avgTemp > 28) {
        recommendations.push('Water temperature is high - ensure adequate cooling and aeration');
      } else {
        recommendations.push('Water temperature is within optimal range');
      }
    }
    
    // pH analysis
    if (avgPh !== null) {
      if (avgPh < 6.5) {
        recommendations.push('pH is acidic - consider adding pH buffer');
      } else if (avgPh > 8.5) {
        recommendations.push('pH is alkaline - consider water changes');
      } else {
        recommendations.push('pH levels are stable and healthy');
      }
    }
    
    // Dissolved oxygen analysis
    if (avgDo !== null) {
      if (avgDo < 5.0) {
        recommendations.push('Dissolved oxygen is low - increase aeration');
      } else {
        recommendations.push('Oxygen levels are adequate');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Fish environment appears stable - continue monitoring');
    }
    
    return {
      summary: `Analyzed ${dataPoints} data points over ${timeRange}. Environment monitoring shows ${recommendations.length > 1 ? 'some areas for improvement' : 'stable conditions'}.`,
      recommendations,
      trends: {
        temperature: { average: avgTemp, trend: 0 },
        ph: { average: avgPh, trend: 0 },
        dissolvedOxygen: { average: avgDo, trend: 0 }
      },
      alerts: 0,
      dataPoints
    };
  }
  
  private analyzePlantDataFallback(readings: any[], timeRange: string) {
    const dataPoints = readings.length;
    const latest = readings[readings.length - 1];
    
    // Calculate averages
    const temps = readings.filter(r => r.temperature !== undefined).map(r => r.temperature);
    const humidities = readings.filter(r => r.humidity !== undefined).map(r => r.humidity);
    const pressures = readings.filter(r => r.pressure !== undefined).map(r => r.pressure);
    
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const avgHumidity = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null;
    const avgPressure = pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : null;
    
    const recommendations = [];
    
    // Temperature analysis
    if (avgTemp !== null) {
      if (avgTemp < 18) {
        recommendations.push('Temperature is low - plants may benefit from warmer conditions');
      } else if (avgTemp > 30) {
        recommendations.push('Temperature is high - ensure adequate ventilation');
      } else {
        recommendations.push('Temperature is within good range for plant growth');
      }
    }
    
    // Humidity analysis
    if (avgHumidity !== null) {
      if (avgHumidity < 40) {
        recommendations.push('Humidity is low - consider increasing moisture levels');
      } else if (avgHumidity > 80) {
        recommendations.push('Humidity is high - ensure good air circulation');
      } else {
        recommendations.push('Humidity levels are optimal for plant health');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Plant environment appears optimal - continue current care routine');
    }
    
    return {
      summary: `Analyzed ${dataPoints} data points over ${timeRange}. Plant environment shows ${recommendations.length > 1 ? 'areas for optimization' : 'healthy conditions'}.`,
      recommendations,
      trends: {
        temperature: { average: avgTemp, trend: 0 },
        humidity: { average: avgHumidity, trend: 0 },
        pressure: { average: avgPressure, trend: 0 }
      },
      alerts: 0,
      dataPoints
    };
  }

  // Data import methods
  async importData(fileId: string, deviceMac: string, deviceType: 'fish' | 'plant') {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const response = await this.functions.createExecution(
        'process-data-import',
        JSON.stringify({
          fileId,
          deviceMac,
          deviceType,
          userId: user.$id
        }),
        false
      );
      
      const result = JSON.parse(response.responseBody);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to import data');
      }
      
      return result;
    } catch (error) {
      console.error('Data import error:', error);
      throw error;
    }
  }

  // Device registration methods
  async registerDevice(deviceMac: string, deviceName: string, deviceType: string) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const response = await this.functions.createExecution(
        'register-device',
        JSON.stringify({
          deviceMac,
          deviceName,
          deviceType,
          userId: user.$id,
          projectId: APPWRITE_PROJECT_ID
        }),
        false
      );
      
      const result = JSON.parse(response.responseBody);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to register device');
      }
      
      return result.device;
    } catch (error) {
      console.error('Device registration error:', error);
      throw error;
    }
  }

  // Device methods
  async getDevices() {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const response = await this.databases.listDocuments(
        APPWRITE_DATABASE_ID,
        'devices',
        [Query.equal('userId', user.$id)]
      );
      
      return response.documents;
    } catch (error) {
      console.error('Get devices error:', error);
      throw error;
    }
  }

  async getDevice(deviceId: string) {
    try {
      const response = await this.databases.getDocument(
        APPWRITE_DATABASE_ID,
        'devices',
        deviceId
      );
      
      return response;
    } catch (error) {
      console.error('Get device error:', error);
      throw error;
    }
  }

  // Sensor data methods
  async getSensorReadings(deviceMac: string, dataType: 'fish' | 'plant', timeRange?: string) {
    try {
      // Build query based on time range
      const queries = [Query.equal('deviceMac', deviceMac)];
      
      if (timeRange) {
        const now = new Date();
        let startDate;
        
        switch (timeRange) {
          case 'day':
            startDate = new Date(now.setDate(now.getDate() - 1));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(now.setDate(now.getDate() - 30)); // Default to 30 days
        }
        
        queries.push(Query.greaterThan('timestamp', startDate.toISOString()));
      }
      
      const collectionId = dataType === 'fish' ? 'fish_readings' : 'plant_readings';
      
      const response = await this.databases.listDocuments(
        APPWRITE_DATABASE_ID,
        collectionId,
        queries
      );
      
      return response.documents as unknown as SensorReading[];
    } catch (error) {
      console.error('Get sensor readings error:', error);
      throw error;
    }
  }

  // Alert methods
  async getAlerts(deviceMac?: string) {
    try {
      const queries = [];
      if (deviceMac) {
        queries.push(Query.equal('deviceMac', deviceMac));
      }
      
      const response = await this.databases.listDocuments(
        APPWRITE_DATABASE_ID,
        'alerts',
        queries
      );
      
      return response.documents as unknown as Alert[];
    } catch (error) {
      console.error('Get alerts error:', error);
      throw error;
    }
  }

  async updateAlertStatus(alertId: string, resolved: boolean) {
    try {
      const response = await this.databases.updateDocument(
        APPWRITE_DATABASE_ID,
        'alerts',
        alertId,
        { resolved }
      );
      
      return response as unknown as Alert;
    } catch (error) {
      console.error('Update alert status error:', error);
      throw error;
    }
  }

  // File methods
  async uploadFile(file: File, bucketId: string = 'data-imports') {
    try {
      const response = await this.storage.createFile(
        bucketId,
        crypto.randomUUID(),
        file
      );
      
      return response;
    } catch (error) {
      console.error('Upload file error:', error);
      throw error;
    }
  }

  async getFilePreview(fileId: string, bucketId: string = 'data-imports') {
    try {
      return this.storage.getFilePreview(bucketId, fileId);
    } catch (error) {
      console.error('Get file preview error:', error);
      throw error;
    }
  }
}

// API Service
class APIService {
  private appwriteClient: AppwriteClient;

  constructor() {
    this.appwriteClient = new AppwriteClient();
  }

  // Authentication methods
  async login(email: string, password: string) {
    return this.appwriteClient.login(email, password);
  }

  async register(email: string, password: string, name: string) {
    return this.appwriteClient.register(email, password, name);
  }

  async createDemoAccount(email: string, password: string, name: string) {
    return this.appwriteClient.createDemoAccount(email, password, name);
  }

  async logout() {
    return this.appwriteClient.logout();
  }

  async getCurrentUser() {
    return this.appwriteClient.getCurrentUser();
  }

  // Device methods
  async getDevices() {
    return this.appwriteClient.getDevices();
  }

  async getDevice(deviceId: string) {
    return this.appwriteClient.getDevice(deviceId);
  }

  async registerDevice(deviceMac: string, deviceName: string, deviceType: string) {
    return this.appwriteClient.registerDevice(deviceMac, deviceName, deviceType);
  }

  // Sensor data methods
  async getSensorReadings(deviceMac: string, dataType: 'fish' | 'plant', timeRange?: string) {
    return this.appwriteClient.getSensorReadings(deviceMac, dataType, timeRange);
  }

  // Alert methods
  async getAlerts(deviceMac?: string) {
    return this.appwriteClient.getAlerts(deviceMac);
  }

  async updateAlertStatus(alertId: string, resolved: boolean) {
    return this.appwriteClient.updateAlertStatus(alertId, resolved);
  }

  // AI methods
  async generateAIInsights(deviceMac: string, deviceType: 'fish' | 'plant', timeRange?: string) {
    return this.appwriteClient.generateAIInsights(deviceMac, deviceType, timeRange);
  }

  // Data import methods
  async importData(fileId: string, deviceMac: string, deviceType: 'fish' | 'plant') {
    return this.appwriteClient.importData(fileId, deviceMac, deviceType);
  }

  // File methods
  async uploadFile(file: File, bucketId: string = 'data-imports') {
    return this.appwriteClient.uploadFile(file, bucketId);
  }

  async getFilePreview(fileId: string, bucketId: string = 'data-imports') {
    return this.appwriteClient.getFilePreview(fileId, bucketId);
  }
}

// Create and export API service instance
const apiService = new APIService();
export default apiService;