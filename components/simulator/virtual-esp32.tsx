'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import * as Switch from '@radix-ui/react-switch';
import {
  Play,
  Square,
  Cpu,
  Wifi,
  Activity,
  Droplets,
  Leaf,
  Fish,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Database,
} from 'lucide-react';
import {
  parsePlantCSV,
  parseFishCSV,
  generatePlantReadings,
  generateFishReadings,
  createTelemetryPayload,
  getNextIndex,
  type PlantDataRow,
  type FishDataRow,
  type SensorReading,
} from '@/lib/simulator/data-generator';

interface TransmissionLog {
  id: string;
  timestamp: Date;
  type: 'plant' | 'fish';
  status: 'success' | 'error';
  message: string;
  readings?: SensorReading[];
}

interface DeviceConfig {
  apiKey: string;
  deviceMac: string;
}

interface VirtualESP32Props {
  fishDevice?: DeviceConfig;
  plantDevice?: DeviceConfig;
  dataSource?: 'training' | 'validation';
}

export function VirtualESP32({ fishDevice, plantDevice, dataSource = 'training' }: VirtualESP32Props) {
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [enableFish, setEnableFish] = useState(true);
  const [enablePlant, setEnablePlant] = useState(true);
  const [interval, setIntervalMs] = useState(2000); // 2 seconds default
  const [currentDataSource, setCurrentDataSource] = useState<'training' | 'validation'>(dataSource);

  // Data state
  const [plantData, setPlantData] = useState<PlantDataRow[]>([]);
  const [fishData, setFishData] = useState<FishDataRow[]>([]);
  const [plantIndex, setPlantIndex] = useState(0);
  const [fishIndex, setFishIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [plantTransmissions, setPlantTransmissions] = useState(0);
  const [fishTransmissions, setFishTransmissions] = useState(0);
  const [totalLoops, setTotalLoops] = useState(0);

  // Current readings display
  const [currentPlantReadings, setCurrentPlantReadings] = useState<SensorReading[]>([]);
  const [currentFishReadings, setCurrentFishReadings] = useState<SensorReading[]>([]);

  // Transmission log
  const [logs, setLogs] = useState<TransmissionLog[]>([]);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load CSV data based on data source
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        // Determine which CSV files to load based on data source
        const plantFile = currentDataSource === 'validation' ? '/plant_validate.csv' : '/plant_initial.csv';
        const fishFile = currentDataSource === 'validation' ? '/fish_validate.csv' : '/fish_initial.csv';

        const [plantResponse, fishResponse] = await Promise.all([
          fetch(plantFile),
          fetch(fishFile),
        ]);

        if (!plantResponse.ok || !fishResponse.ok) {
          throw new Error(`Failed to load ${currentDataSource} CSV data files`);
        }

        const [plantText, fishText] = await Promise.all([
          plantResponse.text(),
          fishResponse.text(),
        ]);

        const parsedPlant = parsePlantCSV(plantText);
        const parsedFish = parseFishCSV(fishText);

        if (parsedPlant.length === 0 || parsedFish.length === 0) {
          throw new Error('CSV files are empty or invalid');
        }

        setPlantData(parsedPlant);
        setFishData(parsedFish);
        // Reset indices when data source changes
        setPlantIndex(0);
        setFishIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [currentDataSource]);

  // Add log entry
  const addLog = useCallback(
    (type: 'plant' | 'fish', status: 'success' | 'error', message: string, readings?: SensorReading[]) => {
      const log: TransmissionLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        type,
        status,
        message,
        readings,
      };
      setLogs((prev) => [log, ...prev].slice(0, 50)); // Keep last 50 logs
    },
    []
  );

  // Send telemetry data
  const sendTelemetry = useCallback(
    async (type: 'plant' | 'fish', readings: SensorReading[], deviceConfig: DeviceConfig) => {
      try {
        const payload = createTelemetryPayload(
          deviceConfig.apiKey,
          deviceConfig.deviceMac,
          type,
          readings
        );

        const response = await fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        addLog(type, 'success', `${readings.length} readings sent`, readings);

        if (type === 'plant') {
          setPlantTransmissions((prev) => prev + 1);
          setCurrentPlantReadings(readings);
        } else {
          setFishTransmissions((prev) => prev + 1);
          setCurrentFishReadings(readings);
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        addLog(type, 'error', message);
        throw err;
      }
    },
    [addLog]
  );

  // Simulation tick
  const tick = useCallback(async () => {
    const promises: Promise<unknown>[] = [];

    // Send plant data
    if (enablePlant && plantData.length > 0 && plantDevice) {
      const row = plantData[plantIndex];
      const readings = generatePlantReadings(row);
      promises.push(sendTelemetry('plant', readings, plantDevice));

      const nextIndex = getNextIndex(plantIndex, plantData.length);
      setPlantIndex(nextIndex);
      if (nextIndex === 0) {
        setTotalLoops((prev) => prev + 1);
      }
    }

    // Send fish data
    if (enableFish && fishData.length > 0 && fishDevice) {
      const row = fishData[fishIndex];
      const readings = generateFishReadings(row);
      promises.push(sendTelemetry('fish', readings, fishDevice));

      const nextIndex = getNextIndex(fishIndex, fishData.length);
      setFishIndex(nextIndex);
    }

    await Promise.allSettled(promises);
  }, [
    enablePlant,
    enableFish,
    plantData,
    fishData,
    plantIndex,
    fishIndex,
    plantDevice,
    fishDevice,
    sendTelemetry,
  ]);

  // Start/stop simulation
  useEffect(() => {
    if (isRunning) {
      const effectiveInterval = interval / speedMultiplier;
      intervalRef.current = setInterval(tick, effectiveInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, interval, speedMultiplier, tick]);

  // Reset simulation
  const handleReset = () => {
    setIsRunning(false);
    setPlantIndex(0);
    setFishIndex(0);
    setPlantTransmissions(0);
    setFishTransmissions(0);
    setTotalLoops(0);
    setCurrentPlantReadings([]);
    setCurrentFishReadings([]);
    setLogs([]);
  };

  const hasDevices = fishDevice || plantDevice;
  const effectiveInterval = interval / speedMultiplier;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading CSV training data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium">Failed to load data</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasDevices) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
          <p className="text-amber-700 font-medium">No Devices Registered</p>
          <p className="text-amber-600 text-sm mt-2">
            Please register virtual fish and plant devices first to use the simulator.
          </p>
          <a
            href="/dashboard/devices"
            className="mt-4 inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
          >
            Register Devices
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-500" />
            Virtual ESP32 Control Panel
          </CardTitle>
          <CardDescription>
            Simulates ESP32 devices sending sensor data to the telemetry API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Controls */}
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={() => setIsRunning(!isRunning)}
              className={cn(
                'min-w-32',
                isRunning
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              )}
            >
              {isRunning ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleReset} disabled={isRunning}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>

            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full text-sm',
                isRunning ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                )}
              />
              {isRunning ? 'Running' : 'Stopped'}
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Data Source */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                Data Source
              </Label>
              <select
                value={currentDataSource}
                onChange={(e) => {
                  if (!isRunning) {
                    setCurrentDataSource(e.target.value as 'training' | 'validation');
                  }
                }}
                disabled={isRunning}
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm bg-white disabled:bg-gray-100"
              >
                <option value="training">Training Data</option>
                <option value="validation">Validation Data</option>
              </select>
              <p className="text-xs text-gray-500">
                {currentDataSource === 'validation' ? 'fish/plant_validate.csv' : 'fish/plant_initial.csv'}
              </p>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Speed: {speedMultiplier}x
              </Label>
              <input
                type="range"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseInt(e.target.value))}
                min={1}
                max={10}
                step={1}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-xs text-gray-500">
                Interval: {(effectiveInterval / 1000).toFixed(1)}s
              </p>
            </div>

            {/* Base Interval */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                Base Interval (ms)
              </Label>
              <input
                type="number"
                value={interval}
                onChange={(e) => setIntervalMs(Math.max(500, parseInt(e.target.value) || 2000))}
                min={500}
                step={500}
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm"
                disabled={isRunning}
              />
            </div>

            {/* Fish Toggle */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Fish className="h-5 w-5 text-blue-500" />
                <Label htmlFor="enableFish" className="text-sm font-medium">
                  Fish Data
                </Label>
              </div>
              <Switch.Root
                id="enableFish"
                checked={enableFish}
                onCheckedChange={setEnableFish}
                disabled={!fishDevice}
                className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-500 transition-colors disabled:opacity-50"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            {/* Plant Toggle */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-500" />
                <Label htmlFor="enablePlant" className="text-sm font-medium">
                  Plant Data
                </Label>
              </div>
              <Switch.Root
                id="enablePlant"
                checked={enablePlant}
                onCheckedChange={setEnablePlant}
                disabled={!plantDevice}
                className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-green-500 transition-colors disabled:opacity-50"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{fishTransmissions}</p>
              <p className="text-xs text-gray-500">Fish Transmissions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{plantTransmissions}</p>
              <p className="text-xs text-gray-500">Plant Transmissions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{totalLoops}</p>
              <p className="text-xs text-gray-500">Dataset Loops</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {plantIndex}/{plantData.length}
              </p>
              <p className="text-xs text-gray-500">Current Row</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Readings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plant Readings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-500" />
              Plant Readings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentPlantReadings.length > 0 ? (
              <div className="space-y-2">
                {currentPlantReadings.map((reading, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 bg-green-50 rounded"
                  >
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {reading.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-mono">
                      {reading.value} {reading.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">
                No readings yet. Start simulation to see data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Fish Readings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Fish className="h-5 w-5 text-blue-500" />
              Fish Readings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentFishReadings.length > 0 ? (
              <div className="space-y-2">
                {currentFishReadings.map((reading, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded"
                  >
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {reading.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-mono">
                      {reading.value} {reading.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">
                No readings yet. Start simulation to see data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transmission Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            Transmission Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    'flex items-center gap-3 py-2 px-3 rounded text-sm',
                    log.status === 'success' ? 'bg-gray-50' : 'bg-red-50'
                  )}
                >
                  {log.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      log.type === 'plant'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {log.type}
                  </span>
                  <span className="text-gray-600 flex-1">{log.message}</span>
                  <span className="text-xs text-gray-400">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">
                No transmissions yet. Start simulation to see activity.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
