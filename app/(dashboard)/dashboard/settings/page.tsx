'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Save, TestTube, CheckCircle, XCircle, Loader2, Brain, AlertTriangle,
  ChevronDown, ChevronUp, Radio, Fish, Leaf, Trash2, Power, Cpu, ExternalLink,
  Plus, Clock, Zap, RefreshCw, Settings2, Play, Pause, MoreVertical, Globe
} from 'lucide-react';

interface AIConfig {
  model1Name: string;
  model1Endpoint: string;
  model1ApiKey?: string;
  model1ApiVersion?: string;
  model2Name: string;
  model2Endpoint: string;
  model2ApiKey?: string;
  model2ApiVersion?: string;
  consensusEnabled: boolean;
}

interface ConnectionError {
  code?: string;
  statusCode?: number;
  statusText?: string;
  suggestion?: string;
  timestamp?: string;
  details?: string;
}

interface DeviceOption {
  id: string;
  name: string;
  mac: string;
  status: string;
  isVirtual: boolean;
}

interface VirtualDeviceConfig {
  enabled: boolean;
  dataSource: string;
  speedMultiplier: number;
  fishDeviceId: string | null;
  plantDeviceId: string | null;
}

interface VirtualEnvironment {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  streamingSpeed: '1x' | '2x' | '5x' | '10x' | '20x';
  dataSource: string;
  fishDeviceId: string | null;
  plantDeviceId: string | null;
  fishDevice?: { id: string; name: string; mac: string } | null;
  plantDevice?: { id: string; name: string; mac: string } | null;
  cronJobId: number | null;
  cronJobEnabled: boolean;
  cronJobLastSync: string | null;
  cronJobUrl: string | null;
  currentFishIndex: number;
  currentPlantIndex: number;
  lastStreamedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const SPEED_OPTIONS = [
  { value: '1x', label: '1X (Real-time)', description: '1 reading per 5 hours - matches CSV timing exactly', color: 'gray' },
  { value: '2x', label: '2X', description: '2 readings per trigger - completes 2x faster', color: 'blue' },
  { value: '5x', label: '5X', description: '5 readings per trigger - completes 5x faster', color: 'green' },
  { value: '10x', label: '10X', description: '10 readings per trigger - completes 10x faster', color: 'orange' },
  { value: '20x', label: '20X', description: '20 readings per trigger - completes 20x faster', color: 'red' },
] as const;

export default function SettingsPage() {
  const [config, setConfig] = useState<AIConfig>({
    model1Name: 'gpt-o3-mini',
    model1Endpoint: '',
    model1ApiKey: '',
    model1ApiVersion: '',
    model2Name: 'deepseek-r1',
    model2Endpoint: '',
    model2ApiKey: '',
    model2ApiVersion: '',
    consensusEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<{
    model1: 'idle' | 'testing' | 'success' | 'error';
    model2: 'idle' | 'testing' | 'success' | 'error';
  }>({ model1: 'idle', model2: 'idle' });
  const [connectionErrors, setConnectionErrors] = useState<{
    model1?: ConnectionError;
    model2?: ConnectionError;
  }>({});
  const [showErrorDetails, setShowErrorDetails] = useState<{
    model1: boolean;
    model2: boolean;
  }>({ model1: false, model2: false });

  // Virtual device state
  const [virtualConfig, setVirtualConfig] = useState<VirtualDeviceConfig>({
    enabled: false,
    dataSource: 'validation',
    speedMultiplier: 1,
    fishDeviceId: null,
    plantDeviceId: null,
  });
  const [fishDevices, setFishDevices] = useState<DeviceOption[]>([]);
  const [plantDevices, setPlantDevices] = useState<DeviceOption[]>([]);
  const [isVirtualSaving, setIsVirtualSaving] = useState(false);
  const [isVirtualDeleting, setIsVirtualDeleting] = useState(false);

  // Multi-environment state
  const [environments, setEnvironments] = useState<VirtualEnvironment[]>([]);
  const [isEnvLoading, setIsEnvLoading] = useState(true);
  const [showCreateEnv, setShowCreateEnv] = useState(false);
  const [newEnv, setNewEnv] = useState<{
    name: string;
    description: string;
    streamingSpeed: '1x' | '2x' | '5x' | '10x' | '20x';
    dataSource: string;
    fishDeviceId: string;
    plantDeviceId: string;
  }>({
    name: '',
    description: '',
    streamingSpeed: '1x',
    dataSource: 'training',
    fishDeviceId: '',
    plantDeviceId: '',
  });
  const [isCreatingEnv, setIsCreatingEnv] = useState(false);
  const [syncingEnvId, setSyncingEnvId] = useState<string | null>(null);
  const [deletingEnvId, setDeletingEnvId] = useState<string | null>(null);
  const [togglingEnvId, setTogglingEnvId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchVirtualConfig();
    fetchEnvironments();
  }, []);

  const renderErrorDetails = (modelKey: 'model1' | 'model2') => {
    const error = connectionErrors[modelKey];
    const showDetails = showErrorDetails[modelKey];

    if (!error) return null;

    return (
      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-800">
                {error.code && <span className="font-mono text-xs bg-red-100 px-1 py-0.5 rounded mr-2">{error.code}</span>}
                {error.statusCode && <span className="text-red-600">HTTP {error.statusCode}</span>}
              </span>
              <button
                onClick={() => setShowErrorDetails(prev => ({ ...prev, [modelKey]: !prev[modelKey] }))}
                className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                {showDetails ? (
                  <>Hide details <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Show details <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            </div>

            {error.suggestion && (
              <p className="mt-1 text-sm text-red-700">{error.suggestion}</p>
            )}

            {showDetails && (
              <div className="mt-2 space-y-2 text-xs">
                {error.timestamp && (
                  <p className="text-red-600">
                    <span className="font-medium">Time:</span> {new Date(error.timestamp).toLocaleString()}
                  </p>
                )}
                {error.statusText && (
                  <p className="text-red-600">
                    <span className="font-medium">Status:</span> {error.statusText}
                  </p>
                )}
                {error.details && (
                  <div className="mt-2">
                    <p className="font-medium text-red-700 mb-1">Response details:</p>
                    <pre className="bg-red-100 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-32 overflow-y-auto font-mono">
                      {error.details}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (data.config) {
        setConfig({
          ...data.config,
          model1ApiKey: '',
          model1ApiVersion: data.config.model1ApiVersion || '',
          model2ApiKey: '',
          model2ApiVersion: data.config.model2ApiVersion || '',
        });
      }
    } catch {
      toast.error('Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVirtualConfig = async () => {
    try {
      const res = await fetch('/api/virtual-devices');
      const data = await res.json();
      if (data) {
        setFishDevices(data.fishDevices || []);
        setPlantDevices(data.plantDevices || []);
        setVirtualConfig({
          enabled: data.config?.enabled || false,
          dataSource: data.config?.dataSource || 'validation',
          speedMultiplier: data.config?.speedMultiplier || 1,
          fishDeviceId: data.config?.fishDeviceId || null,
          plantDeviceId: data.config?.plantDeviceId || null,
        });
      }
    } catch {
      // Silent fail for virtual config
    }
  };

  const fetchEnvironments = async () => {
    setIsEnvLoading(true);
    try {
      const res = await fetch('/api/virtual-devices/environments');
      const data = await res.json();
      if (data.environments) {
        setEnvironments(data.environments);
      }
    } catch {
      toast.error('Failed to load environments');
    } finally {
      setIsEnvLoading(false);
    }
  };

  const handleVirtualDeviceSave = async () => {
    setIsVirtualSaving(true);
    try {
      const res = await fetch('/api/virtual-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: virtualConfig.enabled,
          fishDeviceId: virtualConfig.fishDeviceId,
          plantDeviceId: virtualConfig.plantDeviceId,
          dataSource: virtualConfig.dataSource,
          speedMultiplier: virtualConfig.speedMultiplier,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      toast.success(data.message);
      await fetchVirtualConfig();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsVirtualSaving(false);
    }
  };

  const handleVirtualDeviceDelete = async () => {
    if (!confirm('Are you sure you want to clear the virtual device configuration?')) {
      return;
    }

    setIsVirtualDeleting(true);
    try {
      const res = await fetch('/api/virtual-devices', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      toast.success(data.message);
      setVirtualConfig({
        enabled: false,
        dataSource: 'validation',
        speedMultiplier: 1,
        fishDeviceId: null,
        plantDeviceId: null,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear configuration');
    } finally {
      setIsVirtualDeleting(false);
    }
  };

  const handleCreateEnvironment = async () => {
    if (!newEnv.name.trim()) {
      toast.error('Environment name is required');
      return;
    }

    setIsCreatingEnv(true);
    try {
      const res = await fetch('/api/virtual-devices/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEnv.name,
          description: newEnv.description || null,
          streamingSpeed: newEnv.streamingSpeed,
          dataSource: newEnv.dataSource,
          fishDeviceId: newEnv.fishDeviceId || null,
          plantDeviceId: newEnv.plantDeviceId || null,
          createCronJob: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create environment');
      }

      toast.success('Environment created successfully');
      setShowCreateEnv(false);
      setNewEnv({
        name: '',
        description: '',
        streamingSpeed: '1x' as const,
        dataSource: 'training',
        fishDeviceId: '',
        plantDeviceId: '',
      });
      await fetchEnvironments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create environment');
    } finally {
      setIsCreatingEnv(false);
    }
  };

  const handleToggleEnvironment = async (env: VirtualEnvironment) => {
    setTogglingEnvId(env.id);
    try {
      const res = await fetch(`/api/virtual-devices/environments/${env.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !env.enabled,
          syncCronJob: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle environment');
      }

      toast.success(env.enabled ? 'Environment disabled' : 'Environment enabled');
      await fetchEnvironments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle environment');
    } finally {
      setTogglingEnvId(null);
    }
  };

  const handleSyncCronJob = async (envId: string) => {
    setSyncingEnvId(envId);
    try {
      const res = await fetch(`/api/virtual-devices/environments/${envId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncCronJob: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync cron job');
      }

      toast.success('Cron job synchronized');
      await fetchEnvironments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync cron job');
    } finally {
      setSyncingEnvId(null);
    }
  };

  const handleDeleteEnvironment = async (envId: string) => {
    if (!confirm('Are you sure you want to delete this environment? This will also delete the associated cron job.')) {
      return;
    }

    setDeletingEnvId(envId);
    try {
      const res = await fetch(`/api/virtual-devices/environments/${envId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete environment');
      }

      toast.success('Environment deleted');
      await fetchEnvironments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete environment');
    } finally {
      setDeletingEnvId(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (modelNumber: 1 | 2) => {
    const key = modelNumber === 1 ? 'model1' : 'model2';
    setTestResults((prev) => ({ ...prev, [key]: 'testing' }));
    setConnectionErrors((prev) => ({ ...prev, [key]: undefined }));

    try {
      const endpoint = modelNumber === 1 ? config.model1Endpoint : config.model2Endpoint;
      const apiKey = modelNumber === 1 ? config.model1ApiKey : config.model2ApiKey;
      const apiVersion = modelNumber === 1 ? config.model1ApiVersion : config.model2ApiVersion;
      const modelName = modelNumber === 1 ? config.model1Name : config.model2Name;

      const requestPayload = { modelNumber, modelName, endpoint, apiKey, apiVersion };

      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const data = await res.json();

      if (data.success) {
        setTestResults((prev) => ({ ...prev, [key]: 'success' }));
        setConnectionErrors((prev) => ({ ...prev, [key]: undefined }));
        toast.success(`Model ${modelNumber} connection successful`);
      } else {
        setTestResults((prev) => ({ ...prev, [key]: 'error' }));
        setConnectionErrors((prev) => ({ ...prev, [key]: data.error }));
        toast.error(data.message || `Model ${modelNumber} connection failed`);
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [key]: 'error' }));
      setConnectionErrors((prev) => ({
        ...prev,
        [key]: {
          code: 'NETWORK_ERROR',
          suggestion: 'Could not reach the server. Check your network connection.',
        },
      }));
      toast.error(`Model ${modelNumber} connection test failed`);
    }
  };

  const getTestIcon = (status: 'idle' | 'testing' | 'success' | 'error') => {
    switch (status) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <TestTube className="h-4 w-4" />;
    }
  };

  const getSelectedDevice = (devices: DeviceOption[], deviceId: string | null) => {
    return devices.find(d => d.id === deviceId) || null;
  };

  const getSpeedColor = (speed: string) => {
    const option = SPEED_OPTIONS.find(o => o.value === speed);
    switch (option?.color) {
      case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'green': return 'bg-green-100 text-green-700 border-green-200';
      case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'red': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const selectedFishDevice = getSelectedDevice(fishDevices, virtualConfig.fishDeviceId);
  const selectedPlantDevice = getSelectedDevice(plantDevices, virtualConfig.plantDeviceId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your AI models and virtual device streaming
        </p>
      </div>

      {/* Multi-Environment Virtual Device Streaming */}
      <Card className="border-2 border-indigo-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Virtual Device Environments</CardTitle>
                <CardDescription>
                  Create multiple streaming environments with different speeds
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateEnv(!showCreateEnv)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Environment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Create Environment Form */}
          {showCreateEnv && (
            <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-6 space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Create New Environment</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="envName" className="text-sm font-medium text-gray-700">
                    Environment Name *
                  </Label>
                  <Input
                    id="envName"
                    value={newEnv.name}
                    onChange={(e) => setNewEnv({ ...newEnv, name: e.target.value })}
                    placeholder="e.g., Fast Testing, Production Simulation"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="envDescription" className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <Input
                    id="envDescription"
                    value={newEnv.description}
                    onChange={(e) => setNewEnv({ ...newEnv, description: e.target.value })}
                    placeholder="Optional description"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Streaming Speed Selection */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Streaming Speed
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {SPEED_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setNewEnv({ ...newEnv, streamingSpeed: option.value as '1x' | '2x' | '5x' | '10x' | '20x' })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        newEnv.streamingSpeed === option.value
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className={`h-4 w-4 ${
                          newEnv.streamingSpeed === option.value ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                        <span className={`font-semibold text-sm ${
                          newEnv.streamingSpeed === option.value ? 'text-indigo-700' : 'text-gray-700'
                        }`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-tight">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Device Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newEnvFish" className="text-sm font-medium text-gray-700">
                    Fish Device
                  </Label>
                  <select
                    id="newEnvFish"
                    value={newEnv.fishDeviceId}
                    onChange={(e) => setNewEnv({ ...newEnv, fishDeviceId: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">-- Select fish device --</option>
                    {fishDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name} ({device.mac})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="newEnvPlant" className="text-sm font-medium text-gray-700">
                    Plant Device
                  </Label>
                  <select
                    id="newEnvPlant"
                    value={newEnv.plantDeviceId}
                    onChange={(e) => setNewEnv({ ...newEnv, plantDeviceId: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">-- Select plant device --</option>
                    {plantDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name} ({device.mac})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Source */}
              <div>
                <Label htmlFor="newEnvDataSource" className="text-sm font-medium text-gray-700">
                  Data Source
                </Label>
                <select
                  id="newEnvDataSource"
                  value={newEnv.dataSource}
                  onChange={(e) => setNewEnv({ ...newEnv, dataSource: e.target.value })}
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="training">Training Data (fish/plant_initial.csv)</option>
                  <option value="validation">Validation Data (fish/plant_validate.csv)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateEnv(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEnvironment}
                  disabled={isCreatingEnv || !newEnv.name.trim()}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                >
                  {isCreatingEnv ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Environment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Environments List */}
          {isEnvLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : environments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Environments Yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Create your first virtual device environment to start streaming data
              </p>
              <Button
                onClick={() => setShowCreateEnv(true)}
                variant="outline"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Environment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`rounded-xl border-2 p-5 transition-all ${
                    env.enabled
                      ? 'border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">{env.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSpeedColor(env.streamingSpeed)}`}>
                          {env.streamingSpeed.toUpperCase()}
                        </span>
                        {env.enabled ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Disabled
                          </span>
                        )}
                      </div>

                      {env.description && (
                        <p className="text-sm text-gray-500 mb-3">{env.description}</p>
                      )}

                      {/* Devices */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {env.fishDevice && (
                          <div className="flex items-center gap-2 text-cyan-700">
                            <Fish className="h-4 w-4" />
                            <span>{env.fishDevice.name}</span>
                          </div>
                        )}
                        {env.plantDevice && (
                          <div className="flex items-center gap-2 text-green-700">
                            <Leaf className="h-4 w-4" />
                            <span>{env.plantDevice.name}</span>
                          </div>
                        )}
                        {!env.fishDevice && !env.plantDevice && (
                          <span className="text-gray-400 text-sm">No devices assigned</span>
                        )}
                      </div>

                      {/* CRON Job Status */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        {env.cronJobId ? (
                          <>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              CRON ID: {env.cronJobId}
                            </span>
                            {env.cronJobLastSync && (
                              <span>
                                Last sync: {new Date(env.cronJobLastSync).toLocaleString()}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            No CRON job linked
                          </span>
                        )}
                        {env.lastStreamedAt && (
                          <span className="flex items-center gap-1">
                            <Radio className="h-3.5 w-3.5" />
                            Last streamed: {new Date(env.lastStreamedAt).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      {(env.currentFishIndex > 0 || env.currentPlantIndex > 0) && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {env.currentFishIndex > 0 && (
                            <span>Fish: Row {env.currentFishIndex}/440</span>
                          )}
                          {env.currentPlantIndex > 0 && (
                            <span>Plant: Row {env.currentPlantIndex}/440</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex items-center gap-2">
                      {/* Toggle Enable/Disable */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleEnvironment(env)}
                        disabled={togglingEnvId === env.id}
                        className={env.enabled ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                      >
                        {togglingEnvId === env.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : env.enabled ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Enable
                          </>
                        )}
                      </Button>

                      {/* Sync CRON Job */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncCronJob(env.id)}
                        disabled={syncingEnvId === env.id}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        {syncingEnvId === env.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync CRON
                          </>
                        )}
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteEnvironment(env.id)}
                        disabled={deletingEnvId === env.id}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        {deletingEnvId === env.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Zap className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-indigo-900 mb-1">About Streaming Speeds</p>
                <p className="text-indigo-700">
                  Each environment runs its own CRON job on cron-job.org. The speed determines how many readings
                  are sent per trigger - <strong>1X</strong> sends 1 reading (matching real CSV timing), while
                  <strong> 20X</strong> sends 20 readings per trigger, completing the dataset 20x faster.
                  All timestamps maintain 5-hour intervals regardless of speed.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legacy Virtual ESP32 Configuration */}
      <Card className="border-2 border-purple-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg">
              <Radio className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Virtual Device Streaming (Legacy)</CardTitle>
              <CardDescription>
                Original single-device configuration - use Environments above for multi-speed streaming
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between rounded-xl border-2 border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${virtualConfig.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Power className={`h-6 w-6 ${virtualConfig.enabled ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Enable Virtual Streaming</h3>
                <p className="text-sm text-gray-500">
                  Stream CSV data to selected devices for testing and validation
                </p>
              </div>
            </div>
            <button
              onClick={() => setVirtualConfig({ ...virtualConfig, enabled: !virtualConfig.enabled })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-200 ${
                virtualConfig.enabled
                  ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-lg shadow-green-200'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                  virtualConfig.enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Device Selection Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fish Device Selection */}
            <div className="rounded-xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500">
                  <Fish className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Fish Sensor Device</h3>
                  <p className="text-xs text-gray-500">Select a fish device to receive virtual data</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="fishDevice" className="text-sm font-medium text-gray-700">
                  Select Device
                </Label>
                <select
                  id="fishDevice"
                  value={virtualConfig.fishDeviceId || ''}
                  onChange={(e) => setVirtualConfig({
                    ...virtualConfig,
                    fishDeviceId: e.target.value || null
                  })}
                  className="w-full h-12 px-4 rounded-lg border-2 border-cyan-200 text-sm bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                >
                  <option value="">-- Select a fish device --</option>
                  {fishDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.mac}) {device.isVirtual ? '- Virtual' : ''}
                    </option>
                  ))}
                </select>

                {selectedFishDevice ? (
                  <div className="bg-white rounded-lg p-3 border border-cyan-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{selectedFishDevice.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{selectedFishDevice.mac}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          virtualConfig.enabled && virtualConfig.fishDeviceId
                            ? 'bg-green-500 animate-pulse'
                            : 'bg-gray-300'
                        }`} />
                        <span className="text-xs font-medium text-gray-600">
                          {virtualConfig.enabled && virtualConfig.fishDeviceId ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/50 rounded-lg p-3 border border-dashed border-cyan-200 text-center">
                    <p className="text-sm text-gray-500">No device selected</p>
                    <a href="/dashboard/devices" className="text-xs text-cyan-600 hover:underline">
                      Register a new device
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Plant Device Selection */}
            <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Plant Sensor Device</h3>
                  <p className="text-xs text-gray-500">Select a plant device to receive virtual data</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="plantDevice" className="text-sm font-medium text-gray-700">
                  Select Device
                </Label>
                <select
                  id="plantDevice"
                  value={virtualConfig.plantDeviceId || ''}
                  onChange={(e) => setVirtualConfig({
                    ...virtualConfig,
                    plantDeviceId: e.target.value || null
                  })}
                  className="w-full h-12 px-4 rounded-lg border-2 border-green-200 text-sm bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                >
                  <option value="">-- Select a plant device --</option>
                  {plantDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.mac}) {device.isVirtual ? '- Virtual' : ''}
                    </option>
                  ))}
                </select>

                {selectedPlantDevice ? (
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{selectedPlantDevice.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{selectedPlantDevice.mac}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          virtualConfig.enabled && virtualConfig.plantDeviceId
                            ? 'bg-green-500 animate-pulse'
                            : 'bg-gray-300'
                        }`} />
                        <span className="text-xs font-medium text-gray-600">
                          {virtualConfig.enabled && virtualConfig.plantDeviceId ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/50 rounded-lg p-3 border border-dashed border-green-200 text-center">
                    <p className="text-sm text-gray-500">No device selected</p>
                    <a href="/dashboard/devices" className="text-xs text-green-600 hover:underline">
                      Register a new device
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <Label htmlFor="dataSource" className="text-sm font-medium text-gray-700">Data Source</Label>
              <select
                id="dataSource"
                value={virtualConfig.dataSource}
                onChange={(e) => setVirtualConfig({ ...virtualConfig, dataSource: e.target.value })}
                className="mt-2 w-full h-11 px-4 rounded-lg border border-gray-200 text-sm bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              >
                <option value="training">Training Data (fish/plant_initial.csv)</option>
                <option value="validation">Validation Data (fish/plant_validate.csv)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {virtualConfig.dataSource === 'validation'
                  ? 'Validation data for testing LSTM model predictions'
                  : 'Training data for initial model development'}
              </p>
            </div>
            <div>
              <Label htmlFor="speedMultiplier" className="text-sm font-medium text-gray-700">Streaming Speed</Label>
              <select
                id="speedMultiplier"
                value={virtualConfig.speedMultiplier}
                onChange={(e) => setVirtualConfig({ ...virtualConfig, speedMultiplier: parseInt(e.target.value) })}
                className="mt-2 w-full h-11 px-4 rounded-lg border border-gray-200 text-sm bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              >
                <option value="1">1x (Normal - 1 reading/minute)</option>
                <option value="2">2x (Faster)</option>
                <option value="5">5x (Fast)</option>
                <option value="10">10x (Very Fast)</option>
              </select>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="/dashboard/simulator"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-sm font-medium text-white hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg"
            >
              <Cpu className="h-4 w-4" />
              Open Manual Simulator
            </a>
            <a
              href="/dashboard/devices"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Manage Devices
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleVirtualDeviceDelete}
              disabled={isVirtualDeleting || (!virtualConfig.fishDeviceId && !virtualConfig.plantDeviceId)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              {isVirtualDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Clear Configuration
            </Button>
            <Button
              onClick={handleVirtualDeviceSave}
              disabled={isVirtualSaving}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            >
              {isVirtualSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Streaming API Info */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg">
              <Radio className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-sm text-purple-700 space-y-3 flex-1">
              <p className="font-semibold text-purple-900">Automatic Streaming with Cron</p>
              <p>
                For continuous data streaming without keeping the browser open, set up an external cron service
                (like cron-job.org) to call the streaming API endpoint every minute.
              </p>
              <div className="bg-white/70 rounded-lg p-3 border border-purple-100">
                <p className="font-medium text-purple-800 mb-2">Streaming API Endpoint:</p>
                <code className="block text-xs bg-purple-100 px-3 py-2 rounded-lg font-mono break-all">
                  GET https://app.airail.uk/api/virtual-devices/stream
                </code>
                <p className="text-xs mt-2 text-purple-600">
                  This endpoint streams one data point from the selected CSV for each enabled device.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>AI Model Configuration</CardTitle>
              <CardDescription>
                Configure the dual AI models for consensus-based analysis
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model 1 - GPT o3-mini */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Model 1: Primary Analyzer (GPT o3-mini)
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection(1)}
                disabled={!config.model1Endpoint || !config.model1ApiKey}
              >
                {getTestIcon(testResults.model1)}
                <span className="ml-2">Test Connection</span>
              </Button>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="model1Name">Model Name</Label>
                <Input
                  id="model1Name"
                  value={config.model1Name}
                  onChange={(e) => setConfig({ ...config, model1Name: e.target.value })}
                  placeholder="gpt-o3-mini"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model1Endpoint">Microsoft Foundry Endpoint</Label>
                <Input
                  id="model1Endpoint"
                  value={config.model1Endpoint}
                  onChange={(e) => setConfig({ ...config, model1Endpoint: e.target.value })}
                  placeholder="https://your-foundry-endpoint/openai/deployments/gpt-o3-mini/chat/completions"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model1ApiVersion">API Version</Label>
                <Input
                  id="model1ApiVersion"
                  value={config.model1ApiVersion}
                  onChange={(e) => setConfig({ ...config, model1ApiVersion: e.target.value })}
                  placeholder="2024-02-15-preview"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model1ApiKey">API Key</Label>
                <Input
                  id="model1ApiKey"
                  type="password"
                  value={config.model1ApiKey}
                  onChange={(e) => setConfig({ ...config, model1ApiKey: e.target.value })}
                  placeholder="Enter API key"
                  className="mt-1"
                />
              </div>
            </div>

            {renderErrorDetails('model1')}
          </div>

          {/* Model 2 - DeepSeek R1 */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Model 2: Validator (DeepSeek R1)
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection(2)}
                disabled={!config.model2Endpoint || !config.model2ApiKey}
              >
                {getTestIcon(testResults.model2)}
                <span className="ml-2">Test Connection</span>
              </Button>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="model2Name">Model Name</Label>
                <Input
                  id="model2Name"
                  value={config.model2Name}
                  onChange={(e) => setConfig({ ...config, model2Name: e.target.value })}
                  placeholder="deepseek-r1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model2Endpoint">Microsoft Foundry Endpoint</Label>
                <Input
                  id="model2Endpoint"
                  value={config.model2Endpoint}
                  onChange={(e) => setConfig({ ...config, model2Endpoint: e.target.value })}
                  placeholder="https://your-foundry-endpoint/models/deepseek-r1/chat/completions"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model2ApiVersion">API Version</Label>
                <Input
                  id="model2ApiVersion"
                  value={config.model2ApiVersion}
                  onChange={(e) => setConfig({ ...config, model2ApiVersion: e.target.value })}
                  placeholder="2024-02-15-preview"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model2ApiKey">API Key</Label>
                <Input
                  id="model2ApiKey"
                  type="password"
                  value={config.model2ApiKey}
                  onChange={(e) => setConfig({ ...config, model2ApiKey: e.target.value })}
                  placeholder="Enter API key"
                  className="mt-1"
                />
              </div>
            </div>

            {renderErrorDetails('model2')}
          </div>

          {/* Consensus Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <h3 className="font-medium text-gray-900">Dual Model Consensus</h3>
              <p className="text-sm text-gray-500">
                Run both models and calculate agreement score for more reliable analysis
              </p>
            </div>
            <button
              onClick={() => setConfig({ ...config, consensusEnabled: !config.consensusEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.consensusEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.consensusEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-blue-700">
              <p className="font-medium">About Dual AI Consensus</p>
              <p className="mt-1">
                The dual model system runs two AI models independently and compares their
                analyses. This provides an agreement score, error margin, and calibration
                score to help validate the accuracy of insights. Higher agreement scores
                indicate more reliable predictions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
