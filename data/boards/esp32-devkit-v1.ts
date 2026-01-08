// ESP32 DevKit V1 Pinout Data
// Based on tasnimzotder/pinouts architecture

export interface PinDefinition {
  id: string;
  gpio: number | null;
  name: string;
  aliases: string[];
  x: number;
  y: number;
  side: 'left' | 'right';
  capabilities: PinCapability[];
  voltage?: number;
  adcChannel?: number;
  touchChannel?: number;
  bootMode?: boolean;
  strapping?: boolean;
}

export type PinCapability =
  | 'GPIO'
  | 'ADC'
  | 'DAC'
  | 'PWM'
  | 'I2C_SDA'
  | 'I2C_SCL'
  | 'SPI_MOSI'
  | 'SPI_MISO'
  | 'SPI_CLK'
  | 'SPI_CS'
  | 'UART_TX'
  | 'UART_RX'
  | 'TOUCH'
  | 'RTC'
  | 'POWER'
  | 'GND'
  | 'EN'
  | 'INPUT_ONLY'
  | 'JTAG';

export interface BoardDefinition {
  id: string;
  name: string;
  manufacturer: string;
  description: string;
  microcontroller: string;
  flashSize: string;
  ram: string;
  clockSpeed: string;
  voltage: string;
  dimensions: {
    width: number;
    height: number;
    boardWidth: number;
    boardHeight: number;
  };
  pinSpacing: number;
  pins: PinDefinition[];
  defaultI2C: { sda: number; scl: number };
  defaultSPI: { mosi: number; miso: number; clk: number; cs: number };
  defaultUART: { tx: number; rx: number };
  fqbn: string;
  platform: string;
  bootloaderOffset: number;
  partitionOffset: number;
  appOffset: number;
}

