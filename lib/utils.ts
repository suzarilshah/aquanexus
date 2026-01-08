import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'aq_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getSensorStatus(
  value: number,
  min: number,
  max: number
): 'normal' | 'warning' | 'critical' {
  if (value < min * 0.9 || value > max * 1.1) {
    return 'critical';
  } else if (value < min || value > max) {
    return 'warning';
  }
  return 'normal';
}

export function getStatusColor(status: 'online' | 'offline' | 'warning' | 'normal' | 'critical'): string {
  switch (status) {
    case 'online':
    case 'normal':
      return 'text-emerald-600 bg-emerald-50';
    case 'warning':
      return 'text-amber-600 bg-amber-50';
    case 'offline':
    case 'critical':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-slate-600 bg-slate-50';
  }
}
