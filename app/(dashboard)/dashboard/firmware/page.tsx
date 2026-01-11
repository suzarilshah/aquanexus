'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BoardVisualizer, type PinAssignment } from '@/components/onboarding/BoardVisualizer';
import { WebSerialFlasher } from '@/components/onboarding/WebSerialFlasher';
import { generateFirmware, type FirmwareConfig } from '@/lib/firmware/generator';
import { BOARD_LIST, getBoard } from '@/data/boards';
import * as Select from '@radix-ui/react-select';
import * as Switch from '@radix-ui/react-switch';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Cpu,
  Code,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  Check,
  AlertTriangle,
  Download,
  Copy,
  Eye,
  EyeOff,
  Wifi,
  Radio,
  Power,
  Sparkles,
  CircuitBoard,
  Key,
  Server,
  Timer,
  Shield,
  Waves,
  Leaf,
  Fish,
  ArrowRight,
  Terminal,
  Globe,
  Lock,
  RefreshCw,
  Loader2,
  HardDrive,
} from 'lucide-react';

// Device type from API
interface Device {
  id: string;
  deviceMac: string;
  deviceName: string;
  deviceType: 'fish' | 'plant';
  apiKey: string;
  status: string;
}

type ConfigStep = 'board' | 'pins' | 'settings' | 'flash';

// Animated background orbs component
function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl" />
    </div>
  );
}

// Animated step indicator
function StepIndicator({
  steps,
  currentStep,
  onStepClick
}: {
  steps: Array<{ id: ConfigStep; label: string; icon: React.ElementType }>;
  currentStep: ConfigStep;
  onStepClick: (step: ConfigStep) => void;
}) {
  const currentIdx = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" />
      <div
        className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-500 ease-out"
        style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
      />

      <div className="relative flex justify-between">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentIdx;
          const isPending = idx > currentIdx;

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex flex-col items-center gap-2 group transition-all duration-300",
                isPending && "opacity-50"
              )}
            >
              <div
                className={cn(
                  "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 transform",
                  isActive && "bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/30 scale-110",
                  isCompleted && "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20",
                  isPending && "bg-gray-100 text-gray-400",
                  !isActive && !isCompleted && !isPending && "bg-gray-100 text-gray-400"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 animate-ping opacity-30" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive ? "text-cyan-600" : "text-gray-500"
                )}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Premium card component
function PremiumCard({
  children,
  className,
  glow = false
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg",
        glow && "hover:border-cyan-300 hover:shadow-cyan-100",
        className
      )}
    >
      {children}
    </div>
  );
}

// Board selection card
function BoardCard({
  board,
  isSelected,
  onClick,
  disabled
}: {
  board: typeof BOARD_LIST[0];
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative p-5 rounded-2xl border-2 text-left transition-all duration-300 group bg-white",
        isSelected
          ? "border-cyan-500 bg-gradient-to-br from-cyan-50 to-teal-50 shadow-lg shadow-cyan-500/20"
          : "border-gray-200 hover:border-cyan-300 hover:shadow-md",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      {!board.supported && (
        <div className="absolute top-3 right-3 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
          Soon
        </div>
      )}

      {/* Icon */}
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
        isSelected
          ? "bg-gradient-to-br from-cyan-500 to-teal-600 text-white"
          : "bg-gradient-to-br from-gray-100 to-gray-50 text-gray-400 group-hover:from-cyan-100 group-hover:to-teal-100 group-hover:text-cyan-600"
      )}>
        <Cpu className="h-7 w-7" />
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{board.name}</h3>
      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{board.description}</p>

      <div className="flex items-center gap-2">
        <span className={cn(
          "text-[10px] font-medium px-2 py-0.5 rounded-full",
          isSelected
            ? "bg-cyan-100 text-cyan-700"
            : "bg-gray-100 text-gray-600"
        )}>
          {board.category}
        </span>
      </div>
    </button>
  );
}