export const ESP32_DEVKIT_V1: BoardDefinition = {
  id: 'esp32-devkit-v1',
  name: 'ESP32 DevKit V1',
  manufacturer: 'Espressif',
  description: 'ESP32 Development Board with CP2102 USB-UART',
  microcontroller: 'ESP32-WROOM-32',
  flashSize: '4MB',
  ram: '520KB SRAM',
  clockSpeed: '240MHz',
  voltage: '3.3V',
  dimensions: {
    width: 400,
    height: 600,
    boardWidth: 28,
    boardHeight: 55,
  },
  pinSpacing: 20,
  defaultI2C: { sda: 21, scl: 22 },
  defaultSPI: { mosi: 23, miso: 19, clk: 18, cs: 5 },
  defaultUART: { tx: 1, rx: 3 },
  fqbn: 'esp32:esp32:esp32',
  platform: 'esp32:esp32',
  bootloaderOffset: 0x1000,
  partitionOffset: 0x8000,
  appOffset: 0x10000,
  pins: [
    // Left side (top to bottom)
    {
      id: 'EN',
      gpio: null,
      name: 'EN',
      aliases: ['CHIP_PU', 'RESET'],
      x: 40,
      y: 60,
      side: 'left',
      capabilities: ['EN'],
    },
    {
      id: 'GPIO36',
      gpio: 36,
      name: 'GPIO36',
      aliases: ['VP', 'SENSOR_VP', 'ADC1_CH0'],
      x: 40,
      y: 80,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'RTC', 'INPUT_ONLY'],
      adcChannel: 0,
    },
    {
      id: 'GPIO39',
      gpio: 39,
      name: 'GPIO39',
      aliases: ['VN', 'SENSOR_VN', 'ADC1_CH3'],
      x: 40,
      y: 100,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'RTC', 'INPUT_ONLY'],
      adcChannel: 3,
    },
    {
      id: 'GPIO34',
      gpio: 34,
      name: 'GPIO34',
      aliases: ['ADC1_CH6'],
      x: 40,
      y: 120,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'RTC', 'INPUT_ONLY'],
      adcChannel: 6,
    },
    {
      id: 'GPIO35',
      gpio: 35,
      name: 'GPIO35',
      aliases: ['ADC1_CH7'],
      x: 40,
      y: 140,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'RTC', 'INPUT_ONLY'],
      adcChannel: 7,
    },
    {
      id: 'GPIO32',
      gpio: 32,
      name: 'GPIO32',
      aliases: ['ADC1_CH4', 'TOUCH9', 'XTAL_32K_P'],
      x: 40,
      y: 160,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'RTC'],
      adcChannel: 4,
      touchChannel: 9,
    },
    {
      id: 'GPIO33',
      gpio: 33,
      name: 'GPIO33',
      aliases: ['ADC1_CH5', 'TOUCH8', 'XTAL_32K_N'],
      x: 40,
      y: 180,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'RTC'],
      adcChannel: 5,
      touchChannel: 8,
    },
    {
      id: 'GPIO25',
      gpio: 25,
      name: 'GPIO25',
      aliases: ['ADC2_CH8', 'DAC1'],
      x: 40,
      y: 200,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'DAC', 'PWM', 'RTC'],
      adcChannel: 8,
    },
    {
      id: 'GPIO26',
      gpio: 26,
      name: 'GPIO26',
      aliases: ['ADC2_CH9', 'DAC2'],
      x: 40,
      y: 220,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'DAC', 'PWM', 'RTC'],
      adcChannel: 9,
    },
    {
      id: 'GPIO27',
      gpio: 27,
      name: 'GPIO27',
      aliases: ['ADC2_CH7', 'TOUCH7'],
      x: 40,
      y: 240,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'RTC'],
      adcChannel: 7,
      touchChannel: 7,
    },
    {
      id: 'GPIO14',
      gpio: 14,
      name: 'GPIO14',
      aliases: ['ADC2_CH6', 'TOUCH6', 'HSPI_CLK', 'MTMS'],
      x: 40,
      y: 260,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'SPI_CLK', 'JTAG', 'RTC'],
      adcChannel: 6,
      touchChannel: 6,
    },
    {
      id: 'GPIO12',
      gpio: 12,
      name: 'GPIO12',
      aliases: ['ADC2_CH5', 'TOUCH5', 'HSPI_MISO', 'MTDI'],
      x: 40,
      y: 280,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'SPI_MISO', 'JTAG', 'RTC'],
      adcChannel: 5,
      touchChannel: 5,
      strapping: true,
      bootMode: true,
    },
    {
      id: 'GND1',
      gpio: null,
      name: 'GND',
      aliases: ['GROUND'],
      x: 40,
      y: 300,
      side: 'left',
      capabilities: ['GND'],
    },
    {
      id: 'GPIO13',
      gpio: 13,
      name: 'GPIO13',
      aliases: ['ADC2_CH4', 'TOUCH4', 'HSPI_MOSI', 'MTCK'],
      x: 40,
      y: 320,
      side: 'left',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'SPI_MOSI', 'JTAG', 'RTC'],
      adcChannel: 4,
      touchChannel: 4,
    },
    {
      id: 'GPIO9',
      gpio: 9,
      name: 'SD2',
      aliases: ['GPIO9', 'SD_DATA2', 'SPIHD', 'HS1_DATA2', 'U1RXD'],
      x: 40,
      y: 340,
      side: 'left',
      capabilities: ['GPIO'],
    },
    {
      id: 'GPIO10',
      gpio: 10,
      name: 'SD3',
      aliases: ['GPIO10', 'SD_DATA3', 'SPIWP', 'HS1_DATA3', 'U1TXD'],
      x: 40,
      y: 360,
      side: 'left',
      capabilities: ['GPIO'],
    },
    {
      id: 'GPIO11',
      gpio: 11,
      name: 'CMD',
      aliases: ['GPIO11', 'SD_CMD', 'SPICS0', 'HS1_CMD', 'U1RTS'],
      x: 40,
      y: 380,
      side: 'left',
      capabilities: ['GPIO'],
    },
    {
      id: '5V',
      gpio: null,
      name: '5V',
      aliases: ['VIN', 'USB_5V'],
      x: 40,
      y: 400,
      side: 'left',
      capabilities: ['POWER'],
      voltage: 5,
    },

    // Right side (top to bottom)
    {
      id: 'GPIO23',
      gpio: 23,
      name: 'GPIO23',
      aliases: ['VSPI_MOSI', 'HS1_STROBE'],
      x: 360,
      y: 60,
      side: 'right',
      capabilities: ['GPIO', 'PWM', 'SPI_MOSI'],
    },
    {
      id: 'GPIO22',
      gpio: 22,
      name: 'GPIO22',
      aliases: ['VSPI_WP', 'U0RTS', 'I2C_SCL'],
      x: 360,
      y: 80,
      side: 'right',
      capabilities: ['GPIO', 'PWM', 'I2C_SCL'],
    },
    {
      id: 'GPIO1',
      gpio: 1,
      name: 'TX0',
      aliases: ['GPIO1', 'U0TXD', 'CLK_OUT3'],
      x: 360,
      y: 100,
      side: 'right',
      capabilities: ['GPIO', 'UART_TX'],
    },
    {
      id: 'GPIO3',
      gpio: 3,
      name: 'RX0',
      aliases: ['GPIO3', 'U0RXD', 'CLK_OUT2'],
      x: 360,
      y: 120,
      side: 'right',
      capabilities: ['GPIO', 'UART_RX'],
    },
    {
      id: 'GPIO21',
      gpio: 21,
      name: 'GPIO21',
      aliases: ['VSPI_HD', 'I2C_SDA'],
      x: 360,
      y: 140,
      side: 'right',
      capabilities: ['GPIO', 'PWM', 'I2C_SDA'],
    },
    {
      id: 'GND2',
      gpio: null,
      name: 'GND',
      aliases: ['GROUND'],
      x: 360,
      y: 160,
      side: 'right',
      capabilities: ['GND'],
    },
    {
      id: 'GPIO19',
      gpio: 19,
      name: 'GPIO19',
      aliases: ['VSPI_MISO', 'U0CTS'],
      x: 360,
      y: 180,
      side: 'right',
      capabilities: ['GPIO', 'PWM', 'SPI_MISO'],
    },
    {
      id: 'GPIO18',
      gpio: 18,
      name: 'GPIO18',
      aliases: ['VSPI_CLK', 'HS1_DATA7'],
      x: 360,
      y: 200,
      side: 'right',
      capabilities: ['GPIO', 'PWM', 'SPI_CLK'],
    },
    {
      id: 'GPIO5',
      gpio: 5,
      name: 'GPIO5',
      aliases: ['VSPI_CS0', 'HS1_DATA6'],
      x: 360,
      y: 220,
      side: 'right',
      capabilities: ['GPIO', 'PWM', 'SPI_CS'],
      strapping: true,
    },
    {
      id: 'GPIO17',
      gpio: 17,
      name: 'GPIO17',
      aliases: ['HS1_DATA5', 'U2TXD'],
      x: 360,
      y: 240,
      side: 'right',
      capabilities: ['GPIO', 'PWM', 'UART_TX'],
    },
    {
      id: 'GPIO16',
      gpio: 16,
      name: 'GPIO16',
      aliases: ['HS1_DATA4', 'U2RXD'],
      x: 360,
      y: 260,
      side: 'right',
      capabilities: ['GPIO', 'PWM', 'UART_RX'],
    },
    {
      id: 'GPIO4',
      gpio: 4,
      name: 'GPIO4',
      aliases: ['ADC2_CH0', 'TOUCH0', 'HSPI_HD'],
      x: 360,
      y: 280,
      side: 'right',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'RTC'],
      adcChannel: 0,
      touchChannel: 0,
    },
    {
      id: 'GPIO0',
      gpio: 0,
      name: 'GPIO0',
      aliases: ['ADC2_CH1', 'TOUCH1', 'CLK_OUT1'],
      x: 360,
      y: 300,
      side: 'right',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'RTC'],
      adcChannel: 1,
      touchChannel: 1,
      strapping: true,
      bootMode: true,
    },
    {
      id: 'GPIO2',
      gpio: 2,
      name: 'GPIO2',
      aliases: ['ADC2_CH2', 'TOUCH2', 'HSPI_WP', 'LED'],
      x: 360,
      y: 320,
      side: 'right',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'RTC'],
      adcChannel: 2,
      touchChannel: 2,
      strapping: true,
    },
    {
      id: 'GPIO15',
      gpio: 15,
      name: 'GPIO15',
      aliases: ['ADC2_CH3', 'TOUCH3', 'HSPI_CS0', 'MTDO'],
      x: 360,
      y: 340,
      side: 'right',
      capabilities: ['GPIO', 'ADC', 'PWM', 'TOUCH', 'SPI_CS', 'JTAG', 'RTC'],
      adcChannel: 3,
      touchChannel: 3,
      strapping: true,
    },
    {
      id: 'GPIO8',
      gpio: 8,
      name: 'SD1',
      aliases: ['GPIO8', 'SD_DATA1', 'SPID', 'HS1_DATA1', 'U2CTS'],
      x: 360,
      y: 360,
      side: 'right',
      capabilities: ['GPIO'],
    },
    {
      id: 'GPIO7',
      gpio: 7,
      name: 'SD0',
      aliases: ['GPIO7', 'SD_DATA0', 'SPIQ', 'HS1_DATA0', 'U2RTS'],
      x: 360,
      y: 380,
      side: 'right',
      capabilities: ['GPIO'],
    },
    {
      id: 'CLK',
      gpio: 6,
      name: 'CLK',
      aliases: ['GPIO6', 'SD_CLK', 'SPICLK', 'HS1_CLK', 'U1CTS'],
      x: 360,
      y: 400,
      side: 'right',
      capabilities: ['GPIO'],
    },
    {
      id: 'GND3',
      gpio: null,
      name: 'GND',
      aliases: ['GROUND'],
      x: 360,
      y: 420,
      side: 'right',
      capabilities: ['GND'],
    },
    {
      id: '3V3',
      gpio: null,
      name: '3.3V',
      aliases: ['3V3', 'VCC'],
      x: 360,
      y: 440,
      side: 'right',
      capabilities: ['POWER'],
      voltage: 3.3,
    },
  ],
};

