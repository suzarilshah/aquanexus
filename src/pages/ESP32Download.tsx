import React, { useState } from 'react';
import { Download, FileText, Cpu, Wifi, Settings, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

interface FirmwareFile {
  id: string;
  name: string;
  description: string;
  filename: string;
  size: string;
  version: string;
  type: 'fish' | 'plant' | 'guide';
  icon: React.ReactNode;
  features: string[];
}

const ESP32Download: React.FC = () => {
  const [downloadStatus, setDownloadStatus] = useState<{ [key: string]: 'idle' | 'downloading' | 'complete' }>({});

  const firmwareFiles: FirmwareFile[] = [
    {
      id: 'fish-monitor',
      name: 'Fish Environment Monitor',
      description: 'Complete firmware for monitoring fish tank water quality parameters',
      filename: 'aquanexus-fish-monitor.ino',
      size: '45 KB',
      version: '1.0.0',
      type: 'fish',
      icon: <Cpu className="h-6 w-6 text-blue-500" />,
      features: [
        'Water temperature monitoring (DS18B20)',
        'pH level measurement',
        'Dissolved oxygen sensing',
        'Turbidity measurement',
        'Water level detection',
        'WiFi connectivity',
        'WebSocket real-time data streaming',
        'Alert system with buzzer',
        'Automatic device registration',
        'Sensor calibration support'
      ]
    },
    {
      id: 'plant-monitor',
      name: 'Plant Environment Monitor',
      description: 'Complete firmware for monitoring plant growing conditions and nutrients',
      filename: 'aquanexus-plant-monitor.ino',
      size: '42 KB',
      version: '1.0.0',
      type: 'plant',
      icon: <Cpu className="h-6 w-6 text-green-500" />,
      features: [
        'Air temperature & humidity (DHT22)',
        'Light intensity measurement (BH1750)',
        'Soil moisture monitoring',
        'Nutrient pH measurement',
        'Electrical conductivity (EC) sensing',
        'Automated irrigation control',
        'Light control automation',
        'WiFi connectivity',
        'WebSocket real-time data streaming',
        'Alert system with buzzer'
      ]
    },
    {
      id: 'setup-guide',
      name: 'Setup Guide & Documentation',
      description: 'Comprehensive setup guide with wiring diagrams and troubleshooting',
      filename: 'SETUP.md',
      size: '12 KB',
      version: '1.0.0',
      type: 'guide',
      icon: <FileText className="h-6 w-6 text-purple-500" />,
      features: [
        'Hardware requirements list',
        'Pin connection diagrams',
        'Arduino IDE setup instructions',
        'Library installation guide',
        'Flashing instructions',
        'Sensor calibration procedures',
        'Troubleshooting guide',
        'Production deployment tips'
      ]
    }
  ];

  const handleDownload = async (file: FirmwareFile) => {
    setDownloadStatus(prev => ({ ...prev, [file.id]: 'downloading' }));

    try {
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create download link
      const element = document.createElement('a');
      
      if (file.type === 'guide') {
        // For the setup guide, we'll create a downloadable markdown file
        const setupContent = `# ESP32 Firmware Setup Guide\n\nThis is a placeholder for the actual setup guide content.\nIn a real implementation, this would contain the full setup instructions.`;
        const blob = new Blob([setupContent], { type: 'text/markdown' });
        element.href = URL.createObjectURL(blob);
      } else {
        // For firmware files, we'll create placeholder Arduino code
        const firmwareContent = `/*\n * AquaNexus ${file.name}\n * Version: ${file.version}\n * \n * This is a placeholder for the actual firmware code.\n * In a real implementation, this would contain the complete Arduino sketch.\n */\n\nvoid setup() {\n  // Initialization code\n}\n\nvoid loop() {\n  // Main program loop\n}`;
        const blob = new Blob([firmwareContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(blob);
      }
      
      element.download = file.filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      setDownloadStatus(prev => ({ ...prev, [file.id]: 'complete' }));
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setDownloadStatus(prev => ({ ...prev, [file.id]: 'idle' }));
      }, 3000);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus(prev => ({ ...prev, [file.id]: 'idle' }));
    }
  };

  const getDownloadButtonContent = (fileId: string) => {
    const status = downloadStatus[fileId] || 'idle';
    
    switch (status) {
      case 'downloading':
        return (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Downloading...
          </>
        );
      case 'complete':
        return (
          <>
            <CheckCircle className="h-4 w-4" />
            Downloaded
          </>
        );
      default:
        return (
          <>
            <Download className="h-4 w-4" />
            Download
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">ESP32 Firmware Download</h1>
            <p className="text-blue-100">Get started with AquaNexus IoT monitoring devices</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-5 w-5" />
              <span className="font-semibold">WiFi Ready</span>
            </div>
            <p className="text-sm text-blue-100">Connect to your network and start monitoring</p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-5 w-5" />
              <span className="font-semibold">Easy Setup</span>
            </div>
            <p className="text-sm text-blue-100">Flash and configure in minutes</p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Production Ready</span>
            </div>
            <p className="text-sm text-blue-100">Tested and optimized for reliability</p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-2">Before You Start</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Ensure you have Arduino IDE installed with ESP32 board support</li>
                <li>• Download and read the setup guide first</li>
                <li>• Have your WiFi credentials and AquaNexus server details ready</li>
                <li>• Check that you have all required sensors and components</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {firmwareFiles.map((file) => (
          <Card key={file.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {file.icon}
                  <div>
                    <CardTitle className="text-lg">{file.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">v{file.version}</Badge>
                      <Badge variant="secondary">{file.size}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">
                {file.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Features
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {file.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                    {file.features.length > 4 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <li className="text-blue-600 cursor-help">
                              +{file.features.length - 4} more features...
                            </li>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <ul className="space-y-1">
                              {file.features.slice(4).map((feature, index) => (
                                <li key={index} className="text-sm">
                                  • {feature}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </ul>
                </div>
                
                <Button 
                  onClick={() => handleDownload(file)}
                  className="w-full"
                  disabled={downloadStatus[file.id] === 'downloading'}
                >
                  {getDownloadButtonContent(file.id)}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Start Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>
            Follow these steps to get your ESP32 device up and running
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Download Files</h3>
              <p className="text-sm text-gray-600">Download the setup guide and appropriate firmware</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Setup Hardware</h3>
              <p className="text-sm text-gray-600">Connect sensors according to wiring diagram</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Flash Firmware</h3>
              <p className="text-sm text-gray-600">Upload code to ESP32 using Arduino IDE</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-2">Start Monitoring</h3>
              <p className="text-sm text-gray-600">Device will auto-register and begin data streaming</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Information */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              Check out our documentation or reach out to our support team
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Documentation
              </Button>
              <Button variant="outline" size="sm">
                <Wifi className="h-4 w-4 mr-2" />
                Community Forum
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ESP32Download;