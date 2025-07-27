import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type OperationalMode = 'online' | 'data-import' | 'demo';
export interface SensorReading {
  timestamp: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  deviceMac?: string;
  sensorType?: string;
}

export interface FishReading {
  $id: string;
  deviceMac: string;
  temperature?: number;
  ph?: number;
  dissolvedOxygen?: number;
  turbidity?: number;
  timestamp: string;
}

export interface PlantReading {
  $id: string;
  deviceMac: string;
  soilMoisture?: number;
  lightLevel?: number;
  temperature?: number;
  humidity?: number;
  timestamp: string;
}

export interface Device {
  $id: string;
  deviceId: string;
  deviceMac: string;
  deviceName: string;
  deviceType: 'fish' | 'plant';
  projectId: string;
  userId: string;
  apiKey: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
  readingInterval: number;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  fishSpecies: string;
  plantSpecies: string;
  createdDate: string;
  status: 'active' | 'inactive' | 'maintenance';
  devices: Device[];
}

export interface EnvironmentData {
  fish: {
    temperature: SensorReading[];
    ph: SensorReading[];
    dissolvedOxygen: SensorReading[];
    turbidity: SensorReading[];
  };
  plant: {
    soilMoisture: SensorReading[];
    lightLevel: SensorReading[];
    temperature: SensorReading[];
    humidity: SensorReading[];
  };
}

export interface Alert {
  $id: string;
  deviceMac: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
  timestamp: string;
  resolved: boolean;
}

export interface AIInsight {
  id: string;
  type: 'optimization' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  timestamp: string;
  actionable: boolean;
}



interface ImportedData {
  fishData: SensorReading[];
  plantData: SensorReading[];
}

interface StoreState {
  // Devices
  devices: Device[];
  selectedDevice: string | null;
  
  // Environment Data
  environmentData: EnvironmentData;
  
  // Alerts
  alerts: Alert[];
  
  // AI Insights
  aiInsights: AIInsight[];
  
  // System Status
  systemStatus: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    totalAlerts: number;
    criticalAlerts: number;
    lastUpdated: string;
  };
  
  // Connection Status
  isConnected: boolean;
  
  // Operational Mode
  operationalMode: OperationalMode;
  importedData: ImportedData;
  demoDataIndex: { fish: number; plant: number };
  
  // Actions
  setSelectedDevice: (deviceMac: string | null) => void;
  addDevice: (device: Device) => void;
  updateDevice: (deviceMac: string, updates: Partial<Device>) => void;
  removeDevice: (deviceMac: string) => void;
  addSensorReading: (type: 'fish' | 'plant', sensor: string, reading: SensorReading) => void;
  addAlert: (alert: Alert) => void;
  resolveAlert: (alertId: string) => void;
  addAIInsight: (insight: Omit<AIInsight, 'id'>) => void;
  setConnectionStatus: (connected: boolean) => void;
  updateSystemStatus: () => void;
  setOperationalMode: (mode: OperationalMode) => void;
  setImportedData: (data: ImportedData) => void;
  incrementDemoDataIndex: (type: 'fish' | 'plant') => void;
  resetStoreData: (isDemo?: boolean) => void;
}

// Generate mock sensor data
const generateMockSensorData = (): EnvironmentData => {
  const now = new Date();
  const readings: SensorReading[] = [];
  
  // Generate 24 hours of data (every hour)
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
    readings.push({
      timestamp,
      value: Math.random() * 10 + 20, // Random value between 20-30
      unit: '°C',
      status: Math.random() > 0.9 ? 'warning' : 'normal'
    });
  }
  
  return {
    fish: {
      temperature: readings.map(r => ({ ...r, value: Math.random() * 5 + 22 })),
      ph: readings.map(r => ({ ...r, value: Math.random() * 2 + 6.5, unit: 'pH' })),
      dissolvedOxygen: readings.map(r => ({ ...r, value: Math.random() * 3 + 6, unit: 'mg/L' })),
      turbidity: readings.map(r => ({ ...r, value: Math.random() * 200 + 300, unit: 'NTU' }))
    },
    plant: {
      soilMoisture: readings.map(r => ({ ...r, value: Math.random() * 20 + 60, unit: '%' })),
      lightLevel: readings.map(r => ({ ...r, value: Math.random() * 500 + 200, unit: 'lux' })),
      temperature: readings.map(r => ({ ...r, value: Math.random() * 8 + 18 })),
      humidity: readings.map(r => ({ ...r, value: Math.random() * 20 + 60, unit: '%' }))
    }
  };
};