// Helper functions
export function getPinByGPIO(board: BoardDefinition, gpio: number): PinDefinition | undefined {
  return board.pins.find((pin) => pin.gpio === gpio);
}

export function getPinsByCapability(board: BoardDefinition, capability: PinCapability): PinDefinition[] {
  return board.pins.filter((pin) => pin.capabilities.includes(capability));
}

export function getAvailableGPIOPins(board: BoardDefinition): PinDefinition[] {
  return board.pins.filter((pin) => pin.gpio !== null && pin.capabilities.includes('GPIO'));
}

export function getADCPins(board: BoardDefinition): PinDefinition[] {
  return board.pins.filter((pin) => pin.capabilities.includes('ADC'));
}

export function getI2CPins(board: BoardDefinition): { sda: PinDefinition[]; scl: PinDefinition[] } {
  return {
    sda: board.pins.filter((pin) => pin.capabilities.includes('I2C_SDA')),
    scl: board.pins.filter((pin) => pin.capabilities.includes('I2C_SCL')),
  };
}

export function getSPIPins(board: BoardDefinition): {
  mosi: PinDefinition[];
  miso: PinDefinition[];
  clk: PinDefinition[];
  cs: PinDefinition[];
} {
  return {
    mosi: board.pins.filter((pin) => pin.capabilities.includes('SPI_MOSI')),
    miso: board.pins.filter((pin) => pin.capabilities.includes('SPI_MISO')),
    clk: board.pins.filter((pin) => pin.capabilities.includes('SPI_CLK')),
    cs: board.pins.filter((pin) => pin.capabilities.includes('SPI_CS')),
  };
}

export function isPinSafeForOutput(pin: PinDefinition): boolean {
  // Pins that should be used with caution
  if (pin.strapping || pin.bootMode) return false;
  if (pin.capabilities.includes('INPUT_ONLY')) return false;
  return pin.gpio !== null;
}
