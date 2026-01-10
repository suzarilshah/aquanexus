import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, virtualDeviceConfig } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VirtualESP32 } from '@/components/simulator/virtual-esp32';
import { Cpu, ExternalLink, Fish, Leaf, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

async function getDevicesForSimulator(userId: string) {
  const userDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId));

  // Check if virtual devices are enabled in Settings
  const virtualConfig = await db
    .select()
    .from(virtualDeviceConfig)
    .where(and(
      eq(virtualDeviceConfig.userId, userId),
      eq(virtualDeviceConfig.enabled, true)
    ))
    .limit(1);

  const isVirtualEnabled = virtualConfig.length > 0;
  const virtualFishId = virtualConfig[0]?.fishDeviceId;
  const virtualPlantId = virtualConfig[0]?.plantDeviceId;

  const fishDevice = userDevices.find((d) => d.deviceType === 'fish');
  const plantDevice = userDevices.find((d) => d.deviceType === 'plant');

  // Check if the simulator would send to the same devices as cron
  const wouldConflict = isVirtualEnabled && (
    (fishDevice && virtualFishId === fishDevice.id) ||
    (plantDevice && virtualPlantId === plantDevice.id)
  );

  return {
    fishDevice: fishDevice
      ? { apiKey: fishDevice.apiKey, deviceMac: fishDevice.deviceMac }
      : undefined,
    plantDevice: plantDevice
      ? { apiKey: plantDevice.apiKey, deviceMac: plantDevice.deviceMac }
      : undefined,
    fishDeviceName: fishDevice?.deviceName,
    plantDeviceName: plantDevice?.deviceName,
    isVirtualEnabled,
    wouldConflict,
  };
}

export default async function SimulatorPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const { fishDevice, plantDevice, fishDeviceName, plantDeviceName, isVirtualEnabled, wouldConflict } =
    await getDevicesForSimulator(session.userId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Virtual ESP32 Simulator</h1>
          <p className="mt-1 text-sm text-gray-500">
            Stream training data to test real-time dashboard updates
          </p>
        </div>
      </div>

      {/* Warning Banner - Virtual Devices Already Enabled */}
      {isVirtualEnabled && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-800">
                  Virtual Devices Already Active in Settings
                </p>
                <p className="text-sm text-amber-700">
                  You have virtual ESP32 devices enabled in Settings with automatic cron-based streaming.
                  {wouldConflict && (
                    <span className="font-medium"> Running this simulator may cause duplicate or conflicting data.</span>
                  )}
                </p>
                <div className="flex gap-3 mt-2">
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
                  >
                    Go to Settings
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-xs text-amber-600 self-center">
                    Disable virtual devices there to use this simulator instead
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                This simulator acts as a virtual ESP32, sending sensor readings from CSV training
                data to your telemetry API. Data will appear in real-time on your dashboards.
              </p>
              <p className="text-xs text-gray-500">
                <strong>Note:</strong> This browser-based simulator only runs while this page is open.
                For persistent streaming, use the Virtual ESP32 settings in the Settings page.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/dashboard/fish"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Fish className="h-4 w-4" />
                  View Fish Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="/dashboard/plants"
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                >
                  <Leaf className="h-4 w-4" />
                  View Plant Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={fishDevice ? 'border-blue-200' : 'border-gray-200 opacity-60'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Fish className="h-5 w-5 text-blue-500" />
              Fish Device
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fishDevice ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{fishDeviceName}</p>
                <p className="text-xs text-gray-500 font-mono">{fishDevice.deviceMac}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600">Ready for simulation</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">No fish device registered</p>
                <a
                  href="/dashboard/devices"
                  className="inline-flex items-center text-xs text-blue-600 hover:underline"
                >
                  Register a device
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={plantDevice ? 'border-green-200' : 'border-gray-200 opacity-60'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-500" />
              Plant Device
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plantDevice ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{plantDeviceName}</p>
                <p className="text-xs text-gray-500 font-mono">{plantDevice.deviceMac}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600">Ready for simulation</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">No plant device registered</p>
                <a
                  href="/dashboard/devices"
                  className="inline-flex items-center text-xs text-green-600 hover:underline"
                >
                  Register a device
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Virtual ESP32 Component */}
      <VirtualESP32 fishDevice={fishDevice} plantDevice={plantDevice} />
    </div>
  );
}
