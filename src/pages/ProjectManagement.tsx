import React, { useState } from 'react';
import { 
  Plus, 
  Settings, 
  Wifi, 
  WifiOff, 
  QrCode, 
  Edit, 
  Trash2,
  Fish,
  Leaf,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import apiService from '@/lib/api';
import { toast } from 'sonner';

// Device type options
const deviceTypes = [
  { id: 'fish', name: 'Fish Monitor', description: 'Monitors fish tank environment' },
  { id: 'plant', name: 'Plant Monitor', description: 'Monitors plant growing conditions' }
];



function ProjectManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newDevice, setNewDevice] = useState({
    deviceName: '',
    deviceType: 'fish' as 'fish' | 'plant',
    readingInterval: 300
  });
  
  const { devices, addDevice, removeDevice, updateDevice } = useStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-50';
      case 'offline': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const handleCreateDevice = async () => {
    if (!newDevice.deviceName || !newDevice.deviceType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.registerDevice(
        newDevice.deviceName,
        newDevice.deviceType,
        newDevice.readingInterval.toString()
      );
      
      if (response.success) {
        toast.success('Device registered successfully!');
        setShowCreateForm(false);
        setNewDevice({ deviceName: '', deviceType: 'fish', readingInterval: 300 });
        // The device will be added to the store when we fetch devices
      } else {
        toast.error(response.error || 'Failed to register device');
      }
    } catch (error) {
      console.error('Error registering device:', error);
      toast.error('Failed to register device');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceMac: string) => {
    if (confirm('Are you sure you want to remove this device?')) {
      removeDevice(deviceMac);
      toast.success('Device removed successfully');
    }
  };

  const generateDeviceCredentials = (deviceMac: string) => {
    // Generate QR code or credentials for ESP32 setup
    const device = devices.find(d => d.deviceMac === deviceMac);
    if (device) {
      const credentials = {
        deviceId: device.deviceId,
        apiKey: device.apiKey,
        deviceMac: device.deviceMac
      };
      console.log('Device credentials:', credentials);
      toast.info('Device credentials generated (check console)');
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-slate-500" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Device Management</h1>
            <p className="text-slate-600 mt-1">Manage aquaponics monitoring devices</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-green-500 hover:bg-green-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Register Device
        </Button>
      </div>

      {/* Register Device Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Register New Device</CardTitle>
            <CardDescription>Add a new monitoring device to your aquaponics system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Device Name
                  </label>
                  <input
                    type="text"
                    value={newDevice.deviceName}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, deviceName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Fish Tank Alpha Monitor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Device Type
                  </label>
                  <select
                    value={newDevice.deviceType}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, deviceType: e.target.value as 'fish' | 'plant' }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {deviceTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reading Interval (seconds)
                  </label>
                  <select
                    value={newDevice.readingInterval}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, readingInterval: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value={60}>1 minute</option>
                    <option value={300}>5 minutes</option>
                    <option value={600}>10 minutes</option>
                    <option value={1800}>30 minutes</option>
                    <option value={3600}>1 hour</option>
                  </select>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Flash the ESP32 firmware</li>
                    <li>2. Connect to device WiFi hotspot</li>
                    <li>3. Scan QR code for credentials</li>
                    <li>4. Configure WiFi settings</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 mt-6">
              <Button 
                onClick={handleCreateDevice}
                className="bg-green-500 hover:bg-green-600"
                disabled={!newDevice.deviceName || isLoading}
              >
                {isLoading ? 'Registering...' : 'Register Device'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Devices List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {devices.map((device) => (
          <Card key={device.deviceMac} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{device.deviceName}</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    device.status === 'online' ? 'bg-green-500' : 
                    device.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm font-medium capitalize">{device.status}</span>
                </div>
              </div>
              <CardDescription>Device ID: {device.deviceId}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Device Type</p>
                    <p className="text-sm capitalize">{device.deviceType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">MAC Address</p>
                    <p className="text-sm font-mono text-xs">{device.deviceMac}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Reading Interval</p>
                    <p className="text-sm">{device.readingInterval}s</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Last Seen</p>
                    <p className="text-sm">{formatLastSeen(device.lastSeen)}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => generateDeviceCredentials(device.deviceMac)}
                  >
                    <QrCode className="w-4 h-4 mr-1" />
                    QR Code
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleRemoveDevice(device.deviceMac)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Device Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <span>Device Setup Guide</span>
          </CardTitle>
          <CardDescription>Step-by-step instructions for ESP32 device configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Hardware Setup</h4>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-900 mb-1">1. Flash Firmware</div>
                  <p className="text-sm text-blue-800">Upload the AquaNexus firmware to your ESP32 using Arduino IDE or PlatformIO</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-900 mb-1">2. Connect Sensors</div>
                  <p className="text-sm text-blue-800">Wire pH, temperature, and dissolved oxygen sensors to designated GPIO pins</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-900 mb-1">3. Power On</div>
                  <p className="text-sm text-blue-800">Connect power supply and verify LED indicators show device is ready</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Network Configuration</h4>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-900 mb-1">1. WiFi Setup</div>
                  <p className="text-sm text-green-800">Connect to device hotspot (AquaNexus-XXXX) and configure WiFi credentials</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-900 mb-1">2. Device Registration</div>
                  <p className="text-sm text-green-800">Use the QR code to automatically configure device credentials and API keys</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-900 mb-1">3. Verify Connection</div>
                  <p className="text-sm text-green-800">Check device status shows 'online' and data readings appear in dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectManagement;