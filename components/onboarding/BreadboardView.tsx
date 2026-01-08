'use client';

import React, { useCallback, useMemo, useState } from 'react';
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

// Custom Node: ESP32 Microcontroller Board
interface BoardNodeData extends Record<string, unknown> {
  board: BoardDefinition;
  label: string;
  leftPins: PinDefinition[];
  rightPins: PinDefinition[];
}

function BoardNode({ data, selected }: { data: BoardNodeData; selected: boolean }) {
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
        minWidth: '280px',
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
          {data.leftPins.map((pin, idx) => (
            <div key={pin.id} className="flex items-center gap-1 relative">
              <Handle
                type="target"
                position={Position.Left}
                id={`left-${pin.id}`}
                style={{
                  background: '#c9a227',
                  border: '2px solid #a08020',
                  width: 12,
                  height: 12,
                  left: -6,
                }}
              />
              <span
                className="text-[9px] font-mono font-bold w-14 text-right pr-1"
                style={{ color: '#f0f0e8', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}
              >
                {pin.name}
              </span>
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #e8d068, #c9a227)',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
                }}
              />
            </div>
          ))}
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
              <div className="grid grid-cols-3 gap-0.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-gray-600" />
                ))}
              </div>
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
                {data.board.microcontroller.split('-').slice(1).join('-') || 'WROOM'}
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
          {data.rightPins.map((pin, idx) => (
            <div key={pin.id} className="flex items-center gap-1 relative">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #e8d068, #c9a227)',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
                }}
              />
              <span
                className="text-[9px] font-mono font-bold w-14 text-left pl-1"
                style={{ color: '#f0f0e8', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}
              >
                {pin.name}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={`right-${pin.id}`}
                style={{
                  background: '#c9a227',
                  border: '2px solid #a08020',
                  width: 12,
                  height: 12,
                  right: -6,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Drag handle indicator */}
      <div className="absolute top-2 right-2 opacity-50">
        <GripVertical className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

// Custom Node: Sensor Module
interface SensorNodeData extends Record<string, unknown> {
  sensor: SensorDefinition;
  assignment: PinAssignment;
  onDelete?: () => void;
}

function SensorNode({ data, selected }: { data: SensorNodeData; selected: boolean }) {
  const SensorIcon = ICONS[data.sensor.icon] || Info;

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden transition-all',
        selected && 'ring-2 ring-offset-2'
      )}
      style={{
        background: `linear-gradient(135deg, ${data.sensor.color}15, ${data.sensor.color}08)`,
        border: `2px solid ${data.sensor.color}40`,
        boxShadow: selected
          ? `0 8px 24px ${data.sensor.color}30, 0 0 0 2px ${data.sensor.color}`
          : '0 4px 12px rgba(0,0,0,0.1)',
        padding: '12px',
        minWidth: '120px',
      }}
    >
      {/* Connection Handle */}
      <Handle
        type="source"
        position={Position.Left}
        id="sensor-out"
        style={{
          background: data.sensor.color,
          border: `2px solid ${data.sensor.color}`,
          width: 10,
          height: 10,
          left: -5,
        }}
      />

      {/* Delete button */}
      {data.onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete?.();
          }}
          className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-100 transition-colors group"
        >
          <Trash2 className="w-3 h-3 text-gray-400 group-hover:text-red-500" />
        </button>
      )}

      {/* Sensor Content */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${data.sensor.color}20` }}
        >
          <SensorIcon className="w-5 h-5" style={{ color: data.sensor.color }} />
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold text-gray-800">{data.sensor.name}</div>
          <div className="text-[10px] text-gray-500">
            GPIO {data.assignment.gpio}
          </div>
        </div>
      </div>

      {/* Pin indicators */}
      <div className="mt-2 flex flex-wrap gap-1 justify-center">
        {data.sensor.pins.map((pin) => (
          <span
            key={pin.name}
            className="text-[8px] px-1.5 py-0.5 rounded-full"
            style={{
              background: `${data.sensor.color}15`,
              color: data.sensor.color,
            }}
          >
            {pin.name}
          </span>
        ))}
      </div>

      {/* Drag handle */}
      <div className="absolute bottom-1 right-1 opacity-40">
        <GripVertical className="w-3 h-3 text-gray-500" />
      </div>
    </div>
  );
}

// Custom Node: Power Rail
interface PowerRailNodeData extends Record<string, unknown> {
  type: 'power' | 'ground';
  voltage?: number;
}

function PowerRailNode({ data, selected }: { data: PowerRailNodeData; selected: boolean }) {
  const isPower = data.type === 'power';

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden transition-all',
        selected && 'ring-2 ring-offset-2',
        isPower ? 'ring-red-500' : 'ring-blue-500'
      )}
      style={{
        background: isPower
          ? 'linear-gradient(90deg, #fee2e2, #fecaca)'
          : 'linear-gradient(90deg, #dbeafe, #bfdbfe)',
        border: `2px solid ${isPower ? '#fca5a5' : '#93c5fd'}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: '8px 24px',
        minWidth: '200px',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="power-in"
        style={{
          background: isPower ? '#ef4444' : '#3b82f6',
          border: '2px solid white',
          width: 10,
          height: 10,
        }}
      />

      <div className="flex items-center justify-center gap-2">
        {isPower ? (
          <Zap className="w-4 h-4 text-red-500" />
        ) : (
          <div className="w-4 h-4 flex items-center justify-center text-blue-500 font-bold text-xs">⏚</div>
        )}
        <span
          className={cn(
            'text-sm font-bold',
            isPower ? 'text-red-600' : 'text-blue-600'
          )}
        >
          {isPower ? `${data.voltage || 3.3}V` : 'GND'}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="power-out"
        style={{
          background: isPower ? '#ef4444' : '#3b82f6',
          border: '2px solid white',
          width: 10,
          height: 10,
        }}
      />
    </div>
  );
}

