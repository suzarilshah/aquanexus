'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { BoardDefinition, PinDefinition, PinCapability } from '@/data/boards';
import type { SensorDefinition } from '@/data/sensors';
import { SENSORS, SENSOR_CATEGORIES, getSensorsByCategory, type SensorCategory } from '@/data/sensors';
import * as Popover from '@radix-ui/react-popover';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Thermometer,
  Droplets,
  TestTube,
  Waves,
  CloudFog,
  Wind,
  Droplet,
  Gauge,
  Sun,
  Power,
  Ruler,
  Leaf,
  Monitor,
  Radio,
  X,
  Check,
  AlertTriangle,
  Zap,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Icon mapping for sensors
const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Thermometer,
  Droplets,
  TestTube,
  Waves,
  CloudFog,
  Wind,
  Droplet,
  Gauge,
  Sun,
  Power,
  Ruler,
  Leaf,
  Monitor,
  Radio,
};

export interface PinAssignment {
  pinId: string;
  gpio: number;
  sensor: SensorDefinition;
  sensorPinName: string;
}

interface BoardVisualizerProps {
  board: BoardDefinition;
  assignments: PinAssignment[];
  onAssign: (assignment: PinAssignment) => void;
  onUnassign: (pinId: string) => void;
  className?: string;
}

