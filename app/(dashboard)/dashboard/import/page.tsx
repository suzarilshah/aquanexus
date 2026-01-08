import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataImportForm } from '@/components/import/data-import-form';
import Link from 'next/link';

async function getUserDevices(userId: string) {
  return db.select().from(devices).where(eq(devices.userId, userId));
}

export default async function DataImportPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const userDevices = await getUserDevices(session.userId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import historical sensor data from CSV files
        </p>
      </div>

      {/* No Devices Warning */}
      {userDevices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Devices Found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Register a device first to import data.
            </p>
            <Link
              href="/dashboard/devices"
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Add Device
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Import Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Select a device and upload a CSV file with sensor readings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataImportForm
                  devices={userDevices.map((d) => ({
                    id: d.id,
                    name: d.deviceName,
                    type: d.deviceType,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          {/* Format Guide */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CSV Format Guide</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Fish Tank Sensors</h4>
                  <code className="block text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                    timestamp,temperature,ph,dissolved_oxygen,turbidity,tds
                  </code>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Plant Environment</h4>
                  <code className="block text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                    timestamp,soil_moisture,light_level,temperature,humidity
                  </code>
                </div>
                <p className="text-xs text-gray-500">
                  Timestamps should be in ISO 8601 format (e.g., 2024-01-15T10:30:00Z)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sample Data</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href="/sample-fish-data.csv"
                  download
                  className="block w-full text-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 mb-2"
                >
                  Download Fish Sample
                </a>
                <a
                  href="/sample-plant-data.csv"
                  download
                  className="block w-full text-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download Plant Sample
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
