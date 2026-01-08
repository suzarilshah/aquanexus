import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices, aiAnalyses, aiConfig } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIAnalysisPanel } from '@/components/ai/analysis-panel';
import { AIAnalysisHistory } from '@/components/ai/analysis-history';
import Link from 'next/link';

async function getAIData(userId: string) {
  // Get user's devices
  const userDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId));

  // Get AI config
  const config = await db
    .select()
    .from(aiConfig)
    .where(eq(aiConfig.userId, userId))
    .limit(1);

  // Get recent analyses
  const recentAnalyses = await db
    .select({
      id: aiAnalyses.id,
      deviceId: aiAnalyses.deviceId,
      model1Verdict: aiAnalyses.model1Verdict,
      model2Verdict: aiAnalyses.model2Verdict,
      consensusVerdict: aiAnalyses.consensusVerdict,
      agreementScore: aiAnalyses.agreementScore,
      errorMargin: aiAnalyses.errorMargin,
      timeRange: aiAnalyses.timeRange,
      createdAt: aiAnalyses.createdAt,
    })
    .from(aiAnalyses)
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(10);

  const isConfigured = Boolean(config.length > 0 && config[0].model1Endpoint && config[0].model2Endpoint);

  return {
    devices: userDevices,
    isConfigured,
    analyses: recentAnalyses,
    config: config[0] || null,
  };
}

export default async function AIAnalysisPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const { devices: userDevices, isConfigured, analyses, config } = await getAIData(session.userId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Dual-model consensus analysis for your aquaponics system
        </p>
      </div>

      {/* Configuration Warning */}
      {!isConfigured && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-amber-400 mr-3 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-amber-800">AI Models Not Configured</h3>
              <p className="mt-1 text-sm text-amber-700">
                Configure your AI model endpoints in Settings to enable analysis.
              </p>
              <Link
                href="/dashboard/settings"
                className="mt-2 inline-block text-sm font-medium text-amber-800 underline hover:text-amber-900"
              >
                Go to Settings
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* No Devices Warning */}
      {userDevices.length === 0 && (
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
              Register a device first to run AI analysis on sensor data.
            </p>
            <Link
              href="/dashboard/devices"
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Add Device
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {userDevices.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Analysis Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Run Analysis</CardTitle>
                <CardDescription>
                  Select a device and time range to analyze sensor data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIAnalysisPanel
                  devices={userDevices.map((d) => ({
                    id: d.id,
                    name: d.deviceName,
                    type: d.deviceType,
                  }))}
                  isConfigured={isConfigured}
                />
              </CardContent>
            </Card>
          </div>

          {/* Model Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consensus System</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-3">
                <p>
                  Our dual-model system uses two AI models to analyze your data independently,
                  then calculates a consensus verdict.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Model 1: {config?.model1Name || 'GPT o3-mini'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>Model 2: {config?.model2Name || 'DeepSeek R1'}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Higher agreement scores indicate more reliable analysis.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Both models analyze your sensor data</li>
                  <li>Agreement score is calculated</li>
                  <li>Consensus verdict is generated</li>
                  <li>Recommendations are provided</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Analysis History */}
      {analyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis History</CardTitle>
            <CardDescription>Recent AI analyses across all devices</CardDescription>
          </CardHeader>
          <CardContent>
            <AIAnalysisHistory
              analyses={analyses.map((a) => ({
                id: a.id,
                deviceId: a.deviceId,
                agreementScore: parseFloat(a.agreementScore || '0'),
                errorMargin: parseFloat(a.errorMargin || '0'),
                timeRange: a.timeRange || '24h',
                createdAt: a.createdAt,
                consensusVerdict: a.consensusVerdict as {
                  verdict: string;
                  confidence: number;
                  metrics: { healthScore: number; riskLevel: string };
                } | null,
              }))}
              devices={userDevices.map((d) => ({ id: d.id, name: d.deviceName }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