// Settings section component
function SettingsSection({
  title,
  icon: Icon,
  children,
  description
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// Toggle switch with label
function ToggleOption({
  id,
  label,
  description,
  icon: Icon,
  checked,
  onChange,
  iconColor = "text-gray-500",
  disabled = false,
  recommended = false
}: {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (checked: boolean) => void;
  iconColor?: string;
  disabled?: boolean;
  recommended?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl border transition-all duration-200 bg-white",
      checked
        ? "border-cyan-200 bg-gradient-to-r from-cyan-50/50 to-teal-50/50"
        : "border-gray-200",
      disabled && "opacity-50"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center",
          checked ? "bg-cyan-100" : "bg-gray-100"
        )}>
          <Icon className={cn("h-4 w-4", checked ? "text-cyan-600" : iconColor)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
              {label}
            </Label>
            {recommended && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
                Recommended
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={cn(
          "w-11 h-6 rounded-full relative transition-colors duration-200",
          checked ? "bg-gradient-to-r from-cyan-500 to-teal-500" : "bg-gray-300",
          disabled && "cursor-not-allowed"
        )}
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}

export default function FirmwareConfiguratorPage() {
  // State
  const [currentStep, setCurrentStep] = useState<ConfigStep>('board');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('esp32-devkit-v1');
  const [assignments, setAssignments] = useState<PinAssignment[]>([]);
  const [deviceName, setDeviceName] = useState('AquaNexus-Device');
  const [deviceType, setDeviceType] = useState<'fish' | 'plant' | 'general'>('fish');
  const [apiKey, setApiKey] = useState('');
  const [deviceMac, setDeviceMac] = useState('');
  // WiFi credentials for manual configuration
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  // Server configuration
  const serverHost = 'app.airail.uk';
  const serverPort = 443;
  const [sensorInterval, setSensorInterval] = useState(10000);
  const [useAbly, setUseAbly] = useState(true);
  const [enableOTA, setEnableOTA] = useState(false);
  const [enableDeepSleep, setEnableDeepSleep] = useState(false);
  const [deepSleepDuration, setDeepSleepDuration] = useState(300);
  const [showCode, setShowCode] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Device selection state
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Fetch devices on mount
  useEffect(() => {
    setMounted(true);

    async function fetchDevices() {
      try {
        setDeviceError(null);
        console.log('[FirmwarePage] Fetching devices...');

        const res = await fetch('/api/devices', {
          credentials: 'include', // Ensure cookies are sent
        });

        if (res.status === 401) {
          setDeviceError('Please log in to view your devices');
          return;
        }

        if (!res.ok) {
          setDeviceError(`Failed to load devices (${res.status})`);
          return;
        }

        const data = await res.json();
        const deviceList = data.devices || [];

        // Log all devices and their types for debugging
        console.log('[FirmwarePage] Devices loaded:', deviceList.length);
        deviceList.forEach((d: Device) => {
          console.log(`  - ${d.deviceName}: type="${d.deviceType}", mac="${d.deviceMac}"`);
        });

        setDevices(deviceList);

        // Auto-select first device if available
        if (deviceList.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(deviceList[0].id);
        }
      } catch (error) {
        console.error('[FirmwarePage] Failed to fetch devices:', error);
        setDeviceError('Network error - please check your connection');
      } finally {
        setLoadingDevices(false);
      }
    }

    fetchDevices();
  }, []);

  // Update API key and MAC when device is selected
  useEffect(() => {
    if (selectedDeviceId) {
      const device = devices.find(d => d.id === selectedDeviceId);
      if (device) {
        setApiKey(device.apiKey);
        setDeviceMac(device.deviceMac);
        setDeviceType(device.deviceType);
        setDeviceName(device.deviceName);
      }
    }
  }, [selectedDeviceId, devices]);

  const board = useMemo(() => getBoard(selectedBoardId), [selectedBoardId]);

  const handleAssign = useCallback((assignment: PinAssignment) => {
    setAssignments((prev) => {
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
      apiKey: apiKey || undefined,
      deviceMac: deviceMac || undefined,
      wifiSsid: wifiSsid || undefined,
      wifiPassword: wifiPassword || undefined,
      serverHost,
      serverPort,
      useWebSocket: false,
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
    apiKey,
    deviceMac,
    wifiSsid,
    wifiPassword,
    serverHost,
    serverPort,
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
    { id: 'board' as const, label: 'Board', icon: Cpu },
    { id: 'pins' as const, label: 'Sensors', icon: CircuitBoard },
    { id: 'settings' as const, label: 'Configure', icon: Settings },
    { id: 'flash' as const, label: 'Deploy', icon: Zap },
  ];

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

  const goToNextStep = () => {
    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  return (
    <Tooltip.Provider>
      <div className={cn(
        "relative min-h-screen transition-opacity duration-500",
        mounted ? "opacity-100" : "opacity-0"
      )}>
        <BackgroundOrbs />

        <div className="relative space-y-8 pb-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Terminal className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Firmware Studio
                  </h1>
                  <p className="text-sm text-gray-500">
                    Configure & deploy custom ESP32 firmware
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCode(!showCode)}
                className="gap-2 rounded-xl border-gray-200 hover:border-cyan-500 hover:bg-cyan-50 transition-all"
              >
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showCode ? 'Hide' : 'Preview'} Code
              </Button>
            </div>
          </div>

          {/* Step Indicator */}
          <PremiumCard className="p-6">
            <StepIndicator
              steps={steps}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
          </PremiumCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Board Selection */}
              {currentStep === 'board' && (
                <PremiumCard glow className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                      <Cpu className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Select Your Microcontroller
                      </h2>
                      <p className="text-sm text-gray-500">
                        Choose the board powering your aquaponics system
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {BOARD_LIST.map((boardItem) => (
                      <BoardCard
                        key={boardItem.id}
                        board={boardItem}
                        isSelected={selectedBoardId === boardItem.id}
                        onClick={() => boardItem.supported && setSelectedBoardId(boardItem.id)}
                        disabled={!boardItem.supported}
                      />
                    ))}
                  </div>
                </PremiumCard>
              )}

              {/* Step 2: Pin Configuration */}
              {currentStep === 'pins' && board && (
                <PremiumCard glow className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                      <CircuitBoard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {board.name} Pin Configuration
                      </h2>
                      <p className="text-sm text-gray-500">
                        Click GPIO pins to assign sensors
                      </p>
                    </div>
                  </div>
                  <BoardVisualizer
                    board={board}
                    assignments={assignments}
                    onAssign={handleAssign}
                    onUnassign={handleUnassign}
                    deviceType={deviceType === 'general' ? 'general' : deviceType}
                  />
                </PremiumCard>
              )}

              {/* Step 3: Settings */}
              {currentStep === 'settings' && (
                <div className="space-y-6">
                  {/* Device Selection - NEW */}
                  <PremiumCard glow className="p-6 border-cyan-200">
                    <SettingsSection
                      title="Device Connection"
                      icon={HardDrive}
                      description="Select a registered device from your dashboard"
                    >
                      <div className="mt-4 space-y-4">
                        {/* Device Selector */}
                        <div className="space-y-2">
                          <Label htmlFor="deviceSelect" className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-cyan-500" />
                            Select Device
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              Required
                            </span>
                          </Label>

                          {/* Debug: Show loaded devices count */}
                          {!loadingDevices && devices.length > 0 && (
                            <div className="text-xs text-gray-400 mb-2">
                              Found {devices.length} device(s): {devices.map(d => `${d.deviceName} (${d.deviceType})`).join(', ')}
                            </div>
                          )}

                          {loadingDevices ? (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                              <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                              <span className="text-sm text-gray-500">Loading devices...</span>
                            </div>
                          ) : deviceError ? (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-red-800">{deviceError}</p>
                                  <p className="text-xs text-red-600 mt-1">
                                    Make sure you are logged in and have registered devices.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : devices.length === 0 ? (
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-amber-800">No devices registered</p>
                                  <p className="text-xs text-amber-600 mt-1">
                                    Go to Dashboard → Devices → Add Device to register a new device first.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Select.Root value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                              <Select.Trigger className="flex h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:border-cyan-500">
                                <div className="flex items-center gap-3">
                                  {selectedDeviceId ? (
                                    <>
                                      {devices.find(d => d.id === selectedDeviceId)?.deviceType === 'fish' && <Fish className="h-4 w-4 text-cyan-500" />}
                                      {devices.find(d => d.id === selectedDeviceId)?.deviceType === 'plant' && <Leaf className="h-4 w-4 text-emerald-500" />}
                                      <div className="text-left">
                                        <div className="font-medium">{devices.find(d => d.id === selectedDeviceId)?.deviceName}</div>
                                        <div className="text-xs text-gray-400 font-mono">{devices.find(d => d.id === selectedDeviceId)?.deviceMac}</div>
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-gray-400">Choose a device...</span>
                                  )}
                                </div>
                                <Select.Icon>
                                  <ChevronDown className="h-4 w-4 opacity-50" />
                                </Select.Icon>
                              </Select.Trigger>
                              <Select.Portal>
                                <Select.Content className="overflow-hidden bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                                  <Select.Viewport className="p-2">
                                    {devices.map((device) => (
                                      <Select.Item
                                        key={device.id}
                                        value={device.id}
                                        className="px-3 py-3 text-sm cursor-pointer hover:bg-cyan-50 rounded-lg outline-none flex items-center gap-3 data-[highlighted]:bg-cyan-50"
                                      >
                                        {device.deviceType === 'fish' ? (
                                          <Fish className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                                        ) : device.deviceType === 'plant' ? (
                                          <Leaf className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                        ) : (
                                          <Cpu className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                        )}
                                        <Select.ItemText asChild>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 truncate">{device.deviceName}</div>
                                            <div className="text-xs text-gray-500 font-mono truncate">{device.deviceMac}</div>
                                          </div>
                                        </Select.ItemText>
                                        <Select.ItemIndicator className="flex-shrink-0">
                                          <Check className="h-4 w-4 text-cyan-500" />
                                        </Select.ItemIndicator>
                                      </Select.Item>
                                    ))}
                                  </Select.Viewport>
                                </Select.Content>
                              </Select.Portal>
                            </Select.Root>
                          )}
                        </div>

                        {/* Selected Device Info */}
                        {selectedDeviceId && (
                          <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-xl p-4 border border-emerald-100">
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <div className="space-y-2 flex-1">
                                <p className="text-emerald-800 font-medium">
                                  Device Connected
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-white/60 rounded-lg px-3 py-2">
                                    <span className="text-gray-500">API Key</span>
                                    <div className="font-mono text-gray-700 flex items-center gap-1">
                                      {showApiKey ? apiKey.slice(0, 16) + '...' : '••••••••••••••••'}
                                      <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="text-gray-400 hover:text-gray-600 ml-1"
                                      >
                                        {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="bg-white/60 rounded-lg px-3 py-2">
                                    <span className="text-gray-500">MAC Address</span>
                                    <div className="font-mono text-gray-700">{deviceMac}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Connection Info Box */}
                        <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-100">
                          <div className="flex items-start gap-3">
                            <Lock className="h-5 w-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 text-sm">
                              <p className="text-cyan-800 font-medium">
                                Secure HTTPS Connection
                              </p>
                              <p className="text-cyan-600 text-xs">
                                Your device will send encrypted data to{' '}
                                <code className="bg-cyan-100 px-1 py-0.5 rounded">
                                  https://{serverHost}/api/telemetry
                                </code>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SettingsSection>
                  </PremiumCard>

                  {/* Device Identity */}
                  <PremiumCard glow className="p-6">
                    <SettingsSection title="Device Identity" icon={Cpu}>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="deviceName">Device Name</Label>
                          <Input
                            id="deviceName"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            placeholder="AquaNexus-Device"
                            className="rounded-xl border-gray-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                          />
                          <p className="text-xs text-gray-500">
                            WiFi hotspot name for initial setup
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="deviceType">Monitoring Type</Label>
                          <Select.Root value={deviceType} onValueChange={(v) => setDeviceType(v as typeof deviceType)}>
                            <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:border-cyan-500">
                              <div className="flex items-center gap-2">
                                {deviceType === 'fish' && <Fish className="h-4 w-4 text-cyan-500" />}
                                {deviceType === 'plant' && <Leaf className="h-4 w-4 text-emerald-500" />}
                                {deviceType === 'general' && <Waves className="h-4 w-4 text-purple-500" />}
                                <Select.Value />
                              </div>
                              <Select.Icon>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content className="overflow-hidden bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                                <Select.Viewport className="p-1">
                                  <Select.Item value="fish" className="px-3 py-2 text-sm cursor-pointer hover:bg-cyan-50 rounded-lg outline-none flex items-center gap-2">
                                    <Fish className="h-4 w-4 text-cyan-500" />
                                    <Select.ItemText>Fish Tank Monitoring</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item value="plant" className="px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 rounded-lg outline-none flex items-center gap-2">
                                    <Leaf className="h-4 w-4 text-emerald-500" />
                                    <Select.ItemText>Plant Grow Bed</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item value="general" className="px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 rounded-lg outline-none flex items-center gap-2">
                                    <Waves className="h-4 w-4 text-purple-500" />
                                    <Select.ItemText>General Purpose</Select.ItemText>
                                  </Select.Item>
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </div>
                      </div>
                    </SettingsSection>
                  </PremiumCard>

                  {/* WiFi Configuration */}
                  <PremiumCard glow className="p-6">
                    <SettingsSection
                      title="WiFi Configuration"
                      icon={Wifi}
                      description="Enter your WiFi credentials for the device"
                    >
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="wifiSsid" className="flex items-center gap-2">
                            <Wifi className="h-4 w-4 text-blue-500" />
                            WiFi Network Name (SSID)
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              Required
                            </span>
                          </Label>
                          <Input
                            id="wifiSsid"
                            value={wifiSsid}
                            onChange={(e) => setWifiSsid(e.target.value)}
                            placeholder="Your WiFi network name"
                            className="rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="wifiPassword" className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-blue-500" />
                            WiFi Password
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              Required
                            </span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="wifiPassword"
                              type={showWifiPassword ? 'text' : 'password'}
                              value={wifiPassword}
                              onChange={(e) => setWifiPassword(e.target.value)}
                              placeholder="Your WiFi password"
                              className="rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowWifiPassword(!showWifiPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showWifiPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* WiFi Validation Status */}
                        <div className={cn(
                          "rounded-xl p-4 border space-y-3",
                          wifiSsid && wifiPassword && wifiSsid.length >= 1 && wifiPassword.length >= 8
                            ? "bg-emerald-50 border-emerald-200"
                            : wifiSsid || wifiPassword
                            ? "bg-amber-50 border-amber-200"
                            : "bg-gray-50 border-gray-200"
                        )}>
                          <div className="flex items-center gap-2">
                            {wifiSsid && wifiPassword && wifiSsid.length >= 1 && wifiPassword.length >= 8 ? (
                              <>
                                <Check className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm text-emerald-700 font-medium">
                                  WiFi credentials ready for deployment
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <span className="text-sm text-amber-700 font-medium">
                                  Please complete WiFi configuration
                                </span>
                              </>
                            )}
                          </div>

                          {/* Validation checklist */}
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2">
                              {wifiSsid && wifiSsid.length >= 1 ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <div className="h-3 w-3 rounded-full border border-gray-300" />
                              )}
                              <span className={wifiSsid ? "text-gray-700" : "text-gray-400"}>
                                Network name (SSID) provided
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {wifiPassword && wifiPassword.length >= 8 ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <div className="h-3 w-3 rounded-full border border-gray-300" />
                              )}
                              <span className={wifiPassword && wifiPassword.length >= 8 ? "text-gray-700" : "text-gray-400"}>
                                Password minimum 8 characters {wifiPassword && wifiPassword.length > 0 && wifiPassword.length < 8 && `(${wifiPassword.length}/8)`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {wifiSsid && wifiSsid.length <= 32 ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : wifiSsid && wifiSsid.length > 32 ? (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              ) : (
                                <div className="h-3 w-3 rounded-full border border-gray-300" />
                              )}
                              <span className={wifiSsid && wifiSsid.length > 32 ? "text-red-600" : wifiSsid ? "text-gray-700" : "text-gray-400"}>
                                SSID length valid (max 32 chars) {wifiSsid && wifiSsid.length > 32 && `(${wifiSsid.length}/32)`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Connection Preview */}
                        {wifiSsid && wifiPassword && wifiPassword.length >= 8 && (
                          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                                <Wifi className="h-4 w-4 text-cyan-600" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <p className="text-sm font-medium text-cyan-800">
                                  Connection Preview
                                </p>
                                <p className="text-xs text-cyan-700">
                                  When the device boots, it will:
                                </p>
                                <ol className="text-xs text-cyan-600 space-y-1 list-decimal list-inside">
                                  <li>Attempt to connect to &quot;{wifiSsid}&quot;</li>
                                  <li>Retry up to 20 times if connection fails</li>
                                  <li>Blink LED 3 times on successful connection</li>
                                  <li>Send healthcheck data to the server</li>
                                </ol>
                                <div className="pt-2 border-t border-cyan-200 mt-2">
                                  <p className="text-[10px] text-cyan-500 font-medium uppercase tracking-wider mb-1">
                                    Connection Endpoint
                                  </p>
                                  <code className="text-xs bg-white/60 px-2 py-1 rounded text-cyan-800 font-mono">
                                    https://{serverHost}/api/telemetry
                                  </code>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Troubleshooting Tips */}
                        <details className="bg-gray-50 rounded-xl border border-gray-200">
                          <summary className="flex items-center gap-2 p-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl">
                            <AlertTriangle className="h-4 w-4 text-gray-500" />
                            WiFi Connection Troubleshooting
                          </summary>
                          <div className="px-3 pb-3 space-y-2 text-xs text-gray-600">
                            <div className="space-y-1.5 pt-2 border-t border-gray-200">
                              <p className="font-medium text-gray-700">If device fails to connect:</p>
                              <ul className="list-disc list-inside space-y-1 pl-2">
                                <li>Verify SSID is spelled correctly (case-sensitive)</li>
                                <li>Check password is correct</li>
                                <li>Ensure WiFi is 2.4GHz (ESP32 doesn&apos;t support 5GHz)</li>
                                <li>Move device closer to router</li>
                                <li>Check if MAC filtering is enabled on router</li>
                              </ul>
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-gray-200">
                              <p className="font-medium text-gray-700">Serial Monitor Messages:</p>
                              <ul className="list-disc list-inside space-y-1 pl-2 font-mono text-[10px]">
                                <li>&quot;WiFi connected!&quot; - Success</li>
                                <li>&quot;Connection failed&quot; - Check credentials</li>
                                <li>&quot;RSSI: -XX dBm&quot; - Signal strength</li>
                              </ul>
                            </div>
                          </div>
                        </details>

                        {/* Security Note */}
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                          <div className="flex items-start gap-2">
                            <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-700">
                              WiFi credentials are stored securely in the firmware flash memory.
                              Ensure you&apos;re using a trusted network.
                            </p>
                          </div>
                        </div>
                      </div>
                    </SettingsSection>
                  </PremiumCard>

                  {/* Connectivity Options */}
                  <PremiumCard glow className="p-6">
                    <SettingsSection title="Connectivity" icon={Server}>
                      <div className="mt-4 space-y-4">
                        {/* Pre-defined server info */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-gray-500">Server Host</Label>
                              <div className="font-mono text-sm text-gray-700 mt-1">{serverHost}</div>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Port (HTTPS)</Label>
                              <div className="font-mono text-sm text-gray-700 mt-1">{serverPort}</div>
                            </div>
                          </div>
                        </div>

                        <ToggleOption
                          id="useAbly"
                          label="Ably Real-time Streaming"
                          description="Cloud pub/sub for instant dashboard updates"
                          icon={Radio}
                          checked={useAbly}
                          onChange={setUseAbly}
                          recommended
                        />
                      </div>
                    </SettingsSection>
                  </PremiumCard>

                  {/* Timing & Power */}
                  <PremiumCard glow className="p-6">
                    <SettingsSection title="Timing & Power" icon={Timer}>
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="sensorInterval">Reading Interval</Label>
                          <div className="flex items-center gap-3">
                            <Input
                              id="sensorInterval"
                              type="number"
                              value={sensorInterval}
                              onChange={(e) => setSensorInterval(parseInt(e.target.value) || 5000)}
                              min={1000}
                              step={1000}
                              className="rounded-xl border-gray-200 focus:border-cyan-500 focus:ring-cyan-500/20 flex-1"
                            />
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                              = {sensorInterval / 1000}s
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            How often to read sensors and send data (milliseconds)
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <ToggleOption
                            id="enableOTA"
                            label="OTA Updates"
                            description="Update firmware wirelessly"
                            icon={RefreshCw}
                            checked={enableOTA}
                            onChange={setEnableOTA}
                          />
                          <ToggleOption
                            id="enableDeepSleep"
                            label="Deep Sleep"
                            description="Battery saving mode"
                            icon={Power}
                            checked={enableDeepSleep}
                            onChange={setEnableDeepSleep}
                          />
                        </div>

                        {enableDeepSleep && (
                          <div className="space-y-2 pl-12">
                            <Label htmlFor="deepSleepDuration">Sleep Duration (seconds)</Label>
                            <Input
                              id="deepSleepDuration"
                              type="number"
                              value={deepSleepDuration}
                              onChange={(e) => setDeepSleepDuration(parseInt(e.target.value) || 300)}
                              min={60}
                              step={60}
                              className="rounded-xl border-gray-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                            />
                          </div>
                        )}
                      </div>
                    </SettingsSection>
                  </PremiumCard>
                </div>
              )}

              {/* Step 4: Flash */}
              {currentStep === 'flash' && generatedFirmware && (
                <div className="space-y-6">
                  {/* Warnings */}
                  {generatedFirmware.warnings.length > 0 && (
                    <PremiumCard className="p-6 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-amber-800 mb-2">
                            Configuration Warnings
                          </h4>
                          <ul className="space-y-1">
                            {generatedFirmware.warnings.map((warning, idx) => (
                              <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                                <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </PremiumCard>
                  )}

                  {/* Flash Component */}
                  <WebSerialFlasher
                    code={generatedFirmware.code}
                    filename={generatedFirmware.filename}
                    onFlashComplete={() => {}}
                    onFlashError={(error) => console.error('Flash error:', error)}
                  />

                  {/* Required Libraries */}
                  <PremiumCard glow className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                        <Code className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          Required Libraries
                        </h2>
                        <p className="text-sm text-gray-500">
                          Install in Arduino IDE before compiling
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {generatedFirmware.libraries.map((lib) => (
                        <div
                          key={lib.name}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors"
                        >
                          <span className="font-medium text-gray-900 text-sm">{lib.name}</span>
                          {lib.github && (
                            <a
                              href={lib.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-500 hover:text-purple-600 hover:underline transition-colors"
                            >
                              GitHub →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </PremiumCard>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Configuration Summary */}
              <PremiumCard className="p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-cyan-500" />
                  Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Board</span>
                    <span className="text-sm font-medium text-gray-900">{board?.name || 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Sensors</span>
                    <span className={cn(
                      "text-sm font-medium",
                      assignments.length > 0 ? "text-emerald-600" : "text-gray-400"
                    )}>
                      {assignments.length} assigned
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Type</span>
                    <span className="text-sm font-medium capitalize flex items-center gap-1.5">
                      {deviceType === 'fish' && <Fish className="h-3.5 w-3.5 text-cyan-500" />}
                      {deviceType === 'plant' && <Leaf className="h-3.5 w-3.5 text-emerald-500" />}
                      {deviceType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">API Key</span>
                    <span className={cn(
                      "text-sm font-medium",
                      apiKey ? "text-emerald-600" : "text-amber-500"
                    )}>
                      {apiKey ? '✓ Set' : 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">Connectivity</span>
                    <span className="text-sm font-medium text-purple-600 flex items-center gap-1">
                      {useAbly ? <Radio className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                      {useAbly ? 'Ably' : 'HTTP'}
                    </span>
                  </div>
                </div>

                {/* Assigned Sensors */}
                {assignments.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Assigned Sensors</h4>
                    <div className="space-y-2">
                      {assignments.map((a) => (
                        <div
                          key={a.pinId}
                          className="flex items-center justify-between text-xs p-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg"
                        >
                          <span className="font-medium text-gray-900">{a.sensor.name}</span>
                          <span className="text-gray-500 font-mono">GPIO{a.gpio}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                  {currentStep !== 'flash' && (
                    <Button
                      onClick={goToNextStep}
                      disabled={!canProceed}
                      className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white rounded-xl h-11 font-medium shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  {currentStep !== 'board' && (
                    <Button
                      variant="outline"
                      onClick={goToPrevStep}
                      className="w-full rounded-xl h-10 border-gray-200 hover:bg-gray-50"
                    >
                      Back
                    </Button>
                  )}
                </div>
              </PremiumCard>

              {/* Code Preview */}
              {showCode && generatedFirmware && (
                <PremiumCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-gray-500" />
                      Code
                    </h3>
                    <div className="flex gap-1">
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <Button variant="ghost" size="sm" onClick={handleCopyCode} className="h-8 w-8 p-0 rounded-lg">
                            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content className="bg-gray-800 text-white text-xs px-2 py-1 rounded" sideOffset={5}>
                            {copied ? 'Copied!' : 'Copy code'}
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <Button variant="ghost" size="sm" onClick={handleDownloadCode} className="h-8 w-8 p-0 rounded-lg">
                            <Download className="h-4 w-4" />
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content className="bg-gray-800 text-white text-xs px-2 py-1 rounded" sideOffset={5}>
                            Download .ino
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-auto bg-slate-50 rounded-xl p-4 border border-gray-200">
                    <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
                      {generatedFirmware.code.slice(0, 2500)}
                      {generatedFirmware.code.length > 2500 && (
                        <span className="text-gray-400">{'\n\n'}... ({generatedFirmware.code.length - 2500} more characters)</span>
                      )}
                    </pre>
                  </div>
                </PremiumCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
