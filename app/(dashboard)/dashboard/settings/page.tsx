'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, TestTube, CheckCircle, XCircle, Loader2, Brain, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

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

  useEffect(() => {
    fetchConfig();
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

      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelNumber, endpoint, apiKey, apiVersion }),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your AI models and system preferences
        </p>
      </div>

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
                  onChange={(e) =>
                    setConfig({ ...config, model1Name: e.target.value })
                  }
                  placeholder="gpt-o3-mini"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model1Endpoint">Microsoft Foundry Endpoint</Label>
                <Input
                  id="model1Endpoint"
                  value={config.model1Endpoint}
                  onChange={(e) =>
                    setConfig({ ...config, model1Endpoint: e.target.value })
                  }
                  placeholder="https://your-foundry-endpoint/openai/deployments/gpt-o3-mini/chat/completions"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the full Microsoft Foundry API endpoint URL
                </p>
              </div>
              <div>
                <Label htmlFor="model1ApiVersion">API Version</Label>
                <Input
                  id="model1ApiVersion"
                  value={config.model1ApiVersion}
                  onChange={(e) =>
                    setConfig({ ...config, model1ApiVersion: e.target.value })
                  }
                  placeholder="2024-02-15-preview"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Azure OpenAI API version (e.g., 2024-02-15-preview)
                </p>
              </div>
              <div>
                <Label htmlFor="model1ApiKey">API Key</Label>
                <Input
                  id="model1ApiKey"
                  type="password"
                  value={config.model1ApiKey}
                  onChange={(e) =>
                    setConfig({ ...config, model1ApiKey: e.target.value })
                  }
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
                  onChange={(e) =>
                    setConfig({ ...config, model2Name: e.target.value })
                  }
                  placeholder="deepseek-r1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model2Endpoint">Microsoft Foundry Endpoint</Label>
                <Input
                  id="model2Endpoint"
                  value={config.model2Endpoint}
                  onChange={(e) =>
                    setConfig({ ...config, model2Endpoint: e.target.value })
                  }
                  placeholder="https://your-foundry-endpoint/models/deepseek-r1/chat/completions"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the full Microsoft Foundry API endpoint URL
                </p>
              </div>
              <div>
                <Label htmlFor="model2ApiVersion">API Version</Label>
                <Input
                  id="model2ApiVersion"
                  value={config.model2ApiVersion}
                  onChange={(e) =>
                    setConfig({ ...config, model2ApiVersion: e.target.value })
                  }
                  placeholder="2024-02-15-preview"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Azure OpenAI API version (e.g., 2024-02-15-preview)
                </p>
              </div>
              <div>
                <Label htmlFor="model2ApiKey">API Key</Label>
                <Input
                  id="model2ApiKey"
                  type="password"
                  value={config.model2ApiKey}
                  onChange={(e) =>
                    setConfig({ ...config, model2ApiKey: e.target.value })
                  }
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
              onClick={() =>
                setConfig({ ...config, consensusEnabled: !config.consensusEnabled })
              }
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
