'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { BoardDefinition, PinDefinition, PinCapability } from '@/data/boards';
import type { SensorDefinition } from '@/data/sensors';
import { SENSOR_CATEGORIES, getSensorsByCategory, getAquaponicsSensors, type SensorCategory } from '@/data/sensors';
import * as Popover from '@radix-ui/react-popover';
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
  Cpu,
  Link2,
  Terminal,
  Activity,
  Minus,
  Tag,
  ChevronDown,
  ChevronUp,
  Usb,
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

// Pin type colors matching pinouts.vercel.app design
const PIN_COLORS = {
  POWER: '#ef4444',
  GND: '#6b7280',
  DIGITAL: '#3b82f6',
  ANALOG: '#eab308',
  I2C: '#8b5cf6',
  SPI: '#f97316',
  UART: '#ec4899',
  PWM: '#10b981',
} as const;

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
  deviceType?: 'fish' | 'plant' | 'general';
}

export function BoardVisualizer({
  board,
  assignments,
  onAssign,
  onUnassign,
  className,
  deviceType = 'general',
}: BoardVisualizerProps) {
  const [selectedPin, setSelectedPin] = useState<PinDefinition | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [showBoardInfo, setShowBoardInfo] = useState(false);

  const getAssignmentForPin = useCallback(
    (pinId: string) => assignments.find((a) => a.pinId === pinId),
    [assignments]
  );

  const leftPins = board.pins.filter((p) => p.side === 'left');
  const rightPins = board.pins.filter((p) => p.side === 'right');

  // Calculate pin categories for the sidebar
  const pinCategories = useMemo(() => {
    const categories: Array<{
      id: string;
      name: string;
      icon: React.ReactNode;
      color: string;
      bgColor: string;
      count: number;
    }> = [];

    const i2cPins = board.pins.filter(p =>
      p.capabilities.includes('I2C_SDA') || p.capabilities.includes('I2C_SCL')
    );
    if (i2cPins.length > 0) {
      categories.push({
        id: 'I2C',
        name: 'I2C',
        icon: <Link2 className="w-4 h-4" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        count: i2cPins.length,
      });
    }

    const uartPins = board.pins.filter(p =>
      p.capabilities.includes('UART_TX') || p.capabilities.includes('UART_RX')
    );
    if (uartPins.length > 0) {
      categories.push({
        id: 'UART',
        name: 'UART',
        icon: <Terminal className="w-4 h-4" />,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100',
        count: uartPins.length,
      });
    }

    const spiPins = board.pins.filter(p =>
      p.capabilities.includes('SPI_MOSI') || p.capabilities.includes('SPI_MISO') ||
      p.capabilities.includes('SPI_CLK') || p.capabilities.includes('SPI_CS')
    );
    if (spiPins.length > 0) {
      categories.push({
        id: 'SPI',
        name: 'SPI',
        icon: <Radio className="w-4 h-4" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        count: spiPins.length,
      });
    }

    const pwmPins = board.pins.filter(p => p.capabilities.includes('PWM'));
    if (pwmPins.length > 0) {
      categories.push({
        id: 'PWM',
        name: 'PWM',
        icon: <Activity className="w-4 h-4" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        count: pwmPins.length,
      });
    }

    const adcPins = board.pins.filter(p => p.capabilities.includes('ADC'));
    if (adcPins.length > 0) {
      categories.push({
        id: 'ADC',
        name: 'ADC',
        icon: <Gauge className="w-4 h-4" />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        count: adcPins.length,
      });
    }

    const powerPins = board.pins.filter(p => p.capabilities.includes('POWER'));
    if (powerPins.length > 0) {
      categories.push({
        id: 'POWER',
        name: 'Power',
        icon: <Zap className="w-4 h-4" />,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        count: powerPins.length,
      });
    }

    const gndPins = board.pins.filter(p => p.capabilities.includes('GND'));
    if (gndPins.length > 0) {
      categories.push({
        id: 'GND',
        name: 'Ground',
        icon: <Minus className="w-4 h-4" />,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        count: gndPins.length,
      });
    }

    return categories;
  }, [board.pins]);

  const getPinColor = useCallback(
    (pin: PinDefinition) => {
      const assignment = getAssignmentForPin(pin.id);
      if (assignment) {
        return assignment.sensor.color;
      }

      if (pin.capabilities.includes('POWER')) return PIN_COLORS.POWER;
      if (pin.capabilities.includes('GND')) return PIN_COLORS.GND;
      if (pin.capabilities.includes('I2C_SDA') || pin.capabilities.includes('I2C_SCL')) return PIN_COLORS.I2C;
      if (pin.capabilities.includes('UART_TX') || pin.capabilities.includes('UART_RX')) return PIN_COLORS.UART;
      if (pin.capabilities.includes('SPI_MOSI') || pin.capabilities.includes('SPI_MISO') ||
          pin.capabilities.includes('SPI_CLK') || pin.capabilities.includes('SPI_CS')) return PIN_COLORS.SPI;
      if (pin.capabilities.includes('ADC')) return PIN_COLORS.ANALOG;
      return PIN_COLORS.DIGITAL;
    },
    [getAssignmentForPin]
  );

  const isPinHighlighted = useCallback((pin: PinDefinition): boolean => {
    if (!highlightedCategory) return true;

    switch (highlightedCategory) {
      case 'I2C':
        return pin.capabilities.includes('I2C_SDA') || pin.capabilities.includes('I2C_SCL');
      case 'UART':
        return pin.capabilities.includes('UART_TX') || pin.capabilities.includes('UART_RX');
      case 'SPI':
        return pin.capabilities.includes('SPI_MOSI') || pin.capabilities.includes('SPI_MISO') ||
               pin.capabilities.includes('SPI_CLK') || pin.capabilities.includes('SPI_CS');
      case 'PWM':
        return pin.capabilities.includes('PWM');
      case 'ADC':
        return pin.capabilities.includes('ADC');
      case 'POWER':
        return pin.capabilities.includes('POWER');
      case 'GND':
        return pin.capabilities.includes('GND');
      default:
        return true;
    }
  }, [highlightedCategory]);

  const handlePinClick = (pin: PinDefinition) => {
    if (pin.capabilities.includes('POWER') || pin.capabilities.includes('GND')) {
      return;
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
    return sensorPin.capabilities.some((cap) => pin.capabilities.includes(cap));
  };

  const getPinTypeLabel = (pin: PinDefinition): string => {
    if (pin.capabilities.includes('POWER')) return 'Power';
    if (pin.capabilities.includes('GND')) return 'Ground';
    if (pin.capabilities.includes('ADC')) return 'Analog';
    return 'Digital';
  };

  const getPinTypeColor = (pin: PinDefinition): string => {
    if (pin.capabilities.includes('POWER')) return 'bg-red-100 text-red-700';
    if (pin.capabilities.includes('GND')) return 'bg-gray-100 text-gray-700';
    if (pin.capabilities.includes('ADC')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  const renderPin = (pin: PinDefinition, side: 'left' | 'right', index: number) => {
    const assignment = getAssignmentForPin(pin.id);
    const isHovered = hoveredPin === pin.id;
    const isSelected = selectedPin?.id === pin.id;
    const isHighlighted = isPinHighlighted(pin);
    const isPowerOrGnd = pin.capabilities.includes('POWER') || pin.capabilities.includes('GND');

    return (
      <Popover.Root key={pin.id} open={isSelected} onOpenChange={(open) => !open && setSelectedPin(null)}>
        <Popover.Trigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 py-1 px-2 rounded transition-all',
              side === 'left' ? 'flex-row' : 'flex-row-reverse',
              !isPowerOrGnd && 'cursor-pointer',
              (isHovered || isSelected) && 'bg-black/20',
              !isHighlighted && highlightedCategory && 'opacity-30'
            )}
            onMouseEnter={() => setHoveredPin(pin.id)}
            onMouseLeave={() => setHoveredPin(null)}
            onClick={() => handlePinClick(pin)}
          >
            {/* Pin label - Silkscreen style */}
            <span
              className={cn(
                'text-[10px] font-mono w-16 font-bold tracking-wide',
                side === 'left' ? 'text-right' : 'text-left',
              )}
              style={{
                color: (isHovered || isSelected) ? '#ffffff' : '#f0f0e8',
                textShadow: (isHovered || isSelected)
                  ? '0 0 4px rgba(255,255,255,0.5)'
                  : '0 0 1px rgba(0,0,0,0.3)',
              }}
            >
              {pin.name}
            </span>

            {/* Pin number */}
            <span
              className="text-[9px] font-mono w-5 text-center font-bold"
              style={{ color: '#c0e0c0' }}
            >
              {index + 1}
            </span>

            {/* Pin dot - Copper pad with realistic styling */}
            <div
              className={cn(
                'w-4 h-4 rounded-full transition-all flex-shrink-0 relative',
                (isHovered || isSelected) && 'scale-125'
              )}
              style={{
                background: assignment
                  ? `radial-gradient(circle at 30% 30%, ${getPinColor(pin)}dd, ${getPinColor(pin)})`
                  : `radial-gradient(circle at 30% 30%, #e8d068, #c9a227, #a08020)`,
                boxShadow: (isHovered || isSelected)
                  ? '0 0 8px rgba(201,162,39,0.6), inset 0 1px 2px rgba(255,255,255,0.3)'
                  : 'inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 1px rgba(0,0,0,0.2)',
                border: '1px solid rgba(0,0,0,0.2)',
              }}
            >
              {/* Through-hole illusion */}
              <div
                className="absolute inset-1 rounded-full"
                style={{
                  background: assignment
                    ? 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 60%)'
                    : 'radial-gradient(circle, #1a1a1a 40%, #2d2d2d 100%)',
                  boxShadow: assignment ? 'none' : 'inset 0 1px 2px rgba(0,0,0,0.5)',
                }}
              />
              {assignment && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, #ffffff, #e0e0e0)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="z-50 w-80 rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
            sideOffset={10}
            side={side === 'left' ? 'left' : 'right'}
          >
            <PinPopoverContent
              pin={pin}
              assignment={assignment}
              onSelectSensor={handleSensorSelect}
              onUnassign={() => handleUnassign(pin.id)}
              canAssignSensor={canAssignSensor}
              deviceType={deviceType}
            />
            <Popover.Arrow className="fill-white" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main: Interactive Pinout - Full Width */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Interactive Pinout</h3>
                <p className="text-xs text-gray-500">Explore pins with hover details and category highlighting</p>
              </div>
            </div>
          </div>

          {/* Board stats bar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{board.name}</span>
              <span className="text-xs text-gray-400">Interactive Board Layout</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span><span className="font-semibold text-gray-700">{board.pins.length}</span> Total</span>
              <span><span className="font-semibold text-gray-700">{assignments.length}</span> Assigned</span>
            </div>
          </div>

          {/* Legend */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIN_COLORS.POWER }} />
              <span className="text-xs text-gray-500">Power</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIN_COLORS.GND }} />
              <span className="text-xs text-gray-500">Ground</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIN_COLORS.DIGITAL }} />
              <span className="text-xs text-gray-500">Digital</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIN_COLORS.ANALOG }} />
              <span className="text-xs text-gray-500">Analog</span>
            </div>
            <div className="ml-auto text-xs text-gray-400 flex items-center gap-1">
              <span>Click to explore</span>
            </div>
          </div>

          {/* Pinout diagram - Realistic PCB style */}
          <div className="p-6 flex items-center justify-center">
            {/* SVG Definitions for realistic PCB patterns */}
            <svg width="0" height="0" className="absolute">
              <defs>
                {/* Circuit trace pattern */}
                <pattern id="pcbTracePattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="transparent" />
                  <path d="M0 20h15M25 20h15M20 0v15M20 25v15" stroke="#006838" strokeWidth="0.5" opacity="0.3" />
                  <circle cx="20" cy="20" r="2" fill="#006838" opacity="0.2" />
                  <circle cx="0" cy="0" r="1.5" fill="#c9a227" opacity="0.4" />
                  <circle cx="40" cy="0" r="1.5" fill="#c9a227" opacity="0.4" />
                  <circle cx="0" cy="40" r="1.5" fill="#c9a227" opacity="0.4" />
                  <circle cx="40" cy="40" r="1.5" fill="#c9a227" opacity="0.4" />
                </pattern>
                {/* Fiberglass texture */}
                <pattern id="fiberglassTexture" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                  <rect width="4" height="4" fill="#007a42" />
                  <rect width="2" height="2" fill="#008c4a" opacity="0.5" />
                  <rect x="2" y="2" width="2" height="2" fill="#006838" opacity="0.3" />
                </pattern>
                {/* Copper pad gradient */}
                <linearGradient id="copperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4a847" />
                  <stop offset="50%" stopColor="#c9a227" />
                  <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
                {/* Silver/HASL finish gradient */}
                <linearGradient id="haslGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e8e8e8" />
                  <stop offset="50%" stopColor="#c0c0c0" />
                  <stop offset="100%" stopColor="#a8a8a8" />
                </linearGradient>
                {/* PCB board gradient */}
                <linearGradient id="pcbGreenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#009e52" />
                  <stop offset="50%" stopColor="#008c4a" />
                  <stop offset="100%" stopColor="#006838" />
                </linearGradient>
                {/* IC chip gradient */}
                <linearGradient id="icChipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2d2d2d" />
                  <stop offset="50%" stopColor="#1a1a1a" />
                  <stop offset="100%" stopColor="#0d0d0d" />
                </linearGradient>
              </defs>
            </svg>

            <div
              className="relative rounded-lg overflow-hidden w-full max-w-2xl"
              style={{
                background: 'linear-gradient(180deg, #009e52 0%, #008c4a 50%, #006838 100%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                padding: '20px 24px',
              }}
            >
              {/* PCB texture overlay */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,80,40,0.1) 2px, rgba(0,80,40,0.1) 4px),
                    repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,80,40,0.1) 2px, rgba(0,80,40,0.1) 4px)
                  `,
                }}
              />

              {/* Circuit trace decorations */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                {/* Horizontal traces */}
                <line x1="10%" y1="20%" x2="35%" y2="20%" stroke="#c9a227" strokeWidth="1" />
                <line x1="65%" y1="20%" x2="90%" y2="20%" stroke="#c9a227" strokeWidth="1" />
                <line x1="10%" y1="80%" x2="35%" y2="80%" stroke="#c9a227" strokeWidth="1" />
                <line x1="65%" y1="80%" x2="90%" y2="80%" stroke="#c9a227" strokeWidth="1" />
                {/* Via holes */}
                <circle cx="35%" cy="20%" r="3" fill="#c9a227" />
                <circle cx="65%" cy="20%" r="3" fill="#c9a227" />
                <circle cx="35%" cy="80%" r="3" fill="#c9a227" />
                <circle cx="65%" cy="80%" r="3" fill="#c9a227" />
                {/* Small vias */}
                <circle cx="20%" cy="30%" r="1.5" fill="#c9a227" opacity="0.6" />
                <circle cx="80%" cy="30%" r="1.5" fill="#c9a227" opacity="0.6" />
                <circle cx="20%" cy="70%" r="1.5" fill="#c9a227" opacity="0.6" />
                <circle cx="80%" cy="70%" r="1.5" fill="#c9a227" opacity="0.6" />
              </svg>

              {/* USB Connector - Realistic metal */}
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-20 h-5 rounded-t-sm"
                style={{
                  background: 'linear-gradient(180deg, #a8a8a8 0%, #808080 50%, #606060 100%)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                  border: '1px solid #505050',
                }}
              >
                {/* USB port opening */}
                <div
                  className="absolute top-1 left-1/2 -translate-x-1/2 w-14 h-2.5 rounded-sm"
                  style={{
                    background: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',
                    border: '1px solid #404040',
                  }}
                />
              </div>

              {/* Board content */}
              <div className="flex items-stretch justify-center gap-6 pt-6 relative z-10">
                {/* Left pins */}
                <div className="flex flex-col justify-center">
                  {leftPins.map((pin, idx) => renderPin(pin, 'left', idx))}
                </div>

                {/* Center - IC Chip with realistic styling */}
                <div className="flex flex-col items-center justify-center min-w-[140px] flex-shrink-0">
                  {/* Metal shield/can (for WiFi module) */}
                  <div
                    className="rounded-md p-1 mb-2"
                    style={{
                      background: 'linear-gradient(135deg, #c0c0c0 0%, #909090 50%, #707070 100%)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
                    }}
                  >
                    <div
                      className="w-28 h-16 rounded-sm flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(180deg, #a0a0a0 0%, #808080 100%)',
                        border: '1px solid #606060',
                      }}
                    >
                      {/* Ventilation holes pattern */}
                      <div className="grid grid-cols-5 gap-1">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Main IC Chip */}
                  <div
                    className="rounded-sm relative"
                    style={{
                      background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 50%, #0d0d0d 100%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                      padding: '8px 12px',
                    }}
                  >
                    {/* Chip notch/orientation mark */}
                    <div
                      className="absolute top-1 left-2 w-2 h-2 rounded-full"
                      style={{ background: 'radial-gradient(circle, #404040 0%, #1a1a1a 100%)' }}
                    />

                    {/* Chip label - silkscreen style */}
                    <div className="text-center py-2">
                      <div
                        className="text-[11px] font-bold font-mono tracking-wider"
                        style={{ color: '#e0e0e0', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}
                      >
                        {board.microcontroller.split('-')[0]}
                      </div>
                      <div
                        className="text-[9px] font-mono mt-0.5"
                        style={{ color: '#a0a0a0' }}
                      >
                        {board.microcontroller.split('-').slice(1).join('-') || 'WROOM-32'}
                      </div>
                    </div>
                  </div>

                  {/* Board silkscreen label */}
                  <div
                    className="mt-3 text-center"
                    style={{
                      color: '#f0f0e8',
                      textShadow: '0 0 2px rgba(240,240,232,0.3)',
                    }}
                  >
                    <div className="text-[10px] font-mono font-bold tracking-wide">{board.name}</div>
                    <div className="text-[8px] font-mono opacity-70 mt-0.5">Rev 1.0</div>
                  </div>

                  {/* USB label - silkscreen style */}
                  <div className="mt-auto pt-3 flex items-center gap-1.5" style={{ color: '#f0f0e8' }}>
                    <Usb className="w-3 h-3" />
                    <span className="text-[9px] font-mono font-bold tracking-wider">USB</span>
                  </div>
                </div>

                {/* Right pins */}
                <div className="flex flex-col justify-center">
                  {rightPins.map((pin, idx) => renderPin(pin, 'right', idx))}
                </div>
              </div>

              {/* Bottom edge - PCB thickness illusion */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{
                  background: 'linear-gradient(180deg, #005030 0%, #003820 100%)',
                }}
              />
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              Hover for details
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Click categories to highlight
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Use pin categories
            </span>
          </div>
      </div>

      {/* Bottom: Board Info Panel - Horizontal Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Board Header Card */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">{board.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{board.microcontroller}</p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {board.clockSpeed}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Activity className="w-3 h-3 text-emerald-500" />
                    {board.voltage}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
            <button
              onClick={() => setShowBoardInfo(!showBoardInfo)}
              className="text-xs font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1 transition-colors"
            >
              {showBoardInfo ? 'Hide specs' : 'View specs'}
              {showBoardInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Ready
            </span>
          </div>
        </div>

        {/* Pin Categories Card */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pin Categories</span>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{pinCategories.length} types</span>
          </div>
          <div className="p-3">
            <div className="flex flex-wrap gap-2">
              {pinCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setHighlightedCategory(highlightedCategory === category.id ? null : category.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-sm',
                    highlightedCategory === category.id
                      ? `${category.bgColor} border-current ${category.color}`
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <span className={category.color}>{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                  <span className={cn(
                    'text-xs font-bold',
                    highlightedCategory === category.id ? category.color : 'text-gray-400'
                  )}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Pin / Assignments Card */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {selectedPin ? 'Selected Pin' : 'Assignments'}
            </h3>
          </div>
          <div className="p-4">
            {selectedPin ? (
              <div className="space-y-2">
                {/* Pin Type Badge */}
                <span className={cn(
                  'inline-block text-xs font-semibold px-2 py-1 rounded-lg',
                  getPinTypeColor(selectedPin)
                )}>
                  {getPinTypeLabel(selectedPin)}
                </span>
                {/* GPIO */}
                <div className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500">GPIO</span>
                  <span className="font-mono text-sm font-bold text-gray-900">
                    {selectedPin.gpio !== null ? selectedPin.gpio : 'N/A'}
                  </span>
                </div>
                {/* Name */}
                <div className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500">Name</span>
                  <span className="font-mono text-sm font-bold text-gray-900">{selectedPin.name}</span>
                </div>
                {/* Capabilities */}
                {selectedPin.capabilities.length > 0 && (
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500 block mb-1">Capabilities</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedPin.capabilities.filter(c => c !== 'GPIO').slice(0, 4).map((cap) => (
                        <span key={cap} className="text-[10px] bg-white px-1.5 py-0.5 rounded text-gray-600 font-medium">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Strapping Warning */}
                {selectedPin.strapping && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-xs">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium">Strapping Pin - affects boot</span>
                  </div>
                )}
              </div>
            ) : assignments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignments.slice(0, 6).map((a) => {
                  const SensorIcon = ICONS[a.sensor.icon] || Info;
                  return (
                    <div
                      key={a.pinId}
                      className="flex items-center gap-2 bg-gray-100 rounded-lg px-2.5 py-1.5"
                    >
                      <SensorIcon className="w-3.5 h-3.5" style={{ color: a.sensor.color }} />
                      <span className="text-xs font-medium text-gray-700">{a.sensor.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">GPIO{a.gpio}</span>
                    </div>
                  );
                })}
                {assignments.length > 6 && (
                  <span className="text-xs text-gray-400 self-center">+{assignments.length - 6} more</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">
                Click on GPIO pins to assign sensors
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Board Specifications (collapsible) */}
      {showBoardInfo && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-white" />
              </div>
              Specifications
            </h3>
            <button
              onClick={() => setShowBoardInfo(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{board.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-100">
                <div className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold">Clock Speed</div>
                <div className="text-sm font-bold text-blue-900 mt-1">{board.clockSpeed}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-100">
                <div className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold">Voltage</div>
                <div className="text-sm font-bold text-amber-900 mt-1">{board.voltage}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-100">
                <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Flash Memory</div>
                <div className="text-sm font-bold text-emerald-900 mt-1">{board.flashSize}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-100">
                <div className="text-[10px] text-purple-600 uppercase tracking-wider font-semibold">RAM</div>
                <div className="text-sm font-bold text-purple-900 mt-1">{board.ram}</div>
              </div>
            </div>
          </div>
        </div>
      )}
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
  deviceType: 'fish' | 'plant' | 'general';
}

function PinPopoverContent({
  pin,
  assignment,
  onSelectSensor,
  onUnassign,
  canAssignSensor,
  deviceType,
}: PinPopoverContentProps) {
  const [activeCategory, setActiveCategory] = useState<SensorCategory>('temperature');

  const isPowerOrGnd = pin.capabilities.includes('POWER') || pin.capabilities.includes('GND');

  // Get aquaponics sensors for the device type
  const aquaponicsSensors = useMemo(() => getAquaponicsSensors(deviceType), [deviceType]);

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

      {/* Aquaponics Sensor Selection - Streamlined */}
      <div className="p-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Leaf className="h-3 w-3" />
          Aquaponics Sensors ({deviceType === 'fish' ? 'Fish Tank' : deviceType === 'plant' ? 'Grow Bed' : 'All'})
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {aquaponicsSensors.map((sensor) => {
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
                      'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                      isCompatible
                        ? 'hover:bg-gradient-to-r hover:from-cyan-50 hover:to-teal-50 cursor-pointer border border-transparent hover:border-cyan-200'
                        : 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${sensor.color}15` }}
                    >
                      <SensorIcon className="h-5 w-5" style={{ color: sensor.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">
                        {sensor.name}
                        {sensor.pins.length > 1 && (
                          <span className="text-gray-400 font-normal text-xs ml-1">({sensorPin.name})</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {sensor.description}
                      </div>
                    </div>
                    {isCompatible && (
                      <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        Ready
                      </div>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
          {aquaponicsSensors.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              No compatible sensors for this device type
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BoardVisualizer;
