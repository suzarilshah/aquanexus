'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BoardVisualizer, type PinAssignment } from '@/components/onboarding/BoardVisualizer';
import { BreadboardView } from '@/components/onboarding/BreadboardView';
import { WebSerialFlasher } from '@/components/onboarding/WebSerialFlasher';
import { generateFirmware, type FirmwareConfig } from '@/lib/firmware/generator';
import { BOARDS, BOARD_LIST, getBoard } from '@/data/boards';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import * as Switch from '@radix-ui/react-switch';
import {
  Cpu,
  Code,
  Zap,
  Settings,
  ChevronDown,
  Check,
  Info,
  AlertTriangle,
  Download,
  Copy,
  Eye,
  Wifi,
  Clock,
  Radio,
  Power,
  Sparkles,
  CircuitBoard,
} from 'lucide-react';

type ConfigStep = 'board' | 'pins' | 'settings' | 'flash';

export default function FirmwareConfiguratorPage() {
  // State
  const [currentStep, setCurrentStep] = useState<ConfigStep>('board');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('esp32-devkit-v1');
  const [assignments, setAssignments] = useState<PinAssignment[]>([]);
  const [deviceName, setDeviceName] = useState('AquaNexus-Device');
  const [deviceType, setDeviceType] = useState<'fish' | 'plant' | 'general'>('fish');
  const [serverHost, setServerHost] = useState('aquanexus.vercel.app');
  const [serverPort, setServerPort] = useState(443);
  const [sensorInterval, setSensorInterval] = useState(10000);
  const [useWebSocket, setUseWebSocket] = useState(false);
  const [useAbly, setUseAbly] = useState(true);
  const [enableOTA, setEnableOTA] = useState(false);
  const [enableDeepSleep, setEnableDeepSleep] = useState(false);
  const [deepSleepDuration, setDeepSleepDuration] = useState(300);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const board = useMemo(() => getBoard(selectedBoardId), [selectedBoardId]);

  const handleAssign = useCallback((assignment: PinAssignment) => {
    setAssignments((prev) => {
      // Remove any existing assignment for this pin
      const filtered = prev.filter((a) => a.pinId !== assignment.pinId);
      return [...filtered, assignment];
    });
  }, []);

  const handleUnassign = useCallback((pinId: string) => {
    setAssignments((prev) => prev.filter((a) => a.pinId !== pinId));
  }, []);

  const firmwareConfig: FirmwareConfig | null = useMemo(() => {
    if (!board) return null;
    return {
      board,
      assignments,
      deviceName,
      deviceType,
      serverHost,
      serverPort,
      useWebSocket,
      useAbly,
      sensorInterval,
      enableOTA,
      enableDeepSleep,
      deepSleepDuration,
    };
  }, [
    board,
    assignments,
    deviceName,
    deviceType,
    serverHost,
    serverPort,
    useWebSocket,
    useAbly,
    sensorInterval,
    enableOTA,
    enableDeepSleep,
    deepSleepDuration,
  ]);

  const generatedFirmware = useMemo(() => {
    if (!firmwareConfig) return null;
    return generateFirmware(firmwareConfig);
  }, [firmwareConfig]);

  const handleCopyCode = useCallback(async () => {
    if (!generatedFirmware) return;
    await navigator.clipboard.writeText(generatedFirmware.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedFirmware]);

  const handleDownloadCode = useCallback(() => {
    if (!generatedFirmware) return;
    const blob = new Blob([generatedFirmware.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedFirmware.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedFirmware]);

  const steps = [
    { id: 'board', label: 'Select Board', icon: Cpu },
    { id: 'pins', label: 'Configure Pins', icon: CircuitBoard },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'flash', label: 'Flash Firmware', icon: Zap },
  ] as const;

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'board':
        return !!board;
      case 'pins':
        return assignments.length > 0;
      case 'settings':
        return deviceName.length > 0;
      case 'flash':
        return true;
    }
  }, [currentStep, board, assignments, deviceName]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Firmware Configurator</h1>
          <p className="text-gray-500 mt-1">
            Configure your ESP32 pins and generate custom firmware
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCode(!showCode)}>
            <Eye className="h-4 w-4 mr-2" />
            {showCode ? 'Hide' : 'Preview'} Code
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = steps.findIndex((s) => s.id === currentStep) > idx;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive && 'bg-blue-50',
                  !isActive && 'hover:bg-gray-50'
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center transition-colors',
                    isActive && 'bg-gradient-to-br from-blue-500 to-purple-600 text-white',
                    isCompleted && 'bg-green-500 text-white',
                    !isActive && !isCompleted && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                </div>
                <div className="text-left">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-gray-900' : 'text-gray-500'
                    )}
                  >
                    {step.label}
                  </div>
                  <div className="text-xs text-gray-400">Step {idx + 1}</div>
                </div>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Board Selection */}
          {currentStep === 'board' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-blue-500" />
                  Select Your Board
                </CardTitle>
                <CardDescription>
                  Choose the microcontroller board you want to program
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BOARD_LIST.map((boardItem) => (
                    <button
                      key={boardItem.id}
                      onClick={() => boardItem.supported && setSelectedBoardId(boardItem.id)}
                      disabled={!boardItem.supported}
                      className={cn(
                        'relative p-4 rounded-xl border-2 text-left transition-all',
                        selectedBoardId === boardItem.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300',
                        !boardItem.supported && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {selectedBoardId === boardItem.id && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                      {!boardItem.supported && (
                        <div className="absolute top-2 right-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                          Coming Soon
                        </div>
                      )}
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-3">
                        <Cpu className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{boardItem.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{boardItem.description}</p>
                      <div className="mt-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {boardItem.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Pin Configuration */}
          {currentStep === 'pins' && board && (
            <Tabs.Root defaultValue="board" className="space-y-4">
              <Tabs.List className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <Tabs.Trigger
                  value="board"
                  className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Board View
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="breadboard"
                  className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Breadboard View
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="board">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CircuitBoard className="h-5 w-5 text-blue-500" />
                      {board.name} - Pin Configuration
                    </CardTitle>
                    <CardDescription>
                      Click on a GPIO pin to assign a sensor. Hover over pins to see their capabilities.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BoardVisualizer
                      board={board}
                      assignments={assignments}
                      onAssign={handleAssign}
                      onUnassign={handleUnassign}
                    />
                  </CardContent>
                </Card>
              </Tabs.Content>

              <Tabs.Content value="breadboard">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CircuitBoard className="h-5 w-5 text-green-500" />
                      Breadboard Wiring Diagram
                    </CardTitle>
                    <CardDescription>
                      Visual guide showing how to connect your sensors on a breadboard
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BreadboardView board={board} assignments={assignments} />
                  </CardContent>
                </Card>
              </Tabs.Content>
            </Tabs.Root>
          )}

          {/* Step 3: Settings */}
          {currentStep === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-500" />
                  Firmware Settings
                </CardTitle>
                <CardDescription>
                  Configure device name, server connection, and behavior options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Device Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Device Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deviceName">Device Name</Label>
                      <Input
                        id="deviceName"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder="AquaNexus-Device"
                      />
                      <p className="text-xs text-gray-500">
                        Used for WiFi hotspot and identification
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deviceType">Device Type</Label>
                      <Select.Root value={deviceType} onValueChange={(v) => setDeviceType(v as typeof deviceType)}>
                        <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                          <Select.Value />
                          <Select.Icon>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
                            <Select.Viewport className="p-1">
                              <Select.Item value="fish" className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded outline-none">
                                <Select.ItemText>Fish Environment</Select.ItemText>
                              </Select.Item>
                              <Select.Item value="plant" className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded outline-none">
                                <Select.ItemText>Plant Environment</Select.ItemText>
                              </Select.Item>
                              <Select.Item value="general" className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded outline-none">
                                <Select.ItemText>General Purpose</Select.ItemText>
                              </Select.Item>
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </div>
                  </div>
                </div>

                {/* WiFi Provisioning Info */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Wifi className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">WiFi Provisioning Mode</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        This firmware uses <strong>WiFiManager</strong> for secure WiFi setup.
                        No credentials are hardcoded. After flashing:
                      </p>
                      <ol className="list-decimal list-inside text-sm text-blue-600 mt-2 space-y-1">
                        <li>Device creates hotspot: &quot;{deviceName || 'AquaNexus'}-Setup&quot;</li>
                        <li>Connect with your phone (password: aquanexus123)</li>
                        <li>Open browser to 192.168.4.1</li>
                        <li>Select your WiFi network and enter password</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Server Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Server Connection
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serverHost">Server Host</Label>
                      <Input
                        id="serverHost"
                        value={serverHost}
                        onChange={(e) => setServerHost(e.target.value)}
                        placeholder="aquanexus.vercel.app"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serverPort">Server Port</Label>
                      <Input
                        id="serverPort"
                        type="number"
                        value={serverPort}
                        onChange={(e) => setServerPort(parseInt(e.target.value) || 443)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="flex items-center gap-3">
                      <Radio className="h-5 w-5 text-purple-500" />
                      <div>
                        <Label htmlFor="useAbly" className="text-sm font-medium">
                          Use Ably Real-time (Recommended)
                        </Label>
                        <p className="text-xs text-gray-500">
                          Cloud-based pub/sub messaging for Vercel
                        </p>
                      </div>
                    </div>
                    <Switch.Root
                      id="useAbly"
                      checked={useAbly}
                      onCheckedChange={(checked) => {
                        setUseAbly(checked);
                        if (checked) setUseWebSocket(false);
                      }}
                      className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-purple-500 transition-colors"
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                    </Switch.Root>
                  </div>

                  {useAbly && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <p className="text-xs text-purple-700">
                        <strong>Ably</strong> provides real-time messaging. The ESP32 will publish sensor data to Ably channels,
                        and your dashboard will subscribe to receive updates instantly. Works with Vercel serverless deployment.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wifi className="h-5 w-5 text-blue-500" />
                      <div>
                        <Label htmlFor="useWebSocket" className="text-sm font-medium">
                          Direct WebSocket (Advanced)
                        </Label>
                        <p className="text-xs text-gray-500">
                          Requires custom WebSocket server
                        </p>
                      </div>
                    </div>
                    <Switch.Root
                      id="useWebSocket"
                      checked={useWebSocket}
                      onCheckedChange={(checked) => {
                        setUseWebSocket(checked);
                        if (checked) setUseAbly(false);
                      }}
                      disabled={useAbly}
                      className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-500 transition-colors disabled:opacity-50"
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                    </Switch.Root>
                  </div>
                </div>

                {/* Timing Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Timing & Power
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="sensorInterval">Sensor Reading Interval (ms)</Label>
                    <Input
                      id="sensorInterval"
                      type="number"
                      value={sensorInterval}
                      onChange={(e) => setSensorInterval(parseInt(e.target.value) || 5000)}
                      min={1000}
                      step={1000}
                    />
                    <p className="text-xs text-gray-500">
                      How often to read and send sensor data ({sensorInterval / 1000} seconds)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-orange-500" />
                        <div>
                          <Label htmlFor="enableOTA" className="text-sm font-medium">
                            OTA Updates
                          </Label>
                          <p className="text-xs text-gray-500">
                            Over-the-air firmware updates
                          </p>
                        </div>
                      </div>
                      <Switch.Root
                        id="enableOTA"
                        checked={enableOTA}
                        onCheckedChange={setEnableOTA}
                        className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-500 transition-colors"
                      >
                        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                      </Switch.Root>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Power className="h-5 w-5 text-green-500" />
                        <div>
                          <Label htmlFor="enableDeepSleep" className="text-sm font-medium">
                            Deep Sleep
                          </Label>
                          <p className="text-xs text-gray-500">
                            Power saving mode
                          </p>
                        </div>
                      </div>
                      <Switch.Root
                        id="enableDeepSleep"
                        checked={enableDeepSleep}
                        onCheckedChange={setEnableDeepSleep}
                        className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-500 transition-colors"
                      >
                        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                      </Switch.Root>
                    </div>
                  </div>

                  {enableDeepSleep && (
                    <div className="space-y-2">
                      <Label htmlFor="deepSleepDuration">Deep Sleep Duration (seconds)</Label>
                      <Input
                        id="deepSleepDuration"
                        type="number"
                        value={deepSleepDuration}
                        onChange={(e) => setDeepSleepDuration(parseInt(e.target.value) || 300)}
                        min={60}
                        step={60}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Flash */}
          {currentStep === 'flash' && generatedFirmware && (
            <div className="space-y-6">
              {/* Warnings */}
              {generatedFirmware.warnings.length > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-amber-800">Warnings</h4>
                        <ul className="list-disc list-inside text-sm text-amber-700 mt-2 space-y-1">
                          {generatedFirmware.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Flash Component */}
              <WebSerialFlasher
                code={generatedFirmware.code}
                filename={generatedFirmware.filename}
                onFlashComplete={() => {
                  // Handle success
                }}
                onFlashError={(error) => {
                  console.error('Flash error:', error);
                }}
              />

              {/* Required Libraries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-purple-500" />
                    Required Libraries
                  </CardTitle>
                  <CardDescription>
                    Install these libraries in Arduino IDE before compiling
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {generatedFirmware.libraries.map((lib) => (
                      <div
                        key={lib.name}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">{lib.name}</span>
                        {lib.github && (
                          <a
                            href={lib.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            GitHub
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Board</span>
                  <span className="font-medium">{board?.name || 'Not selected'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Sensors</span>
                  <span className="font-medium">{assignments.length} assigned</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Device Name</span>
                  <span className="font-medium">{deviceName || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium capitalize">{deviceType}</span>
                </div>
              </div>

              {/* Assigned Sensors */}
              {assignments.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Assigned Sensors</h4>
                  <div className="space-y-2">
                    {assignments.map((a) => (
                      <div
                        key={a.pinId}
                        className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                      >
                        <span className="font-medium">{a.sensor.name}</span>
                        <span className="text-gray-500">GPIO {a.gpio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Code Preview Card */}
          {showCode && generatedFirmware && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Generated Code</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownloadCode}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto bg-gray-900 rounded-lg p-4">
                  <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
                    {generatedFirmware.code.slice(0, 2000)}
                    {generatedFirmware.code.length > 2000 && '\n\n... (truncated)'}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            {currentStep !== 'board' && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const stepIndex = steps.findIndex((s) => s.id === currentStep);
                  if (stepIndex > 0) {
                    setCurrentStep(steps[stepIndex - 1].id);
                  }
                }}
              >
                Back
              </Button>
            )}
            {currentStep !== 'flash' && (
              <Button
                className="flex-1"
                disabled={!canProceed}
                onClick={() => {
                  const stepIndex = steps.findIndex((s) => s.id === currentStep);
                  if (stepIndex < steps.length - 1) {
                    setCurrentStep(steps[stepIndex + 1].id);
                  }
                }}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
