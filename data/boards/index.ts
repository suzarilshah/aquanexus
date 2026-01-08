// Board definitions index
// Supports multiple boards: ESP32, ESP8266, Arduino, Raspberry Pi

import { ESP32_DEVKIT_V1, type BoardDefinition, type PinDefinition, type PinCapability } from './esp32-devkit-v1';

export type { BoardDefinition, PinDefinition, PinCapability };

export const BOARDS: Record<string, BoardDefinition> = {
  'esp32-devkit-v1': ESP32_DEVKIT_V1,
};

export const BOARD_LIST = [
  {
    id: 'esp32-devkit-v1',
    name: 'ESP32 DevKit V1',
    category: 'ESP32',
    description: 'Most popular ESP32 development board',
    image: '/boards/esp32-devkit-v1.svg',
    supported: true,
  },
  {
    id: 'esp32-wroom-32',
    name: 'ESP32-WROOM-32',
    category: 'ESP32',
    description: 'ESP32 module with integrated antenna',
    image: '/boards/esp32-wroom-32.svg',
    supported: false,
  },
  {
    id: 'nodemcu-esp8266',
    name: 'NodeMCU ESP8266',
    category: 'ESP8266',
    description: 'Popular WiFi development board',
    image: '/boards/nodemcu-esp8266.svg',
    supported: false,
  },
  {
    id: 'arduino-uno',
    name: 'Arduino UNO R3',
    category: 'Arduino',
    description: 'Classic Arduino board for beginners',
    image: '/boards/arduino-uno.svg',
    supported: false,
  },
  {
    id: 'raspberry-pi-pico',
    name: 'Raspberry Pi Pico',
    category: 'Raspberry Pi',
    description: 'RP2040 microcontroller board',
    image: '/boards/raspberry-pi-pico.svg',
    supported: false,
  },
  {
    id: 'raspberry-pi-zero-w',
    name: 'Raspberry Pi Zero W',
    category: 'Raspberry Pi',
    description: 'Compact single-board computer with WiFi',
    image: '/boards/raspberry-pi-zero-w.svg',
    supported: false,
  },
];

export function getBoard(boardId: string): BoardDefinition | undefined {
  return BOARDS[boardId];
}

export function getSupportedBoards() {
  return BOARD_LIST.filter((b) => b.supported);
}

export function getBoardsByCategory(category: string) {
  return BOARD_LIST.filter((b) => b.category === category);
}
