'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Cpu, Fish, Leaf, MoreVertical, Trash2, Settings, Eye, Copy, Radio, AlertTriangle, Loader2 } from 'lucide-react';
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
          // Build detailed error message
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

      // Success - close dialog and refresh
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {devices.map((device) => {
        const isVirtual = device.deviceMac.startsWith('VIRTUAL:');

        return (
        <div
          key={device.id}
          className={cn(
            "relative bg-white rounded-xl border p-5 hover:shadow-lg transition-all duration-200",
            isVirtual
              ? "border-purple-200 bg-gradient-to-br from-white to-purple-50/30"
              : "border-gray-200"
          )}
        >
          {/* Virtual Badge */}
          {isVirtual && (
            <div className="absolute -top-2 -right-2 z-10">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg">
                <Radio className="h-3 w-3" />
                Virtual
              </span>
            </div>
          )}

          {/* Device Header */}
          <div className="flex items-start justify-between">
            <Link
              href={`/dashboard/devices/${device.id}`}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl',
                  isVirtual
                    ? 'bg-gradient-to-br from-purple-100 to-indigo-100'
                    : device.deviceType === 'fish'
                      ? 'bg-gradient-to-br from-cyan-100 to-blue-100'
                      : 'bg-gradient-to-br from-green-100 to-emerald-100'
                )}
              >
                {isVirtual ? (
                  <Radio className="h-6 w-6 text-purple-600" />
                ) : device.deviceType === 'fish' ? (
                  <Fish className="h-6 w-6 text-cyan-600" />
                ) : (
                  <Leaf className="h-6 w-6 text-green-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{device.deviceName}</h3>
                <p className="text-xs text-gray-500 font-mono">{device.deviceMac}</p>
              </div>
            </Link>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  device.status === 'online' && 'bg-emerald-50 text-emerald-700',
                  device.status === 'offline' && 'bg-gray-100 text-gray-600',
                  device.status === 'warning' && 'bg-amber-50 text-amber-700'
                )}
              >
                <span
                  className={cn(
                    'mr-1.5 h-1.5 w-1.5 rounded-full',
                    device.status === 'online' && 'bg-emerald-500',
                    device.status === 'offline' && 'bg-gray-400',
                    device.status === 'warning' && 'bg-amber-500'
                  )}
                />
                {device.status}
              </span>

              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setOpenMenu(openMenu === device.id ? null : device.id)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
                {openMenu === device.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenu(null)}
                    />
                    <div className="absolute right-0 z-20 mt-1 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                      <Link
                        href={`/dashboard/devices/${device.id}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Eye className="mr-3 h-4 w-4" />
                        View Details
                      </Link>
                      <button
                        onClick={() => copyApiKey(device.apiKey, device.id)}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Copy className="mr-3 h-4 w-4" />
                        {copiedId === device.id ? 'Copied!' : 'Copy API Key'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteClick(device);
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-3 h-4 w-4" />
                        Delete Device
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Device Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Readings</p>
              <p className="text-sm font-medium text-gray-900">{device.readingCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Interval</p>
              <p className="text-sm font-medium text-gray-900">{device.readingInterval}s</p>
            </div>
          </div>

          {/* Last Seen */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Last seen</span>
              <span className="font-medium text-gray-700" suppressHydrationWarning>{formatLastSeen(device.lastSeen)}</span>
            </div>
          </div>

        </div>
        );
      })}

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            {deleteError?.code === 'VIRTUAL_DEVICE_ACTIVE' ? (
              <>
                {/* Virtual Device Warning */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Virtual Device Active</h3>
                    <p className="text-sm text-gray-500">{deleteDialog.deviceName}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  {deleteError.message}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteDialog(null)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setDeleteDialog(null)}
                    className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-purple-700"
                  >
                    Go to Settings
                  </Link>
                </div>
              </>
            ) : (
              <>
                {/* Normal Delete Confirmation */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Device</h3>
                    <p className="text-sm text-gray-500">{deleteDialog.deviceName}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to delete this device? This action will also delete:
                </p>
                <ul className="text-sm text-gray-500 mb-4 ml-4 list-disc">
                  <li>All sensor readings ({deleteDialog.readingCount.toLocaleString()} records)</li>
                  <li>All predictions and alerts</li>
                  <li>Associated growth data</li>
                </ul>
                <p className="text-sm font-medium text-red-600 mb-6">
                  This action cannot be undone.
                </p>

                {deleteError && !deleteError.code && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm font-medium text-red-700 mb-1">Error deleting device</p>
                    <p className="text-sm text-red-600">{deleteError.message}</p>
                    {deleteError.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-500 cursor-pointer hover:underline">
                          Show technical details
                        </summary>
                        <pre className="mt-1 text-xs text-red-400 bg-red-100 p-2 rounded overflow-x-auto">
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
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
    </div>
  );
}
