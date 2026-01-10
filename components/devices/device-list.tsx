'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Cpu,
  Fish,
  Leaf,
  MoreVertical,
  Trash2,
  Eye,
  Copy,
  Radio,
  AlertTriangle,
  Loader2,
  Zap,
  TrendingUp,
  Clock,
  Waves,
  Droplets,
  Thermometer,
  ChevronRight,
} from 'lucide-react';
import { formatReadingInterval } from '@/lib/utils/device-intervals';
import Link from 'next/link';

interface Device {
  id: string;
  deviceMac: string;
  deviceName: string;
  deviceType: 'fish' | 'plant';
  status: 'online' | 'offline' | 'warning';
  lastSeen: Date | null;
  readingInterval: number;
  createdAt: Date;
  apiKey: string;
  readingCount: number;
}

interface DeviceListProps {
  devices: Device[];
}

export function DeviceList({ devices }: DeviceListProps) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<{ code?: string; message: string; details?: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const copyApiKey = async (apiKey: string, deviceId: string) => {
    await navigator.clipboard.writeText(apiKey);
    setCopiedId(deviceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteClick = (device: Device) => {
    setOpenMenu(null);
    setDeleteError(null);
    setDeleteDialog(device);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/devices/${deleteDialog.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'VIRTUAL_DEVICE_ACTIVE') {
          setDeleteError({
            code: data.code,
            message: data.message,
          });
        } else {
          let errorDetails = '';
          if (data.details) {
            errorDetails += `Error: ${data.details}\n`;
          }
          if (data.deletionLog && data.deletionLog.length > 0) {
            errorDetails += `\nCompleted steps:\n${data.deletionLog.map((s: string) => `  - ${s}`).join('\n')}`;
          }
          if (data.hint) {
            errorDetails += `\n\nHint: ${data.hint}`;
          }

          setDeleteError({
            message: data.error || 'Failed to delete device. Please try again.',
            details: errorDetails || undefined,
          });
        }
        return;
      }

      setDeleteDialog(null);
      router.refresh();
    } catch (error) {
      setDeleteError({
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatLastSeen = (lastSeen: Date | null) => {
    if (!lastSeen) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {devices.map((device, index) => {
          const isVirtual = device.deviceMac.startsWith('VIRTUAL:');

          return (
            <div
              key={device.id}
              className={cn(
                'group relative overflow-hidden rounded-2xl transition-all duration-500',
                'hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]',
                'transform hover:-translate-y-1',
                mounted && 'animate-fade-in-up',
                isVirtual
                  ? 'bg-gradient-to-br from-slate-900 via-purple-900/90 to-slate-900'
                  : 'bg-white border border-gray-100'
              )}
              style={{
                animationDelay: mounted ? `${index * 0.08}s` : '0s',
              }}
            >
              {/* Animated background patterns */}
              {isVirtual && (
                <>
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-400 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-400 via-transparent to-transparent" />
                  </div>
                  {/* Animated grid lines */}
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                      backgroundSize: '32px 32px',
                    }}
                  />
                </>
              )}

              {/* Content Container */}
              <div className={cn('relative p-5', isVirtual ? 'text-white' : '')}>
                {/* Virtual Badge */}
                {isVirtual && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/25">
                      <Radio className="h-3 w-3 animate-pulse" />
                      Virtual
                    </span>
                  </div>
                )}

                {/* Device Header */}
                <div className="flex items-start gap-4">
                  {/* Device Icon with animated ring */}
                  <div className="relative">
                    <div
                      className={cn(
                        'relative flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110',
                        isVirtual
                          ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 backdrop-blur-sm border border-white/10'
                          : device.deviceType === 'fish'
                            ? 'bg-gradient-to-br from-cyan-50 to-blue-100 border border-cyan-100'
                            : 'bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-100'
                      )}
                    >
                      {isVirtual ? (
                        <Cpu className="h-7 w-7 text-purple-300" />
                      ) : device.deviceType === 'fish' ? (
                        <Fish className="h-7 w-7 text-cyan-600" />
                      ) : (
                        <Leaf className="h-7 w-7 text-emerald-600" />
                      )}
                    </div>

                    {/* Status indicator with glow */}
                    <div
                      className={cn(
                        'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 transition-all duration-300',
                        isVirtual ? 'border-slate-900' : 'border-white',
                        device.status === 'online' && 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]',
                        device.status === 'offline' && 'bg-gray-400',
                        device.status === 'warning' && 'bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                      )}
                    />
                  </div>

                  {/* Device Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/devices/${device.id}`}
                      className="block group/link"
                    >
                      <h3 className={cn(
                        'font-semibold text-lg truncate transition-colors duration-200',
                        isVirtual
                          ? 'text-white group-hover/link:text-purple-300'
                          : 'text-gray-900 group-hover/link:text-blue-600'
                      )}>
                        {device.deviceName}
                      </h3>
                      <p className={cn(
                        'text-xs font-mono truncate mt-0.5',
                        isVirtual ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        {device.deviceMac}
                      </p>
                    </Link>

                    {/* Status text */}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
                          device.status === 'online' && (isVirtual ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'),
                          device.status === 'offline' && (isVirtual ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600'),
                          device.status === 'warning' && (isVirtual ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700')
                        )}
                      >
                        {device.status}
                      </span>
                      <span className={cn(
                        'text-[10px]',
                        isVirtual ? 'text-gray-500' : 'text-gray-400'
                      )} suppressHydrationWarning>
                        {formatLastSeen(device.lastSeen)}
                      </span>
                    </div>
                  </div>

                  {/* Menu Button */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === device.id ? null : device.id)}
                      className={cn(
                        'p-2 rounded-xl transition-all duration-200',
                        isVirtual
                          ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                          : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                      )}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {openMenu === device.id && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setOpenMenu(null)}
                        />
                        <div className={cn(
                          'absolute right-0 z-40 mt-2 w-52 rounded-xl py-1.5 shadow-xl ring-1 animate-scale-in',
                          isVirtual
                            ? 'bg-slate-800 ring-white/10'
                            : 'bg-white ring-black/5'
                        )}>
                          <Link
                            href={`/dashboard/devices/${device.id}`}
                            className={cn(
                              'flex items-center px-4 py-2.5 text-sm transition-colors',
                              isVirtual
                                ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            )}
                          >
                            <Eye className="mr-3 h-4 w-4" />
                            View Details
                            <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                          </Link>
                          <button
                            onClick={() => copyApiKey(device.apiKey, device.id)}
                            className={cn(
                              'flex w-full items-center px-4 py-2.5 text-sm transition-colors',
                              isVirtual
                                ? 'text-gray-300 hover:bg-white/5 hover:text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            )}
                          >
                            <Copy className="mr-3 h-4 w-4" />
                            {copiedId === device.id ? (
                              <span className="text-emerald-500">Copied!</span>
                            ) : (
                              'Copy API Key'
                            )}
                          </button>
                          <div className={cn(
                            'my-1.5 mx-3 h-px',
                            isVirtual ? 'bg-white/10' : 'bg-gray-100'
                          )} />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteClick(device);
                            }}
                            className={cn(
                              'flex w-full items-center px-4 py-2.5 text-sm transition-colors',
                              isVirtual
                                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                : 'text-red-600 hover:bg-red-50'
                            )}
                          >
                            <Trash2 className="mr-3 h-4 w-4" />
                            Delete Device
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className={cn(
                  'grid grid-cols-3 gap-3 mt-5 pt-5 border-t',
                  isVirtual ? 'border-white/10' : 'border-gray-100'
                )}>
                  <div className="text-center">
                    <div className={cn(
                      'flex items-center justify-center gap-1 text-xs mb-1',
                      isVirtual ? 'text-gray-500' : 'text-gray-400'
                    )}>
                      <TrendingUp className="h-3 w-3" />
                      Readings
                    </div>
                    <p className={cn(
                      'text-sm font-bold tabular-nums',
                      isVirtual ? 'text-white' : 'text-gray-900'
                    )}>
                      {device.readingCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className={cn(
                      'flex items-center justify-center gap-1 text-xs mb-1',
                      isVirtual ? 'text-gray-500' : 'text-gray-400'
                    )}>
                      <Clock className="h-3 w-3" />
                      Interval
                    </div>
                    <p className={cn(
                      'text-sm font-bold',
                      isVirtual ? 'text-white' : 'text-gray-900'
                    )}>
                      {formatReadingInterval(device.readingInterval)}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className={cn(
                      'flex items-center justify-center gap-1 text-xs mb-1',
                      isVirtual ? 'text-gray-500' : 'text-gray-400'
                    )}>
                      <Zap className="h-3 w-3" />
                      Type
                    </div>
                    <p className={cn(
                      'text-sm font-bold capitalize',
                      isVirtual ? 'text-white' : 'text-gray-900'
                    )}>
                      {device.deviceType}
                    </p>
                  </div>
                </div>

                {/* Quick action - View dashboard link */}
                <Link
                  href={`/dashboard/devices/${device.id}`}
                  className={cn(
                    'flex items-center justify-center gap-2 mt-4 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300',
                    'transform group-hover:translate-x-0',
                    isVirtual
                      ? 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  )}
                >
                  <span>View Details</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div
            className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-in"
            style={{ animationDuration: '0.2s' }}
          >
            {deleteError?.code === 'VIRTUAL_DEVICE_ACTIVE' ? (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50">
                    <AlertTriangle className="h-7 w-7 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Virtual Device Active</h3>
                    <p className="text-sm text-gray-500">{deleteDialog.deviceName}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  {deleteError.message}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteDialog(null)}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setDeleteDialog(null)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25"
                  >
                    Go to Settings
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-100 to-red-50">
                    <Trash2 className="h-7 w-7 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Delete Device</h3>
                    <p className="text-sm text-gray-500">{deleteDialog.deviceName}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  Are you sure you want to delete this device? This action will also delete:
                </p>
                <ul className="text-sm text-gray-500 mb-4 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    All sensor readings ({deleteDialog.readingCount.toLocaleString()} records)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    All predictions and alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    Associated growth data
                  </li>
                </ul>
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 mb-6">
                  <p className="text-sm font-medium text-red-700">
                    This action cannot be undone.
                  </p>
                </div>

                {deleteError && !deleteError.code && (
                  <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-4">
                    <p className="text-sm font-semibold text-red-700 mb-1">Error deleting device</p>
                    <p className="text-sm text-red-600">{deleteError.message}</p>
                    {deleteError.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-500 cursor-pointer hover:underline">
                          Show technical details
                        </summary>
                        <pre className="mt-2 text-xs text-red-400 bg-red-100/50 p-3 rounded-lg overflow-x-auto">
                          {deleteError.details}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteDialog(null)}
                    disabled={isDeleting}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Device'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