export function BoardVisualizer({
  board,
  assignments,
  onAssign,
  onUnassign,
  className,
}: BoardVisualizerProps) {
  const [selectedPin, setSelectedPin] = useState<PinDefinition | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  const getAssignmentForPin = useCallback(
    (pinId: string) => assignments.find((a) => a.pinId === pinId),
    [assignments]
  );

  const getPinColor = useCallback(
    (pin: PinDefinition) => {
      const assignment = getAssignmentForPin(pin.id);
      if (assignment) {
        return assignment.sensor.color;
      }

      // Color by primary capability
      if (pin.capabilities.includes('POWER')) {
        return pin.voltage === 5 ? '#ef4444' : '#22c55e';
      }
      if (pin.capabilities.includes('GND')) return '#1f2937';
      if (pin.capabilities.includes('ADC')) return '#8b5cf6';
      if (pin.capabilities.includes('I2C_SDA') || pin.capabilities.includes('I2C_SCL'))
        return '#06b6d4';
      if (pin.capabilities.includes('SPI_MOSI') || pin.capabilities.includes('SPI_MISO'))
        return '#f97316';
      if (pin.capabilities.includes('UART_TX') || pin.capabilities.includes('UART_RX'))
        return '#ec4899';
      if (pin.strapping) return '#fbbf24';
      return '#64748b';
    },
    [getAssignmentForPin]
  );

  const handlePinClick = (pin: PinDefinition) => {
    if (pin.capabilities.includes('POWER') || pin.capabilities.includes('GND')) {
      return; // Don't allow selection of power/ground pins
    }
    setSelectedPin(pin);
  };

  const handleSensorSelect = (sensor: SensorDefinition, sensorPinName: string) => {
    if (!selectedPin || selectedPin.gpio === null) return;

    onAssign({
      pinId: selectedPin.id,
      gpio: selectedPin.gpio,
      sensor,
      sensorPinName,
    });
    setSelectedPin(null);
  };

  const handleUnassign = (pinId: string) => {
    onUnassign(pinId);
    setSelectedPin(null);
  };

  const canAssignSensor = (pin: PinDefinition, sensor: SensorDefinition, sensorPin: { capabilities: PinCapability[] }) => {
    // Check if pin has required capabilities
    return sensorPin.capabilities.some((cap) => pin.capabilities.includes(cap));
  };

  const leftPins = board.pins.filter((p) => p.side === 'left');
  const rightPins = board.pins.filter((p) => p.side === 'right');

  return (
    <div className={cn('relative', className)}>
      {/* Board SVG */}
      <svg
        viewBox="0 0 400 500"
        className="w-full max-w-md mx-auto"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
      >
        {/* Board background */}
        <defs>
          <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* PCB Board */}
        <rect
          x="60"
          y="30"
          width="280"
          height="440"
          rx="8"
          fill="url(#boardGradient)"
          stroke="#334155"
          strokeWidth="2"
        />

        {/* USB Connector */}
        <rect x="160" y="25" width="80" height="25" rx="2" fill="#4b5563" stroke="#6b7280" strokeWidth="1" />
        <rect x="170" y="30" width="60" height="15" rx="1" fill="#1f2937" />

        {/* ESP32 Chip */}
        <rect x="130" y="180" width="140" height="100" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="1" />
        <text x="200" y="220" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="monospace">
          ESP32
        </text>
        <text x="200" y="235" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="monospace">
          WROOM-32
        </text>
        <text x="200" y="260" textAnchor="middle" fill="#4b5563" fontSize="6" fontFamily="monospace">
          {board.name}
        </text>

        {/* Antenna marking */}
        <rect x="160" y="85" width="80" height="70" rx="2" fill="none" stroke="#374151" strokeWidth="1" strokeDasharray="4,2" />
        <text x="200" y="125" textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="monospace">
          ANTENNA
        </text>

        {/* Pin rows */}
        {/* Left side pins */}
        {leftPins.map((pin, idx) => {
          const assignment = getAssignmentForPin(pin.id);
          const y = 70 + idx * 22;
          const isHovered = hoveredPin === pin.id;
          const isSelected = selectedPin?.id === pin.id;
          const isPowerOrGnd = pin.capabilities.includes('POWER') || pin.capabilities.includes('GND');

          return (
            <g key={pin.id}>
              {/* Pin connector trace */}
              <line x1="60" y1={y} x2="75" y2={y} stroke="#374151" strokeWidth="2" />

              {/* Pin hole */}
              <Popover.Root open={isSelected} onOpenChange={(open) => !open && setSelectedPin(null)}>
                <Popover.Trigger asChild>
                  <g
                    className={cn(
                      'cursor-pointer transition-transform',
                      !isPowerOrGnd && 'hover:scale-110'
                    )}
                    onClick={() => handlePinClick(pin)}
                    onMouseEnter={() => setHoveredPin(pin.id)}
                    onMouseLeave={() => setHoveredPin(null)}
                  >
                    {/* Pin circle */}
                    <circle
                      cx="48"
                      cy={y}
                      r={isHovered || isSelected ? 10 : 8}
                      fill={getPinColor(pin)}
                      stroke={isSelected ? '#fff' : isHovered ? '#e2e8f0' : '#475569'}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={assignment ? 'url(#glow)' : undefined}
                      className="transition-all duration-200"
                    />

                    {/* Assignment indicator */}
                    {assignment && (
                      <circle cx="48" cy={y} r="4" fill="#fff" opacity="0.9" />
                    )}
                  </g>
                </Popover.Trigger>

                <Popover.Portal>
                  <Popover.Content
                    className="z-50 w-80 rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
                    sideOffset={10}
                    side="left"
                  >
                    <PinPopoverContent
                      pin={pin}
                      assignment={assignment}
                      onSelectSensor={handleSensorSelect}
                      onUnassign={() => handleUnassign(pin.id)}
                      canAssignSensor={canAssignSensor}
                    />
                    <Popover.Arrow className="fill-white" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              {/* Pin label */}
              <text
                x="25"
                y={y + 4}
                textAnchor="end"
                fill={isHovered || isSelected ? '#f1f5f9' : '#94a3b8'}
                fontSize="9"
                fontFamily="monospace"
                className="select-none transition-colors"
              >
                {pin.name}
              </text>

              {/* GPIO number badge */}
              {pin.gpio !== null && (
                <text
                  x="8"
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="7"
                  fontFamily="monospace"
                  className="select-none"
                >
                  {pin.gpio}
                </text>
              )}
            </g>
          );
        })}

        {/* Right side pins */}
        {rightPins.map((pin, idx) => {
          const assignment = getAssignmentForPin(pin.id);
          const y = 70 + idx * 22;
          const isHovered = hoveredPin === pin.id;
          const isSelected = selectedPin?.id === pin.id;
          const isPowerOrGnd = pin.capabilities.includes('POWER') || pin.capabilities.includes('GND');

          return (
            <g key={pin.id}>
              {/* Pin connector trace */}
              <line x1="325" y1={y} x2="340" y2={y} stroke="#374151" strokeWidth="2" />

              {/* Pin hole */}
              <Popover.Root open={isSelected} onOpenChange={(open) => !open && setSelectedPin(null)}>
                <Popover.Trigger asChild>
                  <g
                    className={cn(
                      'cursor-pointer transition-transform',
                      !isPowerOrGnd && 'hover:scale-110'
                    )}
                    onClick={() => handlePinClick(pin)}
                    onMouseEnter={() => setHoveredPin(pin.id)}
                    onMouseLeave={() => setHoveredPin(null)}
                  >
                    <circle
                      cx="352"
                      cy={y}
                      r={isHovered || isSelected ? 10 : 8}
                      fill={getPinColor(pin)}
                      stroke={isSelected ? '#fff' : isHovered ? '#e2e8f0' : '#475569'}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={assignment ? 'url(#glow)' : undefined}
                      className="transition-all duration-200"
                    />

                    {assignment && (
                      <circle cx="352" cy={y} r="4" fill="#fff" opacity="0.9" />
                    )}
                  </g>
                </Popover.Trigger>

                <Popover.Portal>
                  <Popover.Content
                    className="z-50 w-80 rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
                    sideOffset={10}
                    side="right"
                  >
                    <PinPopoverContent
                      pin={pin}
                      assignment={assignment}
                      onSelectSensor={handleSensorSelect}
                      onUnassign={() => handleUnassign(pin.id)}
                      canAssignSensor={canAssignSensor}
                    />
                    <Popover.Arrow className="fill-white" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              {/* Pin label */}
              <text
                x="375"
                y={y + 4}
                textAnchor="start"
                fill={isHovered || isSelected ? '#f1f5f9' : '#94a3b8'}
                fontSize="9"
                fontFamily="monospace"
                className="select-none transition-colors"
              >
                {pin.name}
              </text>

              {/* GPIO number badge */}
              {pin.gpio !== null && (
                <text
                  x="392"
                  y={y + 4}
                  textAnchor="start"
                  fill="#64748b"
                  fontSize="7"
                  fontFamily="monospace"
                  className="select-none"
                >
                  {pin.gpio}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(60, 460)">
          <text x="0" y="0" fill="#64748b" fontSize="8" fontFamily="sans-serif" fontWeight="500">
            Pin Types:
          </text>
          <circle cx="8" cy="15" r="5" fill="#22c55e" />
          <text x="18" y="18" fill="#94a3b8" fontSize="7">3.3V</text>
          <circle cx="48" cy="15" r="5" fill="#ef4444" />
          <text x="58" y="18" fill="#94a3b8" fontSize="7">5V</text>
          <circle cx="88" cy="15" r="5" fill="#1f2937" />
          <text x="98" y="18" fill="#94a3b8" fontSize="7">GND</text>
          <circle cx="128" cy="15" r="5" fill="#8b5cf6" />
          <text x="138" y="18" fill="#94a3b8" fontSize="7">ADC</text>
          <circle cx="168" cy="15" r="5" fill="#06b6d4" />
          <text x="178" y="18" fill="#94a3b8" fontSize="7">I2C</text>
          <circle cx="208" cy="15" r="5" fill="#fbbf24" />
          <text x="218" y="18" fill="#94a3b8" fontSize="7">Strapping</text>
        </g>
      </svg>
    </div>
  );
}

// Pin Popover Content Component
interface PinPopoverContentProps {
  pin: PinDefinition;
  assignment?: PinAssignment;
  onSelectSensor: (sensor: SensorDefinition, pinName: string) => void;
  onUnassign: () => void;
  canAssignSensor: (pin: PinDefinition, sensor: SensorDefinition, sensorPin: { capabilities: PinCapability[] }) => boolean;
}

function PinPopoverContent({
  pin,
  assignment,
  onSelectSensor,
  onUnassign,
  canAssignSensor,
}: PinPopoverContentProps) {
  const [activeCategory, setActiveCategory] = useState<SensorCategory>('temperature');

  const isPowerOrGnd = pin.capabilities.includes('POWER') || pin.capabilities.includes('GND');

  if (isPowerOrGnd) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold text-gray-900">{pin.name}</span>
        </div>
        <p className="text-sm text-gray-500">
          {pin.capabilities.includes('POWER')
            ? `Power pin (${pin.voltage}V) - Connect to sensor VCC`
            : 'Ground pin - Connect to sensor GND'}
        </p>
      </div>
    );
  }

  if (assignment) {
    const SensorIcon = ICONS[assignment.sensor.icon] || Info;
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${assignment.sensor.color}20` }}
            >
              <SensorIcon className="h-4 w-4" style={{ color: assignment.sensor.color }} />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{pin.name}</div>
              <div className="text-xs text-gray-500">GPIO {pin.gpio}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onUnassign} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Check className="h-4 w-4 text-green-500" />
            <span className="font-medium text-gray-900">{assignment.sensor.name}</span>
          </div>
          <p className="text-xs text-gray-500 ml-6">
            {assignment.sensorPinName} pin assigned
          </p>
        </div>
      </div>
    );
  }

  const categories = Object.keys(SENSOR_CATEGORIES) as SensorCategory[];

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">{pin.name}</div>
            <div className="text-xs text-gray-500">
              GPIO {pin.gpio} &middot; {pin.capabilities.filter(c => c !== 'GPIO').join(', ')}
            </div>
          </div>
          {pin.strapping && (
            <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs">
              <AlertTriangle className="h-3 w-3" />
              Strapping
            </div>
          )}
        </div>
      </div>

      {/* Sensor Selection */}
      <Tabs.Root value={activeCategory} onValueChange={(v) => setActiveCategory(v as SensorCategory)}>
        <Tabs.List className="flex border-b border-gray-100 px-2 overflow-x-auto">
          {categories.slice(0, 5).map((cat) => {
            const catInfo = SENSOR_CATEGORIES[cat];
            const CatIcon = ICONS[catInfo.icon] || Info;
            return (
              <Tabs.Trigger
                key={cat}
                value={cat}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeCategory === cat
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <CatIcon className="h-3 w-3" />
                {catInfo.name}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {categories.map((cat) => (
          <Tabs.Content key={cat} value={cat} className="p-2 max-h-60 overflow-y-auto">
            <div className="space-y-1">
              {getSensorsByCategory(cat).map((sensor) => {
                const SensorIcon = ICONS[sensor.icon] || Info;
                const compatiblePins = sensor.pins.filter((sp) => canAssignSensor(pin, sensor, sp));
                const isCompatible = compatiblePins.length > 0;

                return (
                  <div key={sensor.id}>
                    {compatiblePins.map((sensorPin) => (
                      <button
                        key={`${sensor.id}-${sensorPin.name}`}
                        onClick={() => onSelectSensor(sensor, sensorPin.name)}
                        disabled={!isCompatible}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                          isCompatible
                            ? 'hover:bg-gray-50 cursor-pointer'
                            : 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${sensor.color}15` }}
                        >
                          <SensorIcon className="h-4 w-4" style={{ color: sensor.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm">
                            {sensor.name}
                            {sensor.pins.length > 1 && (
                              <span className="text-gray-400 font-normal"> - {sensorPin.name}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {sensorPin.description}
                          </div>
                        </div>
                        {isCompatible && (
                          <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            Compatible
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}

export default BoardVisualizer;