// Initial mock data
const initialDevices: Device[] = [
  {
    $id: 'device-001',
    deviceId: 'AQ-FISH-001',
    deviceMac: '00:11:22:33:44:55',
    deviceName: 'Fish Tank Alpha Monitor',
    deviceType: 'fish',
    projectId: 'aquanexus-main',
    userId: 'demo-user',
    apiKey: 'demo-api-key-001',
    status: 'online',
    lastSeen: '2024-01-20T10:30:00Z',
    readingInterval: 300
  },
  {
    $id: 'device-002',
    deviceId: 'AQ-PLANT-001',
    deviceMac: '00:11:22:33:44:66',
    deviceName: 'Plant Bed Alpha Monitor',
    deviceType: 'plant',
    projectId: 'aquanexus-main',
    userId: 'demo-user',
    apiKey: 'demo-api-key-002',
    status: 'online',
    lastSeen: '2024-01-20T10:25:00Z',
    readingInterval: 600
  },
  {
    $id: 'device-003',
    deviceId: 'AQ-FISH-002',
    deviceMac: '00:11:22:33:44:77',
    deviceName: 'Fish Tank Beta Monitor',
    deviceType: 'fish',
    projectId: 'aquanexus-main',
    userId: 'demo-user',
    apiKey: 'demo-api-key-003',
    status: 'warning',
    lastSeen: '2024-01-20T09:45:00Z',
    readingInterval: 300
  }
];

const initialAlerts: Alert[] = [
  {
    $id: 'alert-001',
    deviceMac: '00:11:22:33:44:55',
    alertType: 'temperature_high',
    severity: 'medium',
    message: 'Fish tank temperature slightly elevated (26.8°C)',
    value: 26.8,
    threshold: 26.0,
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    resolved: false
  },
  {
    $id: 'alert-002',
    deviceMac: '00:11:22:33:44:77',
    alertType: 'device_offline',
    severity: 'critical',
    message: 'ESP32_003 device offline for 2 hours',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resolved: false
  },
  {
    $id: 'alert-003',
    deviceMac: '00:11:22:33:44:66',
    alertType: 'growth_milestone',
    severity: 'low',
    message: 'Plant growth milestone reached: 18cm height',
    value: 18,
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolved: true
  }
];

const initialAIInsights: AIInsight[] = [
  {
    id: '1',
    type: 'optimization',
    title: 'Feeding Schedule Optimization',
    description: 'AI suggests reducing feeding frequency by 15% to improve water quality and fish health.',
    confidence: 0.87,
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    actionable: true
  },
  {
    id: '2',
    type: 'prediction',
    title: 'Harvest Prediction',
    description: 'Lettuce crop will be ready for harvest in 8-10 days based on current growth rate.',
    confidence: 0.92,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actionable: false
  },
  {
    id: '3',
    type: 'recommendation',
    title: 'pH Buffer Adjustment',
    description: 'Consider adding pH buffer to maintain optimal range for Tilapia (6.8-7.2).',
    confidence: 0.78,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    actionable: true
  }
];

// Function to get initial data based on user type
const getInitialData = (isDemo: boolean = false) => {
  if (isDemo) {
    return {
      devices: initialDevices,
      environmentData: generateMockSensorData(),
      alerts: initialAlerts,
      aiInsights: initialAIInsights,
      systemStatus: {
        totalDevices: initialDevices.length,
        onlineDevices: initialDevices.filter(d => d.status === 'online').length,
        offlineDevices: initialDevices.filter(d => d.status === 'offline').length,
        totalAlerts: initialAlerts.length,
        criticalAlerts: initialAlerts.filter(a => a.severity === 'critical' && !a.resolved).length,
        lastUpdated: new Date().toISOString()
      }
    };
  }
  
  // Empty data for regular users
  return {
    devices: [],
    environmentData: {
      fish: {
        temperature: [],
        ph: [],
        dissolvedOxygen: [],
        turbidity: []
      },
      plant: {
        soilMoisture: [],
        lightLevel: [],
        temperature: [],
        humidity: []
      }
    },
    alerts: [],
    aiInsights: [],
    systemStatus: {
      totalDevices: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      totalAlerts: 0,
      criticalAlerts: 0,
      lastUpdated: new Date().toISOString()
    }
  };
};

// Separate persisted store for operational mode
interface OperationalModeStore {
  operationalMode: OperationalMode;
  setOperationalMode: (mode: OperationalMode) => void;
  saveOperationalMode: (mode: OperationalMode) => void;
}

