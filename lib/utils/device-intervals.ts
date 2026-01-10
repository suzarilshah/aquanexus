/**
 * Device Reading Interval Utilities
 *
 * Defines reading interval options for different device types.
 * Virtual devices use a fixed 5-hour interval to match the CSV dataset timing.
 */

// 5 hours in seconds (matches CSV dataset ~5-hour intervals)
export const VIRTUAL_DEVICE_INTERVAL = 18000;

// Default interval for physical devices (5 minutes)
export const DEFAULT_DEVICE_INTERVAL = 300;

// Available interval options for physical devices
export const PHYSICAL_DEVICE_INTERVALS = [
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
] as const;

/**
 * Check if a device is virtual based on its MAC address
 */
export function isVirtualDevice(deviceMac: string): boolean {
  return deviceMac.startsWith('VIRTUAL:');
}

/**
 * Get the appropriate reading interval for a device
 */
export function getDeviceInterval(deviceMac: string): number {
  return isVirtualDevice(deviceMac) ? VIRTUAL_DEVICE_INTERVAL : DEFAULT_DEVICE_INTERVAL;
}

/**
 * Format a reading interval for display
 * Returns human-readable string like "5 hours" or "5 minutes"
 */
export function formatReadingInterval(seconds: number): string {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }
  return `${seconds} seconds`;
}

/**
 * Get the interval label for display in a select dropdown
 */
export function getIntervalLabel(seconds: number): string {
  // Check if it's the virtual device interval
  if (seconds === VIRTUAL_DEVICE_INTERVAL) {
    return '5 hours (Virtual Device)';
  }

  // Find matching preset
  const preset = PHYSICAL_DEVICE_INTERVALS.find(p => p.value === seconds);
  if (preset) {
    return preset.label;
  }

  return formatReadingInterval(seconds);
}