// Custom Node: Breadboard
function BreadboardNode({ selected }: { selected: boolean }) {
  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden transition-all',
        selected && 'ring-2 ring-gray-400 ring-offset-2'
      )}
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        border: '2px solid #cbd5e1',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        padding: '16px',
        width: '500px',
        height: '280px',
      }}
    >
      {/* Power rails - top */}
      <div className="flex gap-2 mb-3">
        <div
          className="flex-1 h-6 rounded-sm flex items-center"
          style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}
        >
          <div className="w-full h-0.5 bg-red-400 mx-2" />
        </div>
        <div
          className="flex-1 h-6 rounded-sm flex items-center"
          style={{ background: '#dbeafe', border: '1px solid #93c5fd' }}
        >
          <div className="w-full h-0.5 bg-blue-400 mx-2" />
        </div>
      </div>

      {/* Main breadboard area */}
      <div className="bg-gray-100 rounded-sm p-3 border border-gray-200">
        {/* Holes pattern - top section */}
        <div className="grid grid-cols-30 gap-1 mb-2">
          {[...Array(150)].map((_, i) => (
            <div key={`top-${i}`} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          ))}
        </div>

        {/* Center gap */}
        <div className="h-3 bg-gray-200 rounded-sm my-2" />

        {/* Holes pattern - bottom section */}
        <div className="grid grid-cols-30 gap-1">
          {[...Array(150)].map((_, i) => (
            <div key={`bottom-${i}`} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          ))}
        </div>
      </div>

      {/* Power rails - bottom */}
      <div className="flex gap-2 mt-3">
        <div
          className="flex-1 h-6 rounded-sm flex items-center"
          style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}
        >
          <div className="w-full h-0.5 bg-red-400 mx-2" />
        </div>
        <div
          className="flex-1 h-6 rounded-sm flex items-center"
          style={{ background: '#dbeafe', border: '1px solid #93c5fd' }}
        >
          <div className="w-full h-0.5 bg-blue-400 mx-2" />
        </div>
      </div>

      {/* Label */}
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 font-mono">
        400-Point Breadboard
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
};

