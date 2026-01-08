'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { BoardDefinition, PinDefinition, PinCapability } from '@/data/boards';

// Pin type colors matching pinouts design
const PIN_COLORS = {
  POWER_5V: '#ef4444',   // Red
  POWER_3V3: '#ef4444',  // Red
  GND: '#6b7280',        // Gray
  DIGITAL: '#3b82f6',    // Blue
  ANALOG: '#eab308',     // Yellow
  I2C: '#8b5cf6',        // Purple
  SPI: '#f97316',        // Orange
  UART: '#ec4899',       // Pink
  PWM: '#10b981',        // Emerald
} as const;

export interface PinCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

interface InteractivePinoutProps {
  board: BoardDefinition;
  onPinSelect?: (pin: PinDefinition | null) => void;
  selectedPin?: PinDefinition | null;
  highlightedCategory?: string | null;
  onCategorySelect?: (category: string | null) => void;
  className?: string;
}

export function InteractivePinout({
  board,
  onPinSelect,
  selectedPin,
  highlightedCategory,
  onCategorySelect,
  className,
}: InteractivePinoutProps) {
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  const leftPins = board.pins.filter((p) => p.side === 'left');
  const rightPins = board.pins.filter((p) => p.side === 'right');

  // Calculate pin categories
  const pinCategories = useMemo(() => {
    const categories: PinCategory[] = [];

    const i2cPins = board.pins.filter(p =>
      p.capabilities.includes('I2C_SDA') || p.capabilities.includes('I2C_SCL')
    );
    if (i2cPins.length > 0) {
      categories.push({ id: 'I2C', name: 'I2C', icon: 'link', color: '#8b5cf6', count: i2cPins.length });
    }

    const uartPins = board.pins.filter(p =>
      p.capabilities.includes('UART_TX') || p.capabilities.includes('UART_RX')
    );
    if (uartPins.length > 0) {
      categories.push({ id: 'UART', name: 'UART', icon: 'terminal', color: '#ec4899', count: uartPins.length });
    }

    const spiPins = board.pins.filter(p =>
      p.capabilities.includes('SPI_MOSI') || p.capabilities.includes('SPI_MISO') ||
      p.capabilities.includes('SPI_CLK') || p.capabilities.includes('SPI_CS')
    );
    if (spiPins.length > 0) {
      categories.push({ id: 'SPI', name: 'SPI', icon: 'cpu', color: '#f97316', count: spiPins.length });
    }

    const pwmPins = board.pins.filter(p => p.capabilities.includes('PWM'));
    if (pwmPins.length > 0) {
      categories.push({ id: 'PWM', name: 'PWM', icon: 'activity', color: '#10b981', count: pwmPins.length });
    }

    const adcPins = board.pins.filter(p => p.capabilities.includes('ADC'));
    if (adcPins.length > 0) {
      categories.push({ id: 'ADC', name: 'ADC', icon: 'gauge', color: '#eab308', count: adcPins.length });
    }

    const powerPins = board.pins.filter(p => p.capabilities.includes('POWER'));
    if (powerPins.length > 0) {
      categories.push({ id: 'POWER', name: 'Power', icon: 'zap', color: '#ef4444', count: powerPins.length });
    }

    const gndPins = board.pins.filter(p => p.capabilities.includes('GND'));
    if (gndPins.length > 0) {
      categories.push({ id: 'GND', name: 'Ground', icon: 'minus', color: '#6b7280', count: gndPins.length });
    }

    return categories;
  }, [board.pins]);

  const getPinType = (pin: PinDefinition): string => {
    if (pin.capabilities.includes('POWER')) return pin.voltage === 5 ? 'POWER_5V' : 'POWER_3V3';
    if (pin.capabilities.includes('GND')) return 'GND';
    if (pin.capabilities.includes('I2C_SDA') || pin.capabilities.includes('I2C_SCL')) return 'I2C';
    if (pin.capabilities.includes('UART_TX') || pin.capabilities.includes('UART_RX')) return 'UART';
    if (pin.capabilities.includes('SPI_MOSI') || pin.capabilities.includes('SPI_MISO') ||
        pin.capabilities.includes('SPI_CLK') || pin.capabilities.includes('SPI_CS')) return 'SPI';
    if (pin.capabilities.includes('ADC')) return 'ANALOG';
    return 'DIGITAL';
  };

  const getPinColor = (pin: PinDefinition): string => {
    const type = getPinType(pin);
    return PIN_COLORS[type as keyof typeof PIN_COLORS] || PIN_COLORS.DIGITAL;
  };

  const getPinTypeLabel = (pin: PinDefinition): string => {
    if (pin.capabilities.includes('POWER')) return 'Power';
    if (pin.capabilities.includes('GND')) return 'Ground';
    return 'Digital';
  };

  const isPinHighlighted = (pin: PinDefinition): boolean => {
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
  };

  const renderPin = (pin: PinDefinition, side: 'left' | 'right', index: number) => {
    const isHovered = hoveredPin === pin.id;
    const isSelected = selectedPin?.id === pin.id;
    const isHighlighted = isPinHighlighted(pin);
    const color = getPinColor(pin);

    return (
      <div
        key={pin.id}
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md transition-all cursor-pointer',
          side === 'left' ? 'flex-row' : 'flex-row-reverse',
          (isHovered || isSelected) && 'bg-gray-50',
          !isHighlighted && highlightedCategory && 'opacity-30'
        )}
        onMouseEnter={() => setHoveredPin(pin.id)}
        onMouseLeave={() => setHoveredPin(null)}
        onClick={() => onPinSelect?.(isSelected ? null : pin)}
      >
        {/* Pin label - outside */}
        <span className={cn(
          'text-xs font-mono w-16',
          side === 'left' ? 'text-right' : 'text-left',
          (isHovered || isSelected) ? 'text-gray-900 font-medium' : 'text-gray-500'
        )}>
          {pin.name}
        </span>

        {/* Pin number */}
        <span className={cn(
          'text-xs font-mono w-6 text-center',
          side === 'left' ? 'text-right' : 'text-left',
          'text-gray-400'
        )}>
          {index + 1}
        </span>

        {/* Pin dot */}
        <div
          className={cn(
            'w-3 h-3 rounded-full transition-all flex-shrink-0',
            (isHovered || isSelected) && 'ring-2 ring-offset-1 ring-gray-300 scale-125'
          )}
          style={{ backgroundColor: color }}
        />
      </div>
    );
  };

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Interactive Pinout</h3>
            <p className="text-xs text-gray-500">Explore pins with hover details and category highlighting</p>
          </div>
        </div>
      </div>

      {/* Board name and stats */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">{board.name}</span>
          <span className="text-xs text-gray-400">Interactive Board Layout</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span><span className="font-semibold text-gray-700">{board.pins.length}</span> Total</span>
          <span><span className="font-semibold text-gray-700">{selectedPin ? 1 : 0}</span> Selected</span>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIN_COLORS.POWER_5V }} />
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
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          Click to explore
        </div>
      </div>

      {/* Pinout diagram */}
      <div className="p-6">
        <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl p-4 mx-auto max-w-lg">
          {/* USB Connector */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-600 rounded-t-sm border-2 border-gray-500" />

          {/* Board content */}
          <div className="flex justify-between gap-4 pt-4">
            {/* Left pins */}
            <div className="flex flex-col">
              {leftPins.map((pin, idx) => renderPin(pin, 'left', idx))}
            </div>

            {/* Center - Chip representation */}
            <div className="flex flex-col items-center justify-center min-w-[120px]">
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 shadow-lg">
                <div className="text-center">
                  <div className="w-20 h-20 bg-slate-900 rounded-md border border-slate-600 flex items-center justify-center mb-2">
                    <div className="text-[10px] text-slate-400 font-mono text-center">
                      <div className="font-semibold text-slate-300">{board.microcontroller}</div>
                      <div className="mt-1">Rev 1.0</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{board.name}</div>
                </div>
              </div>

              {/* USB label */}
              <div className="mt-auto pt-4 flex items-center gap-1 text-slate-500">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="text-[10px] font-mono">USB</span>
              </div>
            </div>

            {/* Right pins */}
            <div className="flex flex-col">
              {rightPins.map((pin, idx) => renderPin(pin, 'right', idx))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Hover for details
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Click categories to highlight
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Use pin categories
        </span>
      </div>
    </div>
  );
}

export default InteractivePinout;
