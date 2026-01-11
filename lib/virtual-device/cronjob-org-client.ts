/**
 * cron-job.org API Client
 * Manages cron jobs for virtual device streaming environments
 *
 * API Documentation: https://docs.cron-job.org/rest-api.html
 */

const CRONJOB_API_URL = 'https://api.cron-job.org';
const CRONJOB_API_KEY = process.env.CRONJOB_ORG_API_KEY || '3KjxViJoTMHiXOnOA38QdIIErIFgUTpH7HqCzqMMxhk=';

// Streaming speed to cron interval mapping
// All environments run every 5 minutes, but process different numbers of readings
export const SPEED_CONFIGS = {
  '1x': { readingsPerTrigger: 1, label: '1X (Real-time)', description: '1 reading per 5 hours - matches CSV timing exactly' },
  '2x': { readingsPerTrigger: 2, label: '2X', description: '2 readings per trigger - completes 2x faster' },
  '5x': { readingsPerTrigger: 5, label: '5X', description: '5 readings per trigger - completes 5x faster' },
  '10x': { readingsPerTrigger: 10, label: '10X', description: '10 readings per trigger - completes 10x faster' },
  '20x': { readingsPerTrigger: 20, label: '20X', description: '20 readings per trigger - completes 20x faster' },
} as const;

export type StreamingSpeed = keyof typeof SPEED_CONFIGS;

export interface CronJobConfig {
  jobId?: number;
  title: string;
  url: string;
  enabled: boolean;
  schedule: {
    minutes: number[];
    hours: number[];
    mdays: number[];
    months: number[];
    wdays: number[];
  };
  requestMethod?: 0 | 1; // 0 = GET, 1 = POST
  auth?: {
    enable: boolean;
    user?: string;
    password?: string;
  };
  notification?: {
    onFailure: boolean;
    onSuccess: boolean;
    onDisable: boolean;
  };
  extendedData?: {
    headers?: Record<string, string>;
    body?: string;
  };
}

export interface CronJobResponse {
  jobId: number;
  enabled: boolean;
  title: string;
  url: string;
}

export interface CronJobListResponse {
  jobs: CronJobResponse[];
}

/**
 * Create a new cron job on cron-job.org
 */
export async function createCronJob(config: CronJobConfig): Promise<{ success: boolean; jobId?: number; error?: string }> {
  try {
    const response = await fetch(`${CRONJOB_API_URL}/jobs`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRONJOB_API_KEY}`,
      },
      body: JSON.stringify({
        job: {
          title: config.title,
          url: config.url,
          enabled: config.enabled,
          saveResponses: true,
          schedule: {
            timezone: 'UTC',
            expiresAt: 0,
            ...config.schedule,
          },
          requestMethod: config.requestMethod || 1, // POST by default
          extendedData: config.extendedData || {
            headers: {
              'Content-Type': 'application/json',
            },
          },
          auth: config.auth || { enable: false },
          notification: config.notification || {
            onFailure: true,
            onSuccess: false,
            onDisable: true,
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[cron-job.org] Create job failed:', data);
      return { success: false, error: data.error || 'Failed to create cron job' };
    }

    console.log('[cron-job.org] Job created:', data);
    return { success: true, jobId: data.jobId };
  } catch (error) {
    console.error('[cron-job.org] Create job error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update an existing cron job on cron-job.org
 */
export async function updateCronJob(jobId: number, updates: Partial<CronJobConfig>): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${CRONJOB_API_URL}/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRONJOB_API_KEY}`,
      },
      body: JSON.stringify({
        job: updates,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[cron-job.org] Update job failed:', data);
      return { success: false, error: data.error || 'Failed to update cron job' };
    }

    console.log('[cron-job.org] Job updated:', jobId);
    return { success: true };
  } catch (error) {
    console.error('[cron-job.org] Update job error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete a cron job from cron-job.org
 */
export async function deleteCronJob(jobId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${CRONJOB_API_URL}/jobs/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${CRONJOB_API_KEY}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('[cron-job.org] Delete job failed:', data);
      return { success: false, error: data.error || 'Failed to delete cron job' };
    }

    console.log('[cron-job.org] Job deleted:', jobId);
    return { success: true };
  } catch (error) {
    console.error('[cron-job.org] Delete job error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get a cron job details from cron-job.org
 */
export async function getCronJob(jobId: number): Promise<{ success: boolean; job?: CronJobResponse; error?: string }> {
  try {
    const response = await fetch(`${CRONJOB_API_URL}/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRONJOB_API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[cron-job.org] Get job failed:', data);
      return { success: false, error: data.error || 'Failed to get cron job' };
    }

    return { success: true, job: data.jobDetails };
  } catch (error) {
    console.error('[cron-job.org] Get job error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * List all cron jobs from cron-job.org
 */
export async function listCronJobs(): Promise<{ success: boolean; jobs?: CronJobResponse[]; error?: string }> {
  try {
    const response = await fetch(`${CRONJOB_API_URL}/jobs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRONJOB_API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[cron-job.org] List jobs failed:', data);
      return { success: false, error: data.error || 'Failed to list cron jobs' };
    }

    return { success: true, jobs: data.jobs || [] };
  } catch (error) {
    console.error('[cron-job.org] List jobs error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Enable or disable a cron job
 */
export async function toggleCronJob(jobId: number, enabled: boolean): Promise<{ success: boolean; error?: string }> {
  return updateCronJob(jobId, { enabled });
}

/**
 * Create cron job schedule for virtual device environment
 * All jobs run every 5 minutes - the speed is controlled by readings per trigger
 */
export function createEnvironmentSchedule(): CronJobConfig['schedule'] {
  return {
    minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], // Every 5 minutes
    hours: [-1], // Every hour (-1 means all)
    mdays: [-1], // Every day
    months: [-1], // Every month
    wdays: [-1], // Every weekday
  };
}

/**
 * Generate the cron job URL for an environment
 */
export function generateEnvironmentCronUrl(environmentId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:3000';

  return `${baseUrl}/api/cron/virtual-devices/environment?envId=${environmentId}&key=${CRONJOB_API_KEY}`;
}

/**
 * Create or update a cron job for a virtual device environment
 */
export async function syncEnvironmentCronJob(
  environmentId: string,
  environmentName: string,
  existingJobId: number | null,
  enabled: boolean
): Promise<{ success: boolean; jobId?: number; error?: string }> {
  const url = generateEnvironmentCronUrl(environmentId);
  const title = `AquaNexus: ${environmentName}`;

  if (existingJobId) {
    // Update existing job
    const result = await updateCronJob(existingJobId, {
      title,
      url,
      enabled,
    });

    if (result.success) {
      return { success: true, jobId: existingJobId };
    }

    // If update failed (job might not exist), try creating new one
    console.log('[cron-job.org] Update failed, creating new job...');
  }

  // Create new job
  const createResult = await createCronJob({
    title,
    url,
    enabled,
    schedule: createEnvironmentSchedule(),
    requestMethod: 1, // POST
    extendedData: {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRONJOB_API_KEY}`,
      },
    },
  });

  return createResult;
}

/**
 * Get the number of readings to process based on streaming speed
 */
export function getReadingsPerTrigger(speed: StreamingSpeed): number {
  return SPEED_CONFIGS[speed]?.readingsPerTrigger || 1;
}
