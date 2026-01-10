'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import type { PinAssignment } from './BoardVisualizer';
import type { BoardDefinition, PinDefinition } from '@/data/boards';
import type { SensorDefinition } from '@/data/sensors';
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
  Info,
  Cpu,
  Zap,
  GripVertical,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

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

// Sensor-specific wiring requirements for aquaponics
const SENSOR_WIRING_CONFIG: Record<string, {
  powerVoltage: '3.3V' | '5V';
  requiresPullUp?: boolean;
  pullUpResistance?: string;
  components?: Array<{
    type: 'resistor' | 'capacitor' | 'diode';
    value: string;
    connection: string;
  }>;
  notes?: string[];
}> = {
  'ds18b20': {
    powerVoltage: '3.3V',
    requiresPullUp: true,
    pullUpResistance: '4.7kΩ',
    components: [
      { type: 'resistor', value: '4.7kΩ', connection: 'DATA to VCC' },
    ],
    notes: ['Waterproof probe for fish tank', 'Pull-up resistor required'],
  },
  'ph-sensor': {
    powerVoltage: '3.3V',
    components: [
      { type: 'capacitor', value: '100nF', connection: 'VCC to GND' },
    ],
    notes: ['Calibrate before use', 'Keep probe wet'],
  },
  'tds-sensor': {
    powerVoltage: '3.3V',
    components: [
      { type: 'capacitor', value: '100nF', connection: 'VCC to GND' },
    ],
    notes: ['Measures EC and TDS', 'Temperature compensation recommended'],
  },
  'turbidity-sensor': {
    powerVoltage: '3.3V',
    notes: ['Analog output 0-4.5V', 'Clean sensor regularly'],
  },
  'bme280': {
    powerVoltage: '3.3V',
    components: [
      { type: 'capacitor', value: '100nF', connection: 'VCC to GND' },
    ],
    notes: ['I2C address: 0x76 or 0x77', 'Built-in pull-ups on module'],
  },
  'hcsr04': {
    powerVoltage: '5V',
    notes: ['Measures plant height', 'Keep clear of obstructions'],
  },
};

// Wire color coding
const WIRE_COLORS = {
  power: '#ef4444', // Red
  ground: '#1a1a1a', // Black
  signal: '#8b5cf6', // Purple
  i2c_sda: '#f97316', // Orange
  i2c_scl: '#eab308', // Yellow
  data: '#22c55e', // Green
};

// Custom Node: ESP32 Microcontroller Board with detailed pins
interface BoardNodeData extends Record<string, unknown> {
  board: BoardDefinition;
  label: string;
  leftPins: PinDefinition[];
  rightPins: PinDefinition[];
  assignments: PinAssignment[];
}