export const useOperationalModeStore = create<OperationalModeStore>()(persist(
  (set) => ({
    operationalMode: 'data-import',
    setOperationalMode: (mode) => set({ operationalMode: mode }),
    saveOperationalMode: (mode) => set({ operationalMode: mode })
  }),
  {
    name: 'operational-mode-storage',
    partialize: (state) => ({ operationalMode: state.operationalMode })
  }
));

export const useStore = create<StoreState>((set, get) => {
  // Check if user is demo from auth store
  const isDemo = typeof window !== 'undefined' && 
    JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user?.isDemo || false;
  
  const initialData = getInitialData(isDemo);
  
  // Get operational mode from persisted store or set default based on user type
  const persistedMode = useOperationalModeStore.getState().operationalMode;
  const defaultMode: OperationalMode = isDemo ? 'demo' : persistedMode || 'data-import';
  
  return {
    // Initial state
    devices: initialData.devices,
    selectedDevice: null,
    environmentData: initialData.environmentData,
    alerts: initialData.alerts,
    aiInsights: initialData.aiInsights,
    systemStatus: initialData.systemStatus,
    isConnected: true,
    operationalMode: defaultMode,
    importedData: { fishData: [], plantData: [] },
    demoDataIndex: { fish: 0, plant: 0 },
  
  // Actions
  setSelectedDevice: (deviceMac) => set({ selectedDevice: deviceMac }),
  
  addDevice: (device) => set((state) => ({
    devices: [...state.devices, device]
  })),
  
  updateDevice: (deviceMac, updates) => set((state) => ({
    devices: state.devices.map(d => d.deviceMac === deviceMac ? { ...d, ...updates } : d)
  })),
  
  removeDevice: (deviceMac) => set((state) => ({
    devices: state.devices.filter(d => d.deviceMac !== deviceMac),
    selectedDevice: state.selectedDevice === deviceMac ? null : state.selectedDevice
  })),
  
  addSensorReading: (type, sensor, reading) => set((state) => {
    const newData = { ...state.environmentData };
    if (newData[type] && newData[type][sensor as keyof typeof newData[typeof type]]) {
      const sensorData = newData[type][sensor as keyof typeof newData[typeof type]] as SensorReading[];
      sensorData.push(reading);
      // Keep only last 100 readings
      if (sensorData.length > 100) {
        sensorData.shift();
      }
    }
    return { environmentData: newData };
  }),
  
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts]
  })),
  
  resolveAlert: (alertId) => set((state) => ({
    alerts: state.alerts.map(a => a.$id === alertId ? { ...a, resolved: true } : a)
  })),
  
  addAIInsight: (insight) => set((state) => ({
    aiInsights: [{ ...insight, id: Date.now().toString() }, ...state.aiInsights]
  })),
  
  setConnectionStatus: (connected) => set({ isConnected: connected }),
  
  updateSystemStatus: () => set((state) => {
    const totalDevices = state.devices.length;
    const onlineDevices = state.devices.filter(d => d.status === 'online').length;
    const offlineDevices = totalDevices - onlineDevices;
    const totalAlerts = state.alerts.length;
    const criticalAlerts = state.alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
    
    return {
      systemStatus: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        totalAlerts,
        criticalAlerts,
        lastUpdated: new Date().toISOString()
      }
    };
  }),
  
  setOperationalMode: (mode) => {
    set({ operationalMode: mode });
    // Also update the persisted store
    useOperationalModeStore.getState().setOperationalMode(mode);
  },
  
  setImportedData: (data) => set({ importedData: data }),
  
  incrementDemoDataIndex: (type) => set((state) => ({
    demoDataIndex: {
      ...state.demoDataIndex,
      [type]: state.demoDataIndex[type] + 1
    }
  })),
  
  // Reset store data based on user type
  resetStoreData: (isDemo: boolean = false) => {
    const newData = getInitialData(isDemo);
    // Preserve operational mode from persisted store unless it's a demo user
    const persistedMode = useOperationalModeStore.getState().operationalMode;
    const defaultMode: OperationalMode = isDemo ? 'demo' : persistedMode || 'data-import';
    set({
      devices: newData.devices,
      selectedDevice: null,
      environmentData: newData.environmentData,
      alerts: newData.alerts,
      aiInsights: newData.aiInsights,
      systemStatus: newData.systemStatus,
      operationalMode: defaultMode
    });
  }
  };
});