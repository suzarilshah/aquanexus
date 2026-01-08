'use client';

import { useState } from 'react';
import { Plus, X, Cpu, Fish, Leaf, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RegisterDeviceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [deviceType, setDeviceType] = useState<'fish' | 'plant' | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [deviceMac, setDeviceMac] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredDevice, setRegisteredDevice] = useState<{
    apiKey: string;
    deviceName: string;
    deviceMac: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setStep(1);
    setDeviceType(null);
    setDeviceName('');
    setDeviceMac('');
    setRegisteredDevice(null);
    setError('');
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!deviceType || !deviceName || !deviceMac) {
      setError('Please fill in all fields');
      return;
    }

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(deviceMac)) {
      setError('Invalid MAC address format (e.g., AA:BB:CC:DD:EE:FF)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName,
          deviceMac: deviceMac.toUpperCase(),
          deviceType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register device');
      }

      setRegisteredDevice({
        apiKey: data.device.apiKey,
        deviceName: data.device.deviceName,
        deviceMac: data.device.deviceMac,
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyApiKey = async () => {
    if (registeredDevice) {
      await navigator.clipboard.writeText(registeredDevice.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
      >
        <Plus className="mr-2 h-4 w-4" />
        Register Device
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={handleClose} />
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {step === 1 && 'Select Device Type'}
                  {step === 2 && 'Device Details'}
                  {step === 3 && 'Device Registered'}
                </h2>
                <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Step 1: Device Type Selection */}
              {step === 1 && (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setDeviceType('fish');
                      setStep(2);
                    }}
                    className={cn(
                      'w-full flex items-center p-4 rounded-lg border-2 transition-colors',
                      'hover:border-blue-500 hover:bg-blue-50'
                    )}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <Fish className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="font-medium text-gray-900">Fish Tank Monitor</h3>
                      <p className="text-sm text-gray-500">Temperature, pH, DO, turbidity, TDS</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setDeviceType('plant');
                      setStep(2);
                    }}
                    className={cn(
                      'w-full flex items-center p-4 rounded-lg border-2 transition-colors',
                      'hover:border-green-500 hover:bg-green-50'
                    )}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                      <Leaf className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="font-medium text-gray-900">Plant Environment Monitor</h3>
                      <p className="text-sm text-gray-500">Soil moisture, light, temperature, humidity</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2: Device Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device Name
                    </label>
                    <input
                      type="text"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="e.g., Living Room Tank"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      MAC Address
                    </label>
                    <input
                      type="text"
                      value={deviceMac}
                      onChange={(e) => setDeviceMac(e.target.value)}
                      placeholder="AA:BB:CC:DD:EE:FF"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Find this in your ESP32&apos;s serial output
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 p-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Registering...' : 'Register Device'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {step === 3 && registeredDevice && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                      <Check className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h3 className="font-medium text-emerald-800">Device Registered Successfully</h3>
                    <p className="text-sm text-emerald-600 mt-1">{registeredDevice.deviceName}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key (save this securely)
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        readOnly
                        value={registeredDevice.apiKey}
                        className="flex-1 rounded-l-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono"
                      />
                      <button
                        onClick={copyApiKey}
                        className="rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 hover:bg-gray-100"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-amber-600">
                      This key will not be shown again. Store it in your ESP32 firmware.
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Next Steps</h4>
                    <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                      <li>Copy the API key above</li>
                      <li>Update your ESP32 firmware with the API key</li>
                      <li>Power on your device to start sending data</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