function BoardNode({ data, selected }: { data: BoardNodeData; selected: boolean }) {
  const getAssignedPinColor = (pin: PinDefinition) => {
    const assignment = data.assignments.find(a => a.gpio === pin.gpio);
    return assignment ? assignment.sensor.color : null;
  };

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden transition-all',
        selected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      style={{
        background: 'linear-gradient(180deg, #009e52 0%, #008c4a 50%, #006838 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '12px 8px',
        minWidth: '320px',
      }}
    >
      {/* PCB texture overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,80,40,0.2) 2px, rgba(0,80,40,0.2) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,80,40,0.2) 2px, rgba(0,80,40,0.2) 4px)
          `,
        }}
      />

      {/* USB Connector */}
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-4 rounded-t-sm"
        style={{
          background: 'linear-gradient(180deg, #a8a8a8 0%, #808080 50%, #606060 100%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-2 rounded-sm"
          style={{ background: '#1a1a1a' }}
        />
      </div>

      {/* Board Content */}
      <div className="flex items-stretch pt-4">
        {/* Left Pins */}
        <div className="flex flex-col gap-1">
          {data.leftPins.map((pin) => {
            const assignedColor = getAssignedPinColor(pin);
            return (
              <div key={pin.id} className="flex items-center gap-1 relative">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`left-${pin.id}`}
                  style={{
                    background: assignedColor || '#c9a227',
                    border: `2px solid ${assignedColor ? assignedColor : '#a08020'}`,
                    width: 14,
                    height: 14,
                    left: -7,
                    boxShadow: assignedColor ? `0 0 8px ${assignedColor}60` : 'none',
                  }}
                />
                <span
                  className="text-[9px] font-mono font-bold w-16 text-right pr-1"
                  style={{ color: assignedColor || '#f0f0e8', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}
                >
                  {pin.name}
                </span>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: assignedColor
                      ? `radial-gradient(circle at 30% 30%, ${assignedColor}, ${assignedColor}80)`
                      : 'radial-gradient(circle at 30% 30%, #e8d068, #c9a227)',
                    boxShadow: assignedColor
                      ? `0 0 6px ${assignedColor}60, inset 0 1px 2px rgba(255,255,255,0.3)`
                      : 'inset 0 1px 2px rgba(255,255,255,0.3)',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Center - Chip */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* WiFi Module */}
          <div
            className="rounded-sm p-1 mb-2"
            style={{
              background: 'linear-gradient(135deg, #c0c0c0 0%, #909090 100%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            <div
              className="w-16 h-10 rounded-sm flex items-center justify-center"
              style={{ background: '#808080' }}
            >
              <div className="text-[8px] font-mono text-gray-300">WiFi</div>
            </div>
          </div>

          {/* Main IC */}
          <div
            className="rounded-sm relative px-3 py-2"
            style={{
              background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full"
              style={{ background: '#404040' }}
            />
            <div className="text-center">
              <div className="text-[10px] font-bold font-mono" style={{ color: '#e0e0e0' }}>
                {data.board.microcontroller.split('-')[0]}
              </div>
              <div className="text-[8px] font-mono" style={{ color: '#808080' }}>
                WROOM-32
              </div>
            </div>
          </div>

          {/* Board Label */}
          <div className="mt-2 text-center" style={{ color: '#f0f0e8' }}>
            <div className="text-[9px] font-mono font-bold">{data.board.name}</div>
          </div>
        </div>

        {/* Right Pins */}
        <div className="flex flex-col gap-1">
          {data.rightPins.map((pin) => {
            const assignedColor = getAssignedPinColor(pin);
            return (
              <div key={pin.id} className="flex items-center gap-1 relative">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: assignedColor
                      ? `radial-gradient(circle at 30% 30%, ${assignedColor}, ${assignedColor}80)`
                      : 'radial-gradient(circle at 30% 30%, #e8d068, #c9a227)',
                    boxShadow: assignedColor
                      ? `0 0 6px ${assignedColor}60, inset 0 1px 2px rgba(255,255,255,0.3)`
                      : 'inset 0 1px 2px rgba(255,255,255,0.3)',
                  }}
                />
                <span
                  className="text-[9px] font-mono font-bold w-16 text-left pl-1"
                  style={{ color: assignedColor || '#f0f0e8', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}
                >
                  {pin.name}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`right-${pin.id}`}
                  style={{
                    background: assignedColor || '#c9a227',
                    border: `2px solid ${assignedColor ? assignedColor : '#a08020'}`,
                    width: 14,
                    height: 14,
                    right: -7,
                    boxShadow: assignedColor ? `0 0 8px ${assignedColor}60` : 'none',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Custom Node: Sensor Module with wiring details
interface SensorNodeData extends Record<string, unknown> {
  sensor: SensorDefinition;
  assignment: PinAssignment;
  wiringConfig?: typeof SENSOR_WIRING_CONFIG[string];
  onDelete?: () => void;
}

function SensorNode({ data, selected }: { data: SensorNodeData; selected: boolean }) {
  const SensorIcon = ICONS[data.sensor.icon] || Info;
  const config = data.wiringConfig || SENSOR_WIRING_CONFIG[data.sensor.id];

  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all',
        selected && 'ring-2 ring-offset-2'
      )}
      style={{
        background: `linear-gradient(135deg, white, ${data.sensor.color}08)`,
        border: `2px solid ${data.sensor.color}40`,
        boxShadow: selected
          ? `0 8px 24px ${data.sensor.color}30, 0 0 0 2px ${data.sensor.color}`
          : '0 4px 16px rgba(0,0,0,0.1)',
        padding: '16px',
        minWidth: '180px',
      }}
    >
      {/* Multi-pin handles for sensors with multiple connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="vcc"
        style={{
          top: '25%',
          background: WIRE_COLORS.power,
          border: '2px solid white',
          width: 12,
          height: 12,
          left: -6,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="gnd"
        style={{
          top: '50%',
          background: WIRE_COLORS.ground,
          border: '2px solid white',
          width: 12,
          height: 12,
          left: -6,
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="data"
        style={{
          top: '75%',
          background: data.sensor.color,
          border: '2px solid white',
          width: 12,
          height: 12,
          left: -6,
        }}
      />

      {/* Delete button */}
      {data.onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete?.();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-red-100 transition-colors group"
        >
          <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
        </button>
      )}

      {/* Sensor Content */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${data.sensor.color}15` }}
        >
          <SensorIcon className="w-6 h-6" style={{ color: data.sensor.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{data.sensor.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            GPIO {data.assignment.gpio}
          </div>
          {config && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: config.powerVoltage === '5V' ? '#fef3c7' : '#dcfce7', color: config.powerVoltage === '5V' ? '#d97706' : '#16a34a' }}
              >
                {config.powerVoltage}
              </span>
              {config.requiresPullUp && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                  Pull-up
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pin Labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-around pl-1" style={{ left: '-50px' }}>
        <span className="text-[8px] text-red-600 font-bold">VCC</span>
        <span className="text-[8px] text-gray-900 font-bold">GND</span>
        <span className="text-[8px] font-bold" style={{ color: data.sensor.color }}>DATA</span>
      </div>

      {/* Components needed */}
      {config?.components && config.components.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-[10px] font-medium text-gray-500 mb-1">Required Components</div>
          <div className="flex flex-wrap gap-1">
            {config.components.map((comp, idx) => (
              <span
                key={idx}
                className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
              >
                {comp.type === 'resistor' ? '⏚' : comp.type === 'capacitor' ? '⊥' : '▶'} {comp.value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Node: Resistor Component
interface ResistorNodeData extends Record<string, unknown> {
  value: string;
  color: string;
}

function ResistorNode({ data, selected }: { data: ResistorNodeData; selected: boolean }) {
  return (
    <div
      className={cn(
        'relative flex items-center transition-all',
        selected && 'scale-110'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ background: '#666', width: 8, height: 8, left: -4 }}
      />
      {/* Resistor body with color bands */}
      <div className="flex items-center">
        {/* Left wire */}
        <div className="w-4 h-0.5 bg-gray-500" />
        {/* Resistor body */}
        <div
          className="w-16 h-5 rounded-sm flex items-center justify-center relative"
          style={{
            background: 'linear-gradient(180deg, #d4c4a8 0%, #c4b498 50%, #b4a488 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {/* Color bands */}
          <div className="absolute left-2 w-1 h-full bg-amber-800 rounded-sm" />
          <div className="absolute left-4 w-1 h-full bg-purple-700 rounded-sm" />
          <div className="absolute left-6 w-1 h-full bg-red-600 rounded-sm" />
          <div className="absolute right-2 w-1 h-full bg-amber-500 rounded-sm" />
        </div>
        {/* Right wire */}
        <div className="w-4 h-0.5 bg-gray-500" />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: '#666', width: 8, height: 8, right: -4 }}
      />
      {/* Value label */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-gray-600 whitespace-nowrap">
        {data.value}
      </div>
    </div>
  );
}

// Custom Node: Capacitor Component
interface CapacitorNodeData extends Record<string, unknown> {
  value: string;
}

function CapacitorNode({ data, selected }: { data: CapacitorNodeData; selected: boolean }) {
  return (
    <div
      className={cn(
        'relative flex items-center transition-all',
        selected && 'scale-110'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ background: '#666', width: 8, height: 8, left: -4 }}
      />
      {/* Capacitor body */}
      <div className="flex items-center">
        <div className="w-3 h-0.5 bg-gray-500" />
        <div className="w-0.5 h-8 bg-gray-700" />
        <div className="w-2" />
        <div className="w-0.5 h-8 bg-gray-700" />
        <div className="w-3 h-0.5 bg-gray-500" />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: '#666', width: 8, height: 8, right: -4 }}
      />
      {/* Value label */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-gray-600 whitespace-nowrap">
        {data.value}
      </div>
    </div>
  );
}

// Custom Node: Enhanced Breadboard with more detail
function BreadboardNode({ selected }: { selected: boolean }) {
  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden transition-all',
        selected && 'ring-2 ring-gray-400 ring-offset-2'
      )}
      style={{
        background: '#f8fafc',
        border: '3px solid #cbd5e1',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.9)',
        padding: '12px',
        width: '600px',
        height: '300px',
      }}
    >
      {/* Power rails - top */}
      <div className="flex gap-3 mb-3">
        {/* Red power rail */}
        <div className="flex-1 h-8 rounded-sm relative" style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
          <div className="absolute top-1 left-2 right-2 h-1 bg-red-500 rounded-full" />
          <div className="absolute bottom-1 left-2 right-2 flex justify-between px-1">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-gray-400" />
            ))}
          </div>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-red-600 font-bold">+</span>
        </div>
        {/* Blue ground rail */}
        <div className="flex-1 h-8 rounded-sm relative" style={{ background: '#f5f5ff', border: '1px solid #bfdbfe' }}>
          <div className="absolute top-1 left-2 right-2 h-1 bg-blue-500 rounded-full" />
          <div className="absolute bottom-1 left-2 right-2 flex justify-between px-1">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-gray-400" />
            ))}
          </div>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-blue-600 font-bold">−</span>
        </div>
      </div>

      {/* Main breadboard area */}
      <div className="bg-white rounded-sm border border-gray-200 flex-1 relative" style={{ height: '200px' }}>
        {/* Row labels */}
        <div className="absolute -left-5 top-3 bottom-3 flex flex-col justify-between text-[7px] font-mono text-gray-400">
          {['a', 'b', 'c', 'd', 'e'].map((letter) => (
            <span key={letter}>{letter}</span>
          ))}
        </div>
        <div className="absolute -left-5 top-[120px] bottom-3 flex flex-col justify-between text-[7px] font-mono text-gray-400">
          {['f', 'g', 'h', 'i', 'j'].map((letter) => (
            <span key={letter}>{letter}</span>
          ))}
        </div>

        {/* Top section holes */}
        <div className="p-3">
          <div className="grid gap-y-2">
            {[...Array(5)].map((_, row) => (
              <div key={`top-${row}`} className="flex gap-1.5">
                {[...Array(60)].map((_, col) => (
                  <div
                    key={`top-${row}-${col}`}
                    className="w-1.5 h-1.5 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)' }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Center gap */}
          <div className="h-4 my-2 bg-gray-100 rounded-sm flex items-center justify-center">
            <span className="text-[8px] text-gray-400 font-mono">──────────────────────────────────────────────────────</span>
          </div>

          {/* Bottom section holes */}
          <div className="grid gap-y-2">
            {[...Array(5)].map((_, row) => (
              <div key={`bottom-${row}`} className="flex gap-1.5">
                {[...Array(60)].map((_, col) => (
                  <div
                    key={`bottom-${row}-${col}`}
                    className="w-1.5 h-1.5 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)' }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Column numbers */}
        <div className="absolute bottom-0 left-3 right-3 flex justify-between text-[6px] font-mono text-gray-300 px-2">
          {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((num) => (
            <span key={num}>{num}</span>
          ))}
        </div>
      </div>

      {/* Power rails - bottom */}
      <div className="flex gap-3 mt-3">
        <div className="flex-1 h-8 rounded-sm relative" style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
          <div className="absolute bottom-1 left-2 right-2 h-1 bg-red-500 rounded-full" />
          <div className="absolute top-1 left-2 right-2 flex justify-between px-1">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-gray-400" />
            ))}
          </div>
        </div>
        <div className="flex-1 h-8 rounded-sm relative" style={{ background: '#f5f5ff', border: '1px solid #bfdbfe' }}>
          <div className="absolute bottom-1 left-2 right-2 h-1 bg-blue-500 rounded-full" />
          <div className="absolute top-1 left-2 right-2 flex justify-between px-1">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-gray-400" />
            ))}
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="absolute bottom-2 right-3 text-[9px] text-gray-400 font-mono">
        830-Point Solderless Breadboard
      </div>
    </div>
  );
}

// Power Rail Node
interface PowerRailNodeData extends Record<string, unknown> {
  type: 'power' | 'ground';
  voltage?: string;
}

function PowerRailNode({ data, selected }: { data: PowerRailNodeData; selected: boolean }) {
  const isPower = data.type === 'power';

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden transition-all',
        selected && 'ring-2 ring-offset-2',
        isPower ? 'ring-red-500' : 'ring-blue-500'
      )}
      style={{
        background: isPower
          ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
          : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: `2px solid ${isPower ? '#f87171' : '#60a5fa'}`,
        boxShadow: `0 4px 12px ${isPower ? 'rgba(239,68,68,0.2)' : 'rgba(96,165,250,0.2)'}`,
        padding: '12px 20px',
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{
          background: isPower ? '#ef4444' : '#3b82f6',
          border: '2px solid white',
          width: 12,
          height: 12,
          right: -6,
        }}
      />

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isPower ? 'bg-red-100' : 'bg-blue-100'
          )}
        >
          {isPower ? (
            <Zap className="w-5 h-5 text-red-600" />
          ) : (
            <div className="w-5 h-5 flex items-center justify-center text-blue-600 font-bold text-lg">⏚</div>
          )}
        </div>
        <div>
          <div className={cn('font-bold', isPower ? 'text-red-700' : 'text-blue-700')}>
            {isPower ? data.voltage || '3.3V' : 'GND'}
          </div>
          <div className="text-[10px] text-gray-500">
            {isPower ? 'Power Supply' : 'Ground'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Define node types
const nodeTypes: NodeTypes = {
  board: BoardNode,
  sensor: SensorNode,
  powerRail: PowerRailNode,
  breadboard: BreadboardNode,
  resistor: ResistorNode,
  capacitor: CapacitorNode,
};

interface BreadboardViewProps {
  board: BoardDefinition;
  assignments: PinAssignment[];
  onUnassign?: (pinId: string) => void;
  className?: string;
}

export function BreadboardView({ board, assignments, onUnassign, className }: BreadboardViewProps) {
  // Group assignments by sensor
  const sensorGroups = useMemo(() => {
    return assignments.reduce((acc, assignment) => {
      const key = assignment.sensor.id;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(assignment);
      return acc;
    }, {} as Record<string, PinAssignment[]>);
  }, [assignments]);

  // Create initial nodes with proper positioning
  const initialNodes = useMemo((): Node[] => {
    const nodes: Node[] = [];

    // Add breadboard as background - positioned center
    nodes.push({
      id: 'breadboard',
      type: 'breadboard',
      position: { x: 50, y: 180 },
      data: {},
      selectable: false,
      draggable: false,
      zIndex: 0,
    });

    // Add the ESP32 board - positioned on breadboard
    const leftPins = board.pins.filter((p) => p.side === 'left').slice(0, 15);
    const rightPins = board.pins.filter((p) => p.side === 'right').slice(0, 15);

    nodes.push({
      id: 'esp32-board',
      type: 'board',
      position: { x: 180, y: 250 },
      data: {
        board,
        label: board.name,
        leftPins,
        rightPins,
        assignments,
      },
      zIndex: 10,
    });

    // Add power rails
    nodes.push({
      id: 'power-3v3',
      type: 'powerRail',
      position: { x: 700, y: 50 },
      data: { type: 'power' as const, voltage: '3.3V' },
      zIndex: 5,
    });

    nodes.push({
      id: 'power-5v',
      type: 'powerRail',
      position: { x: 700, y: 120 },
      data: { type: 'power' as const, voltage: '5V' },
      zIndex: 5,
    });

    nodes.push({
      id: 'gnd',
      type: 'powerRail',
      position: { x: 700, y: 190 },
      data: { type: 'ground' as const },
      zIndex: 5,
    });

    // Add sensor nodes with proper spacing
    let sensorY = 280;
    Object.entries(sensorGroups).forEach(([sensorId, sensorAssignments]) => {
      const assignment = sensorAssignments[0];
      const wiringConfig = SENSOR_WIRING_CONFIG[assignment.sensor.id];

      nodes.push({
        id: `sensor-${sensorId}`,
        type: 'sensor',
        position: { x: 700, y: sensorY },
        data: {
          sensor: assignment.sensor,
          assignment,
          wiringConfig,
          onDelete: onUnassign ? () => onUnassign(assignment.pinId) : undefined,
        },
        zIndex: 15,
      });

      // Add required components (resistors, capacitors)
      if (wiringConfig?.components) {
        wiringConfig.components.forEach((comp, idx) => {
          const compId = `comp-${sensorId}-${idx}`;
          if (comp.type === 'resistor') {
            nodes.push({
              id: compId,
              type: 'resistor',
              position: { x: 580, y: sensorY + 10 + idx * 30 },
              data: { value: comp.value, color: assignment.sensor.color },
              zIndex: 12,
            });
          } else if (comp.type === 'capacitor') {
            nodes.push({
              id: compId,
              type: 'capacitor',
              position: { x: 580, y: sensorY + 10 + idx * 30 },
              data: { value: comp.value },
              zIndex: 12,
            });
          }
        });
      }

      sensorY += 130;
    });

    return nodes;
  }, [board, sensorGroups, assignments, onUnassign]);

  // Create edges (wiring connections) based on sensor assignments
  const initialEdges = useMemo((): Edge[] => {
    const edges: Edge[] = [];

    Object.entries(sensorGroups).forEach(([sensorId, sensorAssignments]) => {
      sensorAssignments.forEach((assignment) => {
        const pin = board.pins.find((p) => p.gpio === assignment.gpio);
        if (!pin) return;

        const sourceHandle = pin.side === 'right' ? `right-${pin.id}` : `left-${pin.id}`;
        const wiringConfig = SENSOR_WIRING_CONFIG[assignment.sensor.id];

        // Data wire from ESP32 to sensor
        edges.push({
          id: `wire-data-${sensorId}`,
          source: 'esp32-board',
          sourceHandle,
          target: `sensor-${sensorId}`,
          targetHandle: 'data',
          type: 'smoothstep',
          animated: true,
          style: { stroke: assignment.sensor.color, strokeWidth: 3 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: assignment.sensor.color,
          },
          label: pin.name,
          labelStyle: { fill: assignment.sensor.color, fontWeight: 600, fontSize: 10 },
          labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
        });

        // Power wire
        const powerSource = wiringConfig?.powerVoltage === '5V' ? 'power-5v' : 'power-3v3';
        edges.push({
          id: `wire-power-${sensorId}`,
          source: powerSource,
          sourceHandle: 'out',
          target: `sensor-${sensorId}`,
          targetHandle: 'vcc',
          type: 'smoothstep',
          style: { stroke: WIRE_COLORS.power, strokeWidth: 2 },
        });

        // Ground wire
        edges.push({
          id: `wire-gnd-${sensorId}`,
          source: 'gnd',
          sourceHandle: 'out',
          target: `sensor-${sensorId}`,
          targetHandle: 'gnd',
          type: 'smoothstep',
          style: { stroke: WIRE_COLORS.ground, strokeWidth: 2 },
        });
      });
    });

    return edges;
  }, [board.pins, sensorGroups]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when assignments change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#8b5cf6', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  return (
    <div className={cn('w-full h-[700px] rounded-2xl overflow-hidden border border-gray-200 bg-gradient-to-br from-slate-50 to-gray-100', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
        <Controls
          className="bg-white rounded-xl shadow-lg border border-gray-200"
          showZoom
          showFitView
          showInteractive
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'board') return '#008c4a';
            if (node.type === 'sensor') return (node.data as SensorNodeData).sensor?.color || '#8b5cf6';
            if (node.type === 'powerRail') {
              return (node.data as PowerRailNodeData).type === 'power' ? '#ef4444' : '#3b82f6';
            }
            return '#e2e8f0';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="bg-white rounded-xl shadow-lg border border-gray-200"
        />

        {/* Info Panel */}
        <Panel position="top-left" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-5 m-4 max-w-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Wiring Diagram</h3>
              <p className="text-xs text-gray-500">Auto-generated from pin assignments</p>
            </div>
          </div>

          {/* Connection status */}
          <div className="space-y-2">
            {Object.keys(sensorGroups).length > 0 ? (
              Object.entries(sensorGroups).map(([sensorId, sensorAssignments]) => {
                const sensor = sensorAssignments[0].sensor;
                const SensorIcon = ICONS[sensor.icon] || Info;
                return (
                  <div key={sensorId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <SensorIcon className="w-4 h-4" style={{ color: sensor.color }} />
                    <span className="text-sm text-gray-700 flex-1">{sensor.name}</span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700">No sensors assigned</span>
              </div>
            )}
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="bottom-left" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 m-4">
          <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Wire Colors</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full" style={{ background: WIRE_COLORS.power }} />
              <span className="text-xs text-gray-600">Power (VCC)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full" style={{ background: WIRE_COLORS.ground }} />
              <span className="text-xs text-gray-600">Ground (GND)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full" style={{ background: WIRE_COLORS.signal }} />
              <span className="text-xs text-gray-600">Data Signal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full" style={{ background: WIRE_COLORS.i2c_sda }} />
              <span className="text-xs text-gray-600">I2C SDA</span>
            </div>
          </div>
        </Panel>

        {/* Stats Panel */}
        <Panel position="top-right" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 m-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-600 font-medium">{board.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-600">{Object.keys(sensorGroups).length} Sensors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-gray-600">{edges.length} Wires</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default BreadboardView;
