'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { PinAssignment } from './BoardVisualizer';
import type { BoardDefinition } from '@/data/boards';
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

interface BreadboardViewProps {
  board: BoardDefinition;
  assignments: PinAssignment[];
  className?: string;
}

export function BreadboardView({ board, assignments, className }: BreadboardViewProps) {
  // Group assignments by sensor (for multi-pin sensors like I2C)
  const sensorGroups = assignments.reduce((acc, assignment) => {
    const key = assignment.sensor.id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(assignment);
    return acc;
  }, {} as Record<string, PinAssignment[]>);

  return (
    <div className={cn('relative', className)}>
      <svg viewBox="0 0 600 400" className="w-full">
        {/* Background */}
        <defs>
          <pattern id="breadboardHoles" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="2" fill="#4b5563" />
          </pattern>
          <linearGradient id="breadboardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* Breadboard body */}
        <rect
          x="20"
          y="20"
          width="560"
          height="360"
          rx="8"
          fill="url(#breadboardGradient)"
          stroke="#cbd5e1"
          strokeWidth="2"
        />

        {/* Power rails */}
        <g>
          {/* Top power rail - 5V (red) */}
          <rect x="40" y="40" width="520" height="25" rx="4" fill="#fee2e2" stroke="#fca5a5" />
          <line x1="50" y1="52" x2="550" y2="52" stroke="#ef4444" strokeWidth="2" />
          <text x="30" y="57" fill="#dc2626" fontSize="10" fontWeight="bold">+</text>

          {/* Top power rail - GND (blue) */}
          <rect x="40" y="70" width="520" height="25" rx="4" fill="#dbeafe" stroke="#93c5fd" />
          <line x1="50" y1="82" x2="550" y2="82" stroke="#3b82f6" strokeWidth="2" />
          <text x="30" y="87" fill="#2563eb" fontSize="10" fontWeight="bold">-</text>

          {/* Bottom power rail - 5V (red) */}
          <rect x="40" y="305" width="520" height="25" rx="4" fill="#fee2e2" stroke="#fca5a5" />
          <line x1="50" y1="317" x2="550" y2="317" stroke="#ef4444" strokeWidth="2" />
          <text x="30" y="322" fill="#dc2626" fontSize="10" fontWeight="bold">+</text>

          {/* Bottom power rail - GND (blue) */}
          <rect x="40" y="335" width="520" height="25" rx="4" fill="#dbeafe" stroke="#93c5fd" />
          <line x1="50" y1="347" x2="550" y2="347" stroke="#3b82f6" strokeWidth="2" />
          <text x="30" y="352" fill="#2563eb" fontSize="10" fontWeight="bold">-</text>
        </g>

        {/* Main breadboard area */}
        <rect x="40" y="105" width="520" height="190" rx="4" fill="#f1f5f9" stroke="#cbd5e1" />

        {/* Center divider */}
        <rect x="40" y="195" width="520" height="10" fill="#e2e8f0" />

        {/* Hole patterns */}
        <g>
          {/* Top section holes */}
          {Array.from({ length: 50 }).map((_, col) =>
            Array.from({ length: 5 }).map((_, row) => (
              <circle
                key={`top-${col}-${row}`}
                cx={55 + col * 10}
                cy={120 + row * 15}
                r="2.5"
                fill="#374151"
              />
            ))
          )}

          {/* Bottom section holes */}
          {Array.from({ length: 50 }).map((_, col) =>
            Array.from({ length: 5 }).map((_, row) => (
              <circle
                key={`bottom-${col}-${row}`}
                cx={55 + col * 10}
                cy={215 + row * 15}
                r="2.5"
                fill="#374151"
              />
            ))
          )}
        </g>

        {/* ESP32 Board representation */}
        <g transform="translate(200, 115)">
          <rect x="0" y="0" width="80" height="170" rx="4" fill="#1e3a5f" stroke="#334155" strokeWidth="2" />
          <rect x="25" y="-5" width="30" height="15" rx="2" fill="#4b5563" /> {/* USB */}
          <text x="40" y="85" textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace">
            ESP32
          </text>
          <text x="40" y="95" textAnchor="middle" fill="#6b7280" fontSize="6" fontFamily="monospace">
            DevKit V1
          </text>

          {/* Pin labels on ESP32 */}
          {board.pins.filter(p => p.side === 'left').slice(0, 8).map((pin, idx) => (
            <g key={`left-${pin.id}`}>
              <circle cx="-5" cy={20 + idx * 18} r="3" fill="#64748b" />
              <text x="-12" y={23 + idx * 18} textAnchor="end" fill="#94a3b8" fontSize="5">
                {pin.name}
              </text>
            </g>
          ))}

          {board.pins.filter(p => p.side === 'right').slice(0, 8).map((pin, idx) => (
            <g key={`right-${pin.id}`}>
              <circle cx="85" cy={20 + idx * 18} r="3" fill="#64748b" />
              <text x="92" y={23 + idx * 18} textAnchor="start" fill="#94a3b8" fontSize="5">
                {pin.name}
              </text>
            </g>
          ))}
        </g>

        {/* Connected sensors */}
        {Object.entries(sensorGroups).map(([sensorId, sensorAssignments], groupIdx) => {
          const sensor = sensorAssignments[0].sensor;
          const SensorIcon = ICONS[sensor.icon] || Info;
          const xOffset = 380 + (groupIdx % 2) * 100;
          const yOffset = 120 + Math.floor(groupIdx / 2) * 80;

          return (
            <g key={sensorId} transform={`translate(${xOffset}, ${yOffset})`}>
              {/* Sensor module */}
              <rect
                x="0"
                y="0"
                width="80"
                height="60"
                rx="4"
                fill={`${sensor.color}15`}
                stroke={sensor.color}
                strokeWidth="1.5"
              />

              {/* Sensor icon */}
              <foreignObject x="25" y="5" width="30" height="30">
                <div className="flex items-center justify-center h-full">
                  <SensorIcon className="h-5 w-5" style={{ color: sensor.color }} />
                </div>
              </foreignObject>

              {/* Sensor name */}
              <text x="40" y="48" textAnchor="middle" fill={sensor.color} fontSize="8" fontWeight="500">
                {sensor.name}
              </text>

              {/* Connection wires */}
              {sensorAssignments.map((assignment, pinIdx) => {
                const pin = board.pins.find(p => p.gpio === assignment.gpio);
                if (!pin) return null;

                // Calculate wire path from sensor to ESP32
                const sensorX = -xOffset + 280 + (pin.side === 'right' ? 85 : -5);
                const sensorY = -yOffset + 115 + 20;

                return (
                  <g key={assignment.pinId}>
                    {/* Wire */}
                    <path
                      d={`M 0 ${30 + pinIdx * 10}
                          C -20 ${30 + pinIdx * 10},
                            ${sensorX - 20} ${sensorY + pinIdx * 18},
                            ${sensorX} ${sensorY + pinIdx * 18}`}
                      fill="none"
                      stroke={sensor.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.7"
                    />

                    {/* Pin label */}
                    <text
                      x="-5"
                      y={33 + pinIdx * 10}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="6"
                    >
                      {assignment.sensorPinName}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Power connections */}
        <g>
          {/* 3.3V wire */}
          <path
            d="M 280 115 L 280 95 L 350 95 L 350 52"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="350" cy="52" r="3" fill="#22c55e" />
          <text x="355" y="45" fill="#22c55e" fontSize="7">3.3V</text>

          {/* GND wire */}
          <path
            d="M 280 285 L 280 300 L 400 300 L 400 347"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="400" cy="347" r="3" fill="#3b82f6" />
          <text x="405" y="355" fill="#3b82f6" fontSize="7">GND</text>
        </g>

        {/* Labels */}
        <text x="300" y="15" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500">
          Breadboard Connection Diagram
        </text>

        {/* Legend */}
        <g transform="translate(20, 380)">
          <text x="0" y="0" fill="#64748b" fontSize="8">
            Legend:
          </text>
          <line x1="50" y1="-3" x2="70" y2="-3" stroke="#ef4444" strokeWidth="2" />
          <text x="75" y="0" fill="#64748b" fontSize="7">5V/3.3V</text>
          <line x1="110" y1="-3" x2="130" y2="-3" stroke="#3b82f6" strokeWidth="2" />
          <text x="135" y="0" fill="#64748b" fontSize="7">GND</text>
          <line x1="165" y1="-3" x2="185" y2="-3" stroke="#8b5cf6" strokeWidth="2" />
          <text x="190" y="0" fill="#64748b" fontSize="7">Signal</text>
        </g>
      </svg>

      {/* Sensor list */}
      {assignments.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(sensorGroups).map(([sensorId, sensorAssignments]) => {
            const sensor = sensorAssignments[0].sensor;
            const SensorIcon = ICONS[sensor.icon] || Info;

            return (
              <div
                key={sensorId}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${sensor.color}15` }}
                >
                  <SensorIcon className="h-4 w-4" style={{ color: sensor.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{sensor.name}</div>
                  <div className="text-xs text-gray-500">
                    GPIO {sensorAssignments.map(a => a.gpio).join(', ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BreadboardView;
