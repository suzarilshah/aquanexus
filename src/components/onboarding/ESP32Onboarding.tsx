import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wifi, 
  Cpu, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Download,
  Thermometer,
  Droplets,
  Zap,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import apiService from '@/lib/api';

interface ESP32OnboardingProps {
  onComplete: () => void;
}

export const ESP32Onboarding: React.FC<ESP32OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState<'fish' | 'plant'>('fish');
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [deviceMac, setDeviceMac] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  
  const { addDevice } = useStore();
  const { user } = useAuthStore();

  const generateDeviceId = () => {
    const id = `ESP32_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    setDeviceId(id);
    return id;
  };

  const generateDeviceMac = () => {
    const mac = Array.from({ length: 6 }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join(':').toUpperCase();
    setDeviceMac(mac);
    return mac;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const downloadConfig = () => {
    const config = {
      device_id: deviceId,
      device_mac: deviceMac,
      wifi_ssid: wifiSSID,
      wifi_password: wifiPassword,
      appwrite_endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1',
      appwrite_project_id: import.meta.env.VITE_APPWRITE_PROJECT_ID || '687f8e78001ac206db80',
      ingest_function_url: `${import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1'}/functions/ingest-sensor-data/executions`,
      api_key: apiKey,
      device_type: deviceType,
      reading_interval: 300 // 5 minutes
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esp32_config_${deviceId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Configuration file downloaded!');
  };

  const registerDevice = async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate a secure API key for the device
      const generatedApiKey = `ak_${Math.random().toString(36).substr(2, 32)}`;
      setApiKey(generatedApiKey);

      // Register device with Appwrite using the register-device function
      const response = await fetch(`${import.meta.env.VITE_APPWRITE_ENDPOINT}/functions/register-device/executions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
        },
        body: JSON.stringify({
          deviceId: deviceId,
          deviceMac: deviceMac,
          deviceName: deviceName,
          deviceType: deviceType,
          projectId: 'default-project',
          userId: user.id,
          apiKey: generatedApiKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      setConnectionStatus('connected');
      
      // Add device to store
      addDevice({
        $id: result.deviceId,
        deviceId: deviceId,
        deviceMac: deviceMac,
        deviceName: deviceName,
        deviceType: deviceType,
        projectId: 'default-project',
        userId: user.id,
        apiKey: generatedApiKey,
        status: 'offline',
        lastSeen: new Date().toISOString(),
        readingInterval: 300
      });
      
      toast.success('ESP32 device registered successfully!');
    } catch (error) {
      console.error('Device registration error:', error);
      setConnectionStatus('failed');
      toast.error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsConnecting(false);
  };

  const handleComplete = () => {
    if (connectionStatus === 'connected') {
      onComplete();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Cpu className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Setup Your ESP32 Device</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Let's configure your ESP32 microcontroller for aquaponics monitoring
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="deviceName">Device Name</Label>
                <Input
                  id="deviceName"
                  placeholder="e.g., Main Tank Monitor"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Device Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={deviceType === 'fish' ? 'default' : 'outline'}
                    onClick={() => setDeviceType('fish')}
                    className="flex-1"
                  >
                    <Droplets className="w-4 h-4 mr-2" />
                    Fish Monitor
                  </Button>
                  <Button
                    variant={deviceType === 'plant' ? 'default' : 'outline'}
                    onClick={() => setDeviceType('plant')}
                    className="flex-1"
                  >
                    <Thermometer className="w-4 h-4 mr-2" />
                    Plant Monitor
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  if (deviceName.trim()) {
                    generateDeviceId();
                    generateDeviceMac();
                    setStep(2);
                  } else {
                    toast.error('Please enter a device name');
                  }
                }}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Wifi className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">WiFi Configuration</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Configure your WiFi settings for the ESP32
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="wifiSSID">WiFi Network Name (SSID)</Label>
                <Input
                  id="wifiSSID"
                  placeholder="Your WiFi network name"
                  value={wifiSSID}
                  onChange={(e) => setWifiSSID(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="wifiPassword">WiFi Password</Label>
                <Input
                  id="wifiPassword"
                  type="password"
                  placeholder="Your WiFi password"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => {
                    if (wifiSSID.trim() && wifiPassword.trim()) {
                      setStep(3);
                    } else {
                      toast.error('Please fill in all WiFi details');
                    }
                  }}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Download className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Device Registration</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Register your ESP32 device with the system
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Device ID</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(deviceId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-sm bg-white dark:bg-gray-900 p-2 rounded block">
                  {deviceId}
                </code>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Device MAC</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(deviceMac)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-sm bg-white dark:bg-gray-900 p-2 rounded block">
                  {deviceMac}
                </code>
              </div>
              
              <Button 
                onClick={registerDevice}
                className="w-full"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Registering Device...
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4 mr-2" />
                    Register Device
                  </>
                )}
              </Button>
              
              {connectionStatus === 'connected' && apiKey && (
                <>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="font-medium text-green-800 dark:text-green-200">Device Registered Successfully!</span>
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Your device has been registered and is ready for configuration.
                    </div>
                  </div>
                  
                  <Button onClick={downloadConfig} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Configuration
                  </Button>
                </>
              )}
              
              {connectionStatus === 'failed' && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="font-medium text-red-800 dark:text-red-200">Registration Failed</span>
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Please check your connection and try again.
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  Back
                </Button>
                {connectionStatus === 'connected' && (
                  <Button 
                    onClick={() => setStep(4)}
                    className="flex-1"
                  >
                    Continue
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Setup Complete</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your ESP32 device has been successfully configured
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800 dark:text-green-200">Device Registered</span>
                </div>
                <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                  <div className="flex justify-between">
                    <span>Device ID:</span>
                    <code className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded">{deviceId}</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Device Type:</span>
                    <span className="capitalize">{deviceType} Monitor</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant="default">Registered</Badge>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center mb-2">
                  <Eye className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">Next Steps</span>
                </div>
                <ol className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                  <li>1. Flash the AquaNexus firmware to your ESP32</li>
                  <li>2. Upload the downloaded configuration file</li>
                  <li>3. Connect your sensors to the designated pins</li>
                  <li>4. Power on your device to start monitoring</li>
                </ol>
              </div>
              
              {apiKey && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">API Key:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <code className="text-xs bg-white dark:bg-gray-900 p-2 rounded block break-all">
                    {apiKey}
                  </code>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Keep this API key secure. It's required for your device to send data.
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => {
                    onComplete?.();
                    toast.success('ESP32 setup completed successfully!');
                  }}
                  className="flex-1"
                >
                  Complete Setup
                </Button>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Cpu className="h-5 w-5 mr-2" />
          ESP32 Setup
        </CardTitle>
        <CardDescription>
          Step {step} of 4: Configure your IoT device
        </CardDescription>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </CardHeader>
      
      <CardContent>
        {renderStep()}
      </CardContent>
    </Card>
  );
};

export default ESP32Onboarding;