/**
 * Sync Service - Handles synchronization between cron jobs and virtual devices
 *
 * This service ensures that:
 * 1. Sessions are created for enabled devices that don't have them
 * 2. Orphaned sessions (for deleted devices) are cleaned up
 * 3. Cron health is tracked and alerts are generated when issues occur
 * 4. Device state is kept in sync with session state
 */

import { db } from '@/lib/db';
import {
  virtualDeviceConfig,
  devices,
  deviceStreamingSessions,
  cronHealthMetrics,
  alerts,
  CronHealthMetrics,
} from '@/lib/db/schema';
import { eq, and, or, isNull, notInArray, inArray } from 'drizzle-orm';
import { createSession, failSession } from './session-service';
import { logSessionEvent } from './logging-service';

export interface SyncResult {
  success: boolean;
  syncedAt: Date;
  actions: {
    sessionsCreated: number;
    sessionsCleanedUp: number;
    devicesValidated: number;
    errorsFixed: number;
  };
  issues: string[];
  healthStatus: 'healthy' | 'degraded' | 'failed' | 'unknown';
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  lastCronSuccess: Date | null;
  lastCronAttempt: Date | null;
  timeSinceLastCron: number | null; // in minutes
  isOverdue: boolean;
  activeDevices: number;
  activeSessions: number;
  orphanedSessions: number;
  consecutiveFailures: number;
  syncStatus: 'synced' | 'out_of_sync' | 'syncing' | 'unknown';
  issues: string[];
}

/**
 * Get or create health metrics for a user
 */
export async function getOrCreateHealthMetrics(userId: string): Promise<CronHealthMetrics> {
  let [metrics] = await db
    .select()
    .from(cronHealthMetrics)
    .where(eq(cronHealthMetrics.userId, userId))
    .limit(1);

  if (!metrics) {
    [metrics] = await db
      .insert(cronHealthMetrics)
      .values({
        userId,
        cronStatus: 'unknown',
        syncStatus: 'unknown',
      })
      .returning();
  }

  return metrics;
}

/**
 * Update health metrics after a cron run
 */
export async function updateHealthMetricsOnCronRun(
  userId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const metrics = await getOrCreateHealthMetrics(userId);

  const updates: Partial<typeof cronHealthMetrics.$inferInsert> = {
    lastCronAttemptAt: new Date(),
    updatedAt: new Date(),
  };

  if (success) {
    updates.lastCronSuccessAt = new Date();
    updates.lastCronError = null;
    updates.consecutiveFailures = 0;
    updates.totalSuccessCount = (metrics.totalSuccessCount || 0) + 1;
    updates.cronStatus = 'healthy';
  } else {
    updates.lastCronError = errorMessage || 'Unknown error';
    updates.consecutiveFailures = (metrics.consecutiveFailures || 0) + 1;
    updates.totalFailureCount = (metrics.totalFailureCount || 0) + 1;

    // Determine status based on consecutive failures
    if (updates.consecutiveFailures >= 3) {
      updates.cronStatus = 'failed';
    } else if (updates.consecutiveFailures >= 1) {
      updates.cronStatus = 'degraded';
    }
  }

  await db
    .update(cronHealthMetrics)
    .set(updates)
    .where(eq(cronHealthMetrics.id, metrics.id));
}

/**
 * Perform a full sync of virtual devices and sessions
 */
export async function performSync(userId: string, cronRunId?: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedAt: new Date(),
    actions: {
      sessionsCreated: 0,
      sessionsCleanedUp: 0,
      devicesValidated: 0,
      errorsFixed: 0,
    },
    issues: [],
    healthStatus: 'healthy',
  };

  try {
    // Update sync status to 'syncing'
    const metrics = await getOrCreateHealthMetrics(userId);
    await db
      .update(cronHealthMetrics)
      .set({ syncStatus: 'syncing', updatedAt: new Date() })
      .where(eq(cronHealthMetrics.id, metrics.id));

    // 1. Get user's virtual device config
    const [config] = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.userId, userId))
      .limit(1);

    if (!config) {
      result.issues.push('No virtual device configuration found');
      await updateSyncStatus(userId, 'synced', result.actions);
      return result;
    }

    // 2. Validate that configured devices still exist
    const deviceIds = [config.fishDeviceId, config.plantDeviceId].filter(Boolean) as string[];

    if (deviceIds.length > 0) {
      const existingDevices = await db
        .select({ id: devices.id })
        .from(devices)
        .where(inArray(devices.id, deviceIds));

      const existingDeviceIds = new Set(existingDevices.map(d => d.id));

      // Check if fish device exists
      if (config.fishDeviceId && !existingDeviceIds.has(config.fishDeviceId)) {
        result.issues.push('Fish device no longer exists - cleaning up');
        await cleanupOrphanedDeviceReference(config.id, 'fish', config.fishSessionId, cronRunId);
        result.actions.sessionsCleanedUp++;
        result.actions.errorsFixed++;
      } else if (config.fishDeviceId) {
        result.actions.devicesValidated++;
      }

      // Check if plant device exists
      if (config.plantDeviceId && !existingDeviceIds.has(config.plantDeviceId)) {
        result.issues.push('Plant device no longer exists - cleaning up');
        await cleanupOrphanedDeviceReference(config.id, 'plant', config.plantSessionId, cronRunId);
        result.actions.sessionsCleanedUp++;
        result.actions.errorsFixed++;
      } else if (config.plantDeviceId) {
        result.actions.devicesValidated++;
      }
    }

    // 3. If config is enabled, ensure sessions exist for valid devices
    if (config.enabled) {
      // Refresh config after potential cleanup
      const [updatedConfig] = await db
        .select()
        .from(virtualDeviceConfig)
        .where(eq(virtualDeviceConfig.id, config.id))
        .limit(1);

      // Create fish session if needed
      if (updatedConfig.fishDeviceId && !updatedConfig.fishSessionId) {
        try {
          await createSession(updatedConfig.id, 'fish', cronRunId);
          result.actions.sessionsCreated++;
        } catch (e) {
          result.issues.push(`Failed to create fish session: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

      // Create plant session if needed
      if (updatedConfig.plantDeviceId && !updatedConfig.plantSessionId) {
        try {
          await createSession(updatedConfig.id, 'plant', cronRunId);
          result.actions.sessionsCreated++;
        } catch (e) {
          result.issues.push(`Failed to create plant session: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    // 4. Find and clean up orphaned sessions (sessions without valid configs)
    const orphanedSessions = await findOrphanedSessions(userId);
    for (const session of orphanedSessions) {
      try {
        await failSession(session.id, 'Orphaned session - device or config no longer exists', cronRunId);
        result.actions.sessionsCleanedUp++;
        result.actions.errorsFixed++;
      } catch (e) {
        result.issues.push(`Failed to clean up orphaned session ${session.id}`);
      }
    }

    // 5. Update sync status
    const finalStatus = result.issues.length > 0 ? 'out_of_sync' : 'synced';
    await updateSyncStatus(userId, finalStatus, result.actions, orphanedSessions.length);

    result.healthStatus = result.issues.length > 0 ? 'degraded' : 'healthy';
    result.success = true;

  } catch (error) {
    result.success = false;
    result.healthStatus = 'failed';
    result.issues.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    await updateSyncStatus(userId, 'out_of_sync');
  }

  return result;
}

/**
 * Clean up orphaned device reference from config
 */
async function cleanupOrphanedDeviceReference(
  configId: string,
  deviceType: 'fish' | 'plant',
  sessionId: string | null,
  cronRunId?: string
): Promise<void> {
  // Mark session as failed if it exists
  if (sessionId) {
    try {
      await failSession(sessionId, `Device was deleted - session orphaned`, cronRunId);
    } catch (e) {
      console.error(`Failed to mark session ${sessionId} as failed:`, e);
    }
  }

  // Clear device and session references from config
  const updates: Partial<typeof virtualDeviceConfig.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (deviceType === 'fish') {
    updates.fishDeviceId = null;
    updates.fishSessionId = null;
  } else {
    updates.plantDeviceId = null;
    updates.plantSessionId = null;
  }

  await db
    .update(virtualDeviceConfig)
    .set(updates)
    .where(eq(virtualDeviceConfig.id, configId));
}

/**
 * Find orphaned sessions (sessions for devices/configs that no longer exist)
 */
async function findOrphanedSessions(userId: string): Promise<Array<{ id: string; configId: string; deviceType: string }>> {
  // Get user's config
  const [config] = await db
    .select()
    .from(virtualDeviceConfig)
    .where(eq(virtualDeviceConfig.userId, userId))
    .limit(1);

  if (!config) {
    return [];
  }

  // Get all active/paused sessions for this config
  const sessions = await db
    .select()
    .from(deviceStreamingSessions)
    .where(
      and(
        eq(deviceStreamingSessions.configId, config.id),
        or(
          eq(deviceStreamingSessions.status, 'active'),
          eq(deviceStreamingSessions.status, 'paused')
        )
      )
    );

  const orphaned: Array<{ id: string; configId: string; deviceType: string }> = [];

  for (const session of sessions) {
    const deviceId = session.deviceType === 'fish' ? config.fishDeviceId : config.plantDeviceId;
    const sessionId = session.deviceType === 'fish' ? config.fishSessionId : config.plantSessionId;

    // Session is orphaned if:
    // 1. The device reference in config is null, OR
    // 2. The session ID in config doesn't match this session
    if (!deviceId || sessionId !== session.id) {
      orphaned.push({
        id: session.id,
        configId: session.configId,
        deviceType: session.deviceType,
      });
    }
  }

  return orphaned;
}

/**
 * Update sync status in health metrics
 */
async function updateSyncStatus(
  userId: string,
  status: 'synced' | 'out_of_sync' | 'syncing' | 'unknown',
  actions?: SyncResult['actions'],
  orphanedCount?: number
): Promise<void> {
  const metrics = await getOrCreateHealthMetrics(userId);

  const updates: Partial<typeof cronHealthMetrics.$inferInsert> = {
    syncStatus: status,
    lastSyncAt: new Date(),
    updatedAt: new Date(),
  };

  if (actions) {
    updates.activeSessionsCount = actions.sessionsCreated;
    updates.activeDevicesCount = actions.devicesValidated;
  }

  if (orphanedCount !== undefined) {
    updates.orphanedSessionsCount = orphanedCount;
  }

  await db
    .update(cronHealthMetrics)
    .set(updates)
    .where(eq(cronHealthMetrics.id, metrics.id));
}

/**
 * Get health check status for a user
 */
export async function getHealthCheck(userId: string): Promise<HealthCheckResult> {
  const metrics = await getOrCreateHealthMetrics(userId);
  const issues: string[] = [];

  // Calculate time since last cron
  const timeSinceLastCron = metrics.lastCronSuccessAt
    ? Math.floor((Date.now() - new Date(metrics.lastCronSuccessAt).getTime()) / (1000 * 60))
    : null;

  // Check if overdue (more than alertThresholdMinutes since last success)
  const isOverdue = timeSinceLastCron !== null && timeSinceLastCron > (metrics.alertThresholdMinutes || 360);

  // Get active counts
  const [config] = await db
    .select()
    .from(virtualDeviceConfig)
    .where(eq(virtualDeviceConfig.userId, userId))
    .limit(1);

  let activeDevices = 0;
  let activeSessions = 0;

  if (config) {
    if (config.fishDeviceId) activeDevices++;
    if (config.plantDeviceId) activeDevices++;

    if (config.fishSessionId) {
      const [session] = await db
        .select()
        .from(deviceStreamingSessions)
        .where(eq(deviceStreamingSessions.id, config.fishSessionId))
        .limit(1);
      if (session && (session.status === 'active' || session.status === 'paused')) {
        activeSessions++;
      }
    }

    if (config.plantSessionId) {
      const [session] = await db
        .select()
        .from(deviceStreamingSessions)
        .where(eq(deviceStreamingSessions.id, config.plantSessionId))
        .limit(1);
      if (session && (session.status === 'active' || session.status === 'paused')) {
        activeSessions++;
      }
    }
  }

  // Determine issues
  if (isOverdue) {
    issues.push(`Cron job has not run successfully in ${timeSinceLastCron} minutes`);
  }

  if (metrics.consecutiveFailures > 0) {
    issues.push(`${metrics.consecutiveFailures} consecutive cron failures`);
  }

  if (metrics.orphanedSessionsCount > 0) {
    issues.push(`${metrics.orphanedSessionsCount} orphaned sessions need cleanup`);
  }

  if (activeDevices > 0 && activeSessions === 0 && config?.enabled) {
    issues.push('Devices configured but no active streaming sessions');
  }

  // Determine overall status
  let status: HealthCheckResult['status'] = 'healthy';
  if (metrics.cronStatus === 'failed' || isOverdue) {
    status = 'failed';
  } else if (metrics.cronStatus === 'degraded' || issues.length > 0) {
    status = 'degraded';
  } else if (metrics.cronStatus === 'unknown') {
    status = 'unknown';
  }

  return {
    status,
    lastCronSuccess: metrics.lastCronSuccessAt,
    lastCronAttempt: metrics.lastCronAttemptAt,
    timeSinceLastCron,
    isOverdue,
    activeDevices,
    activeSessions,
    orphanedSessions: metrics.orphanedSessionsCount,
    consecutiveFailures: metrics.consecutiveFailures,
    syncStatus: metrics.syncStatus as HealthCheckResult['syncStatus'],
    issues,
  };
}

/**
 * Create an alert for cron issues
 */
export async function createCronAlert(
  userId: string,
  alertType: string,
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): Promise<void> {
  // Get the first device for the user to attach the alert to
  const [device] = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId))
    .limit(1);

  if (!device) {
    console.warn(`Cannot create alert - no devices found for user ${userId}`);
    return;
  }

  await db.insert(alerts).values({
    deviceId: device.id,
    alertType,
    severity,
    message,
    resolved: false,
  });
}

/**
 * Check if alert should be created and create it
 */
export async function checkAndCreateAlerts(userId: string): Promise<void> {
  const health = await getHealthCheck(userId);
  const metrics = await getOrCreateHealthMetrics(userId);

  if (!metrics.alertOnFailure) {
    return;
  }

  // Create alert if cron is overdue
  if (health.isOverdue && health.status === 'failed') {
    await createCronAlert(
      userId,
      'CRON_FAILURE',
      `Virtual device streaming has not run in ${health.timeSinceLastCron} minutes. Data collection may be interrupted.`,
      'high'
    );
  }

  // Create alert for consecutive failures
  if (health.consecutiveFailures >= 3) {
    await createCronAlert(
      userId,
      'CRON_REPEATED_FAILURE',
      `Virtual device streaming has failed ${health.consecutiveFailures} times consecutively. Please check system logs.`,
      'critical'
    );
  }
}