// Edge styles for different connection types
const getEdgeStyle = (type: string) => {
  switch (type) {
    case 'power':
      return { stroke: '#ef4444', strokeWidth: 3 };
    case 'ground':
      return { stroke: '#3b82f6', strokeWidth: 3 };
    case 'signal':
      return { stroke: '#8b5cf6', strokeWidth: 2 };
    case 'i2c':
      return { stroke: '#f97316', strokeWidth: 2 };
    default:
      return { stroke: '#64748b', strokeWidth: 2 };
  }
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

  // Create initial nodes
  const initialNodes = useMemo((): Node[] => {
    const nodes: Node[] = [];

    // Add breadboard as background
    nodes.push({
      id: 'breadboard',
      type: 'breadboard',
      position: { x: 100, y: 150 },
      data: {},
      selectable: false,
      draggable: false,
      zIndex: 0,
    });

    // Add the board
    const leftPins = board.pins.filter((p) => p.side === 'left').slice(0, 15);
    const rightPins = board.pins.filter((p) => p.side === 'right').slice(0, 15);

    nodes.push({
      id: 'esp32-board',
      type: 'board',
      position: { x: 200, y: 200 },
      data: {
        board,
        label: board.name,
        leftPins,
        rightPins,
      },
      zIndex: 10,
    });

    // Add power rails
    nodes.push({
      id: 'power-rail-3v3',
      type: 'powerRail',
      position: { x: 520, y: 50 },
      data: { type: 'power' as const, voltage: 3.3 },
      zIndex: 5,
    });

    nodes.push({
      id: 'power-rail-gnd',
      type: 'powerRail',
      position: { x: 520, y: 120 },
      data: { type: 'ground' as const },
      zIndex: 5,
    });

    // Add sensor nodes
    Object.entries(sensorGroups).forEach(([sensorId, sensorAssignments], index) => {
      const assignment = sensorAssignments[0];
      nodes.push({
        id: `sensor-${sensorId}`,
        type: 'sensor',
        position: { x: 550 + (index % 2) * 140, y: 220 + Math.floor(index / 2) * 140 },
        data: {
          sensor: assignment.sensor,
          assignment,
          onDelete: onUnassign ? () => onUnassign(assignment.pinId) : undefined,
        },
        zIndex: 15,
      });
    });

    return nodes;
  }, [board, sensorGroups, onUnassign]);

  // Create initial edges (connections)
  const initialEdges = useMemo((): Edge[] => {
    const edges: Edge[] = [];

    // Connect sensors to board pins
    Object.entries(sensorGroups).forEach(([sensorId, sensorAssignments]) => {
      sensorAssignments.forEach((assignment, idx) => {
        const pin = board.pins.find((p) => p.gpio === assignment.gpio);
        if (!pin) return;

        const sourceHandle = pin.side === 'right' ? `right-${pin.id}` : `left-${pin.id}`;

        edges.push({
          id: `edge-${sensorId}-${idx}`,
          source: 'esp32-board',
          sourceHandle,
          target: `sensor-${sensorId}`,
          targetHandle: 'sensor-out',
          type: 'smoothstep',
          animated: true,
          style: { stroke: assignment.sensor.color, strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: assignment.sensor.color,
          },
        });
      });
    });

    return edges;
  }, [board.pins, sensorGroups]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
    <div className={cn('w-full h-[600px] rounded-2xl overflow-hidden border border-gray-200 bg-white', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls
          className="bg-white rounded-lg shadow-lg border border-gray-200"
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
          className="bg-white rounded-lg shadow-lg border border-gray-200"
        />

        {/* Info Panel */}
        <Panel position="top-left" className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 m-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Interactive Breadboard</h3>
              <p className="text-xs text-gray-500">Drag components to arrange your circuit</p>
            </div>
          </div>
        </Panel>

        {/* Stats Panel */}
        <Panel position="top-right" className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 m-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-600">Board</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-600">{Object.keys(sensorGroups).length} Sensors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600">{edges.length} Connections</span>
            </div>
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="bottom-left" className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 m-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Wire Legend</div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-red-500 rounded" />
              <span className="text-xs text-gray-600">Power</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-blue-500 rounded" />
              <span className="text-xs text-gray-600">Ground</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-purple-500 rounded" />
              <span className="text-xs text-gray-600">Signal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-orange-500 rounded" />
              <span className="text-xs text-gray-600">I2C</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default BreadboardView;
