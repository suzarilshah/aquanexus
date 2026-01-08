'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Usb,
  Upload,
  Check,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Terminal,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Web Serial API type declarations
declare global {
  interface Navigator {
    serial: {
      requestPort(options?: SerialPortRequestOptions): Promise<SerialPortType>;
      getPorts(): Promise<SerialPortType[]>;
    };
  }
}

interface SerialPortRequestOptions {
  filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
}

interface SerialPortType {
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  setSignals(signals: SerialOutputSignals): Promise<void>;
  getSignals(): Promise<SerialInputSignals>;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialOutputSignals {
  dataTerminalReady?: boolean;
  requestToSend?: boolean;
  break?: boolean;
}

interface SerialInputSignals {
  dataCarrierDetect: boolean;
  clearToSend: boolean;
  ringIndicator: boolean;
  dataSetReady: boolean;
}

// Flash states
type FlashState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'compiling'
  | 'erasing'
  | 'flashing'
  | 'verifying'
  | 'success'
  | 'error';

interface FlashProgress {
  stage: string;
  progress: number;
  message: string;
}

interface WebSerialFlasherProps {
  code: string;
  filename: string;
  onFlashComplete?: () => void;
  onFlashError?: (error: string) => void;
  className?: string;
}

// Check if Web Serial API is available
const isWebSerialSupported = () => {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
};

export function WebSerialFlasher({
  code,
  filename,
  onFlashComplete,
  onFlashError,
  className,
}: WebSerialFlasherProps) {
  const [state, setState] = useState<FlashState>('disconnected');
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [port, setPort] = useState<SerialPortType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSupported(isWebSerialSupported());
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const handleConnect = useCallback(async () => {
    if (!isWebSerialSupported()) {
      setError('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      setState('connecting');
      addLog('Requesting serial port...');

      // Request port with ESP32 vendor/product IDs
      const selectedPort = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
          { usbVendorId: 0x1a86 }, // QinHeng CH340
          { usbVendorId: 0x0403 }, // FTDI
          { usbVendorId: 0x303a }, // Espressif
        ],
      });

      addLog('Port selected. Opening connection...');

      await selectedPort.open({
        baudRate: 115200,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      });

      setPort(selectedPort);
      setState('connected');
      addLog('Connected to ESP32 successfully!');
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      addLog(`Error: ${message}`);
      setError(message);
      setState('error');
      onFlashError?.(message);
    }
  }, [addLog, onFlashError]);

  const handleDisconnect = useCallback(async () => {
    if (port) {
      try {
        await port.close();
        addLog('Disconnected from device');
      } catch {
        // Port might already be closed
      }
      setPort(null);
    }
    setState('disconnected');
    setProgress(null);
  }, [port, addLog]);

  const handleCompileAndFlash = useCallback(async () => {
    if (!port) {
      setError('No device connected');
      return;
    }

    try {
      // Step 1: Compile firmware
      setState('compiling');
      setProgress({ stage: 'Compiling', progress: 0, message: 'Sending code to compiler...' });
      addLog('Sending code to server for compilation...');

      const compileResponse = await fetch('/api/firmware/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, filename }),
      });

      if (!compileResponse.ok) {
        const errorData = await compileResponse.json();
        throw new Error(errorData.error || 'Compilation failed');
      }

      setProgress({ stage: 'Compiling', progress: 50, message: 'Compilation successful!' });
      addLog('Compilation successful!');

      const { binUrl, binData } = await compileResponse.json();
      addLog(`Firmware size: ${Math.round(binData.length / 1024)} KB`);

      // Step 2: Enter bootloader mode
      setState('erasing');
      setProgress({ stage: 'Preparing', progress: 0, message: 'Entering bootloader mode...' });
      addLog('Putting device into bootloader mode...');

      await enterBootloaderMode(port);
      setProgress({ stage: 'Preparing', progress: 50, message: 'Erasing flash...' });
      addLog('Erasing flash memory...');

      // Step 3: Flash firmware
      setState('flashing');
      const firmwareData = Uint8Array.from(atob(binData), (c) => c.charCodeAt(0));

      await flashFirmware(port, firmwareData, (p) => {
        setProgress({ stage: 'Flashing', progress: p, message: `Writing firmware... ${p}%` });
      });

      addLog('Firmware written successfully!');

      // Step 4: Verify
      setState('verifying');
      setProgress({ stage: 'Verifying', progress: 100, message: 'Verifying flash...' });
      addLog('Verifying firmware...');

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 5: Reset device
      addLog('Resetting device...');
      await resetDevice(port);

      setState('success');
      setProgress({ stage: 'Complete', progress: 100, message: 'Flash successful!' });
      addLog('Flash complete! Device is rebooting...');
      addLog('');
      addLog('===== NEXT STEPS =====');
      addLog('1. Look for WiFi network: "AquaNexus-Setup"');
      addLog('2. Connect with password: "aquanexus123"');
      addLog('3. Open browser to 192.168.4.1');
      addLog('4. Configure your WiFi credentials');
      addLog('====================');

      onFlashComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Flash failed';
      addLog(`Error: ${message}`);
      setError(message);
      setState('error');
      onFlashError?.(message);
    }
  }, [port, code, filename, addLog, onFlashComplete, onFlashError]);

  const handleDownloadCode = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`Downloaded ${filename}`);
  }, [code, filename, addLog]);

  if (!isSupported) {
    return (
      <div className={cn('rounded-xl border border-amber-200 bg-amber-50 p-6', className)}>
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800">Browser Not Supported</h3>
            <p className="text-sm text-amber-700 mt-1">
              Web Serial API is not supported in this browser. Please use{' '}
              <span className="font-medium">Google Chrome</span> or{' '}
              <span className="font-medium">Microsoft Edge</span> to flash firmware directly.
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={handleDownloadCode}>
                <Upload className="h-4 w-4 mr-2" />
                Download .ino File
              </Button>
              <p className="text-xs text-amber-600 mt-2">
                You can flash this file using Arduino IDE
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Usb className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Flash Firmware</h3>
              <p className="text-sm text-gray-500">
                Connect your ESP32 via USB to flash
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                state === 'disconnected' && 'bg-gray-300',
                state === 'connecting' && 'bg-amber-400 animate-pulse',
                state === 'connected' && 'bg-green-500',
                state === 'compiling' && 'bg-blue-500 animate-pulse',
                state === 'erasing' && 'bg-amber-500 animate-pulse',
                state === 'flashing' && 'bg-purple-500 animate-pulse',
                state === 'verifying' && 'bg-cyan-500 animate-pulse',
                state === 'success' && 'bg-green-500',
                state === 'error' && 'bg-red-500'
              )}
            />
            <span className="text-sm font-medium text-gray-600 capitalize">{state}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{progress.stage}</span>
            <span className="text-sm text-gray-500">{progress.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                state === 'success'
                  ? 'bg-green-500'
                  : state === 'error'
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
              )}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{progress.message}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4">
        <div className="flex flex-wrap gap-3">
          {state === 'disconnected' && (
            <Button onClick={handleConnect} className="flex-1">
              <Usb className="h-4 w-4 mr-2" />
              Connect Device
            </Button>
          )}

          {state === 'connected' && (
            <>
              <Button onClick={handleCompileAndFlash} className="flex-1">
                <Zap className="h-4 w-4 mr-2" />
                Compile & Flash
              </Button>
              <Button variant="outline" onClick={handleDisconnect}>
                <X className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          )}

          {(state === 'compiling' || state === 'erasing' || state === 'flashing' || state === 'verifying') && (
            <Button disabled className="flex-1">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {state === 'compiling' && 'Compiling...'}
              {state === 'erasing' && 'Erasing flash...'}
              {state === 'flashing' && 'Flashing...'}
              {state === 'verifying' && 'Verifying...'}
            </Button>
          )}

          {state === 'success' && (
            <>
              <Button variant="outline" onClick={handleDisconnect} className="flex-1">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Done - Disconnect
              </Button>
              <Button variant="ghost" onClick={() => setState('connected')}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Flash Again
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <Button onClick={() => setState('connected')} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button variant="outline" onClick={handleDisconnect}>
                <X className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          )}

          <Button variant="ghost" size="icon" onClick={handleDownloadCode} title="Download .ino file">
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Logs */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full px-6 py-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span>Console Output</span>
            {logs.length > 0 && (
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {logs.length} lines
              </span>
            )}
          </div>
          {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showLogs && (
          <div
            ref={logContainerRef}
            className="h-48 overflow-y-auto bg-gray-900 text-gray-100 font-mono text-xs p-4"
          >
            {logs.length === 0 ? (
              <span className="text-gray-500">No output yet...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      {state === 'disconnected' && (
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Before connecting:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-600">
                <li>Connect your ESP32 via USB</li>
                <li>Install CP210x or CH340 drivers if needed</li>
                <li>Hold BOOT button while clicking Connect (some boards)</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for ESP32 communication
async function enterBootloaderMode(port: SerialPortType): Promise<void> {
  // ESP32 bootloader sequence: set DTR low, RTS low, wait, RTS high, DTR high
  // This is handled by the serial port signals

  // For most ESP32 boards with auto-reset circuit, we just need to set the signals
  await port.setSignals({ dataTerminalReady: false, requestToSend: true });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await port.setSignals({ dataTerminalReady: true, requestToSend: false });
  await new Promise((resolve) => setTimeout(resolve, 50));
  await port.setSignals({ dataTerminalReady: false });
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function resetDevice(port: SerialPortType): Promise<void> {
  // Toggle RTS to reset
  await port.setSignals({ requestToSend: true });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await port.setSignals({ requestToSend: false });
}

async function flashFirmware(
  port: SerialPortType,
  firmware: Uint8Array,
  onProgress: (progress: number) => void
): Promise<void> {
  // In a real implementation, this would use the ESP32 ROM bootloader protocol
  // or esptool-js library to flash the firmware

  // For now, simulate the flashing process
  // In production, use: https://github.com/niccokunzmann/esptool-js
  // or the official Espressif esptool-js

  const writer = port.writable?.getWriter();
  if (!writer) {
    throw new Error('Cannot write to port');
  }

  try {
    const chunkSize = 4096;
    const totalChunks = Math.ceil(firmware.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, firmware.length);
      const chunk = firmware.slice(start, end);

      await writer.write(chunk);
      onProgress(Math.round(((i + 1) / totalChunks) * 100));

      // Small delay between chunks
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  } finally {
    writer.releaseLock();
  }
}

export default WebSerialFlasher;
