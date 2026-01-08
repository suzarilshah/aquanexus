'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { BoardDefinition, PinDefinition } from '@/data/boards';
import { Cpu, Zap, Gauge, Link2, Terminal, Radio, Activity, Minus, ExternalLink, Info, Tag } from 'lucide-react';

interface PinCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  count: number;
}

interface BoardInfoPanelProps {
  board: BoardDefinition;
  selectedPin?: PinDefinition | null;
  highlightedCategory?: string | null;
  onCategorySelect?: (category: string | null) => void;
  className?: string;
}

export function BoardInfoPanel({
  board,
  selectedPin,
  highlightedCategory,
  onCategorySelect,
  className,
}: BoardInfoPanelProps) {
  // Calculate pin categories
  const pinCategories = useMemo((): PinCategory[] => {
    const categories: PinCategory[] = [];

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

  const getPinTypeColor = (pin: PinDefinition): string => {
    if (pin.capabilities.includes('POWER')) return 'bg-red-100 text-red-700';
    if (pin.capabilities.includes('GND')) return 'bg-gray-100 text-gray-700';
    if (pin.capabilities.includes('ADC')) return 'bg-yellow-100 text-yellow-700';
    if (pin.capabilities.includes('I2C_SDA') || pin.capabilities.includes('I2C_SCL')) return 'bg-purple-100 text-purple-700';
    if (pin.capabilities.includes('UART_TX') || pin.capabilities.includes('UART_RX')) return 'bg-pink-100 text-pink-700';
    if (pin.capabilities.includes('SPI_MOSI') || pin.capabilities.includes('SPI_MISO') ||
        pin.capabilities.includes('SPI_CLK') || pin.capabilities.includes('SPI_CS')) return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getPinTypeLabel = (pin: PinDefinition): string => {
    if (pin.capabilities.includes('POWER')) return 'Power';
    if (pin.capabilities.includes('GND')) return 'Ground';
    if (pin.capabilities.includes('ADC')) return 'Analog';
    return 'Digital';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Board Header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{board.name}</h2>
          <button className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
            Click to view board information
          </button>
        </div>

        {/* Pin Categories */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pin Categories</span>
            <span className="text-xs text-gray-400">{pinCategories.length}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {pinCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategorySelect?.(highlightedCategory === category.id ? null : category.id)}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left',
                  highlightedCategory === category.id
                    ? `${category.bgColor} border-current ${category.color}`
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={category.color}>{category.icon}</span>
                  <span className={cn(
                    'text-sm font-medium',
                    highlightedCategory === category.id ? category.color : 'text-gray-700'
                  )}>
                    {category.name}
                  </span>
                </div>
                <span className={cn(
                  'text-sm font-semibold',
                  highlightedCategory === category.id ? category.color : 'text-gray-500'
                )}>
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Pin Info or Placeholder */}
        {selectedPin ? (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <span>Selected:</span>
              <span className="font-medium text-gray-700">{selectedPin.name}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Pin Details Card - only shown when a pin is selected */}
      {selectedPin && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Pin Details</h3>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Pin header */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Pin Details</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Pin</span>
                  <span className="font-mono text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                    {selectedPin.gpio !== null ? selectedPin.gpio : selectedPin.name}
                  </span>
                  <span className="text-xs text-gray-500">Type</span>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    getPinTypeColor(selectedPin)
                  )}>
                    {getPinTypeLabel(selectedPin)}
                  </span>
                </div>
              </div>
            </div>

            {/* Names/Aliases */}
            {selectedPin.aliases.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3 h-3 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Names</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedPin.aliases.map((alias) => (
                    <span
                      key={alias}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Capabilities */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">Capabilities</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedPin.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selectedPin.strapping && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-amber-700">
                  <Info className="w-3 h-3" />
                  <span className="text-xs font-medium">Strapping Pin</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  This is a strapping pin. Its state at boot affects chip behavior.
                </p>
              </div>
            )}

            {selectedPin.capabilities.includes('INPUT_ONLY') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-blue-700">
                  <Info className="w-3 h-3" />
                  <span className="text-xs font-medium">Input Only</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  This pin can only be used as an input.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Board Information Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Board Information</h3>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            {board.description}
          </p>
        </div>

        {/* Microcontroller */}
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{board.microcontroller}</div>
              <div className="text-xs text-gray-500">Main processing unit</div>
            </div>
            <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              View Details
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Technical Specifications</h3>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Clock Speed */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Clock Speed</div>
              <div className="text-sm font-medium text-gray-900">{board.clockSpeed}</div>
            </div>
          </div>

          {/* Power Requirements */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-600 mb-2">Power Requirements</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Operating Voltage</div>
                <div className="text-sm font-semibold text-gray-900">{board.voltage}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Flash Size</div>
                <div className="text-sm font-semibold text-gray-900">{board.flashSize}</div>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-600 mb-2">Memory</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">RAM</div>
                <div className="text-sm font-semibold text-gray-900">{board.ram}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Manufacturer</div>
                <div className="text-sm font-semibold text-gray-900">{board.manufacturer}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoardInfoPanel;
