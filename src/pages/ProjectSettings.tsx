import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useStore, useOperationalModeStore, OperationalMode } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Settings, Wifi, Upload, Play, Pause, FileText, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface CSVRow {
  Timestamp: string;
  [key: string]: string;
}

function ProjectSettings() {
  const { 
    operationalMode, 
    setOperationalMode, 
    setImportedData, 
    importedData,
    systemStatus,
    isConnected
  } = useStore();
  
  const { saveOperationalMode } = useOperationalModeStore();
  const { user } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ fish: false, plant: false });
  const [selectedMode, setSelectedMode] = useState<OperationalMode>(operationalMode);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleModeChange = (mode: OperationalMode) => {
    setSelectedMode(mode);
    setHasUnsavedChanges(mode !== operationalMode);
  };

  const handleSaveMode = () => {
    setOperationalMode(selectedMode);
    saveOperationalMode(selectedMode);
    setHasUnsavedChanges(false);
    toast.success(`Operational mode saved: ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} mode`);
  };

  const handleCancelChanges = () => {
    setSelectedMode(operationalMode);
    setHasUnsavedChanges(false);
    toast.info('Changes cancelled');
  };

  const handleFileUpload = async (file: File, type: 'fish' | 'plant') => {
    setIsUploading(true);
    setUploadProgress(prev => ({ ...prev, [type]: true }));

    try {
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        complete: (results) => {
          const data = results.data as CSVRow[];
          
          // Convert CSV data to sensor readings format
          const sensorReadings = data
            .filter(row => row.Timestamp && row.Timestamp.trim() !== '')
            .map(row => {
              const timestamp = new Date(row.Timestamp).toISOString();
              
              if (type === 'fish') {
                return {
                  timestamp,
                  temperature: parseFloat(row['Water Temperature(°C)'] || '0'),
                  ph: parseFloat(row['Water pH'] || '0'),
                  ec: parseFloat(row['EC Values(uS/cm)'] || '0'),
                  tds: parseFloat(row['TDS(mg/L)'] || '0'),
                  turbidity: parseFloat(row['Turbidity(NTU)'] || '0')
                };
              } else {
                return {
                  timestamp,
                  height: parseFloat(row['Height of the Plant(cm)'] || '0'),
                  temperature: parseFloat(row['Plant Temperature(°C)'] || '0'),
                  humidity: parseFloat(row['Humidity(RH)'] || '0'),
                  pressure: parseFloat(row['Pressure(Pa)'] || '0')
                };
              }
            });

          // Update imported data
          const newImportedData = {
            ...importedData,
            [type === 'fish' ? 'fishData' : 'plantData']: sensorReadings
          };
          
          setImportedData(newImportedData);
          toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data imported successfully (${sensorReadings.length} records)`);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast.error(`Failed to parse ${type} CSV file`);
        }
      });
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(`Failed to upload ${type} file`);
    } finally {
      setIsUploading(false);
      setUploadProgress(prev => ({ ...prev, [type]: false }));
    }
  };

  const getModeIcon = (mode: OperationalMode) => {
    switch (mode) {
      case 'online': return <Wifi className="h-4 w-4" />;
      case 'data-import': return <Upload className="h-4 w-4" />;
      case 'demo': return <Play className="h-4 w-4" />;
    }
  };

  const getModeDescription = (mode: OperationalMode) => {
    switch (mode) {
      case 'online': return 'Real-time data from connected ESP32 devices';
      case 'data-import': return 'Upload and analyze historical CSV data';
      case 'demo': return 'Simulated real-time data for demonstration';
    }
  };



  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Project Settings</h1>
          <p className="text-muted-foreground">Configure your AquaNexus dashboard operational mode</p>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{systemStatus.totalDevices}</div>
              <div className="text-sm text-muted-foreground">Total Devices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemStatus.onlineDevices}</div>
              <div className="text-sm text-muted-foreground">Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{systemStatus.offlineDevices}</div>
              <div className="text-sm text-muted-foreground">Offline</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-sm text-muted-foreground">WebSocket</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Modes */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Modes</CardTitle>
          <CardDescription>
            Choose how you want to use the AquaNexus dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['online', 'data-import', 'demo'] as OperationalMode[]).map((mode) => (
            <div key={mode} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getModeIcon(mode)}
                <div>
                  <h3 className="font-semibold capitalize">
                    {mode.replace('-', ' ')} Mode
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getModeDescription(mode)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {operationalMode === mode && <Badge variant="default">Active</Badge>}
                {selectedMode === mode && selectedMode !== operationalMode && <Badge variant="secondary">Selected</Badge>}
                {selectedMode !== mode && operationalMode !== mode && <Badge variant="outline">Inactive</Badge>}
                <Button
                  variant={selectedMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModeChange(mode)}
                >
                  {selectedMode === mode ? 'Selected' : 'Select'}
                </Button>
              </div>
            </div>
          ))}
          
          {/* Save/Cancel Buttons */}
          {hasUnsavedChanges && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">You have unsaved changes</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelChanges}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveMode}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Mode
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Import Section */}
      {operationalMode === 'data-import' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Data Import
            </CardTitle>
            <CardDescription>
              Upload historical CSV data for fish and plant environments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fish Data Upload */}
            <div className="space-y-3">
              <Label htmlFor="fish-upload" className="text-base font-medium">
                Fish Environment Data
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="fish-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'fish');
                  }}
                  disabled={isUploading}
                  className="flex-1"
                />
                {uploadProgress.fish && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Uploading...</span>
                  </div>
                )}
                {importedData.fishData.length > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">{importedData.fishData.length} records</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Expected columns: Timestamp, Water Temperature(°C), Water pH, EC Values(uS/cm), TDS(mg/L), Turbidity(NTU)
              </p>
            </div>

            <Separator />

            {/* Plant Data Upload */}
            <div className="space-y-3">
              <Label htmlFor="plant-upload" className="text-base font-medium">
                Plant Environment Data
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="plant-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'plant');
                  }}
                  disabled={isUploading}
                  className="flex-1"
                />
                {uploadProgress.plant && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Uploading...</span>
                  </div>
                )}
                {importedData.plantData.length > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">{importedData.plantData.length} records</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Expected columns: Timestamp, Height of the Plant(cm), Plant Temperature(°C), Humidity(RH), Pressure(Pa)
              </p>
            </div>

            {/* Import Summary */}
            {(importedData.fishData.length > 0 || importedData.plantData.length > 0) && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Import Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Fish Records:</span>
                    <span className="ml-2 font-medium">{importedData.fishData.length}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Plant Records:</span>
                    <span className="ml-2 font-medium">{importedData.plantData.length}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Demo Mode Info */}
      {operationalMode === 'demo' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Demo Mode Active
            </CardTitle>
            <CardDescription>
              Simulated real-time data streaming is now active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Mock data streaming enabled</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <FileText className="h-4 w-4" />
                <span>Using predefined fish and plant datasets</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Demo mode simulates real-time sensor data using historical datasets. 
                Data is recycled and timestamps are updated to current time for demonstration purposes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">User</Label>
              <p className="text-sm text-muted-foreground">{user?.name || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-muted-foreground">{user?.email || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Account Type</Label>
              <Badge variant={user?.isDemo ? "secondary" : "default"}>
                {user?.isDemo ? 'Demo Account' : 'Regular Account'}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Current Mode</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {operationalMode.replace('-', ' ')}
                </Badge>
                {hasUnsavedChanges && (
                  <Badge variant="secondary" className="text-xs">
                    Pending: {selectedMode.replace('-', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectSettings;