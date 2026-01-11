/**
 * Migration Service - Handles migration from legacy virtualDeviceConfig to new virtualDeviceEnvironments
 *
 * This service provides utilities for:
 * 1. Detecting legacy configurations that need migration
 * 2. Migrating configs to new environment system
 * 3. Creating cron jobs for migrated environments
 * 4. Cleaning up legacy resources
 */

import { db } from '@/lib/db';
import {
  virtualDeviceConfig,
  virtualDeviceEnvironments,
  devices,
  deviceStreamingSessions
} from '@/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import {
  createCronJob,
  deleteCronJob,
  syncEnvironmentCronJob,
  generateEnvironmentCronUrl,
  SPEED_CONFIGS,
  StreamingSpeed
} from './cronjob-org-client';

// Legacy cron job ID on cron-job.org
const LEGACY_CRON_JOB_ID = 7143071;

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  environments: Array<{
    id: string;
    name: string;
    cronJobId?: number;
  }>;
  errors: string[];
}

/**
 * Check if a user has legacy virtual device config that needs migration
 */
export async function checkLegacyConfigExists(userId: string): Promise<boolean> {
  const [legacyConfig] = await db
    .select()
    .from(virtualDeviceConfig)
    .where(eq(virtualDeviceConfig.userId, userId))
    .limit(1);

  return !!legacyConfig;
}

/**
 * Check if a user already has environments (new system)
 */
export async function checkEnvironmentsExist(userId: string): Promise<boolean> {
  const environments = await db
    .select({ id: virtualDeviceEnvironments.id })
    .from(virtualDeviceEnvironments)
    .where(eq(virtualDeviceEnvironments.userId, userId))
    .limit(1);

  return environments.length > 0;
}

/**
 * Get migration status for a user
 */
export async function getMigrationStatus(userId: string): Promise<{
  hasLegacyConfig: boolean;
  hasEnvironments: boolean;
  needsMigration: boolean;
  legacyConfig?: typeof virtualDeviceConfig.$inferSelect;
}> {
  const [legacyConfig] = await db
    .select()
    .from(virtualDeviceConfig)
    .where(eq(virtualDeviceConfig.userId, userId))
    .limit(1);

  const environments = await db
    .select({ id: virtualDeviceEnvironments.id })
    .from(virtualDeviceEnvironments)
    .where(eq(virtualDeviceEnvironments.userId, userId))
    .limit(1);

  const hasLegacyConfig = !!legacyConfig;
  const hasEnvironments = environments.length > 0;

  return {
    hasLegacyConfig,
    hasEnvironments,
    needsMigration: hasLegacyConfig && !hasEnvironments,
    legacyConfig: legacyConfig || undefined,
  };
}

/**
 * Map legacy speedMultiplier to new streaming speed
 */
function mapSpeedMultiplier(speedMultiplier: number | null): StreamingSpeed {
  const speed = speedMultiplier || 1;

  if (speed <= 1) return '1x';
  if (speed <= 2) return '2x';
  if (speed <= 5) return '5x';
  if (speed <= 10) return '10x';
  if (speed <= 20) return '20x';
  return '100x';
}

/**
 * Migrate a user's legacy config to the new environment system
 */
export async function migrateLegacyConfig(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    environments: [],
    errors: [],
  };

  try {
    // Check migration status
    const status = await getMigrationStatus(userId);

    if (!status.hasLegacyConfig) {
      result.errors.push('No legacy configuration found to migrate');
      return result;
    }

    if (status.hasEnvironments) {
      result.errors.push('User already has environments - migration may have already occurred');
      result.success = true; // Not a failure, just already done
      return result;
    }

    const legacyConfig = status.legacyConfig!;

    // Get device details for naming
    let fishDeviceName = 'Fish Sensor';
    let plantDeviceName = 'Plant Sensor';

    if (legacyConfig.fishDeviceId) {
      const [fishDevice] = await db
        .select({ name: devices.deviceName })
        .from(devices)
        .where(eq(devices.id, legacyConfig.fishDeviceId))
        .limit(1);
      if (fishDevice) fishDeviceName = fishDevice.name;
    }

    if (legacyConfig.plantDeviceId) {
      const [plantDevice] = await db
        .select({ name: devices.deviceName })
        .from(devices)
        .where(eq(devices.id, legacyConfig.plantDeviceId))
        .limit(1);
      if (plantDevice) plantDeviceName = plantDevice.name;
    }

    // Create a new environment from the legacy config
    const streamingSpeed = mapSpeedMultiplier(legacyConfig.speedMultiplier);
    const environmentName = `Migrated: ${fishDeviceName} + ${plantDeviceName}`;

    const [newEnvironment] = await db
      .insert(virtualDeviceEnvironments)
      .values({
        userId,
        name: environmentName,
        description: `Automatically migrated from legacy virtual device configuration. Original speed: ${legacyConfig.speedMultiplier || 1}x`,
        fishDeviceId: legacyConfig.fishDeviceId,
        plantDeviceId: legacyConfig.plantDeviceId,
        enabled: legacyConfig.enabled,
        streamingSpeed,
        dataSource: legacyConfig.dataSource || 'training',
        currentFishIndex: legacyConfig.currentFishIndex || 0,
        currentPlantIndex: legacyConfig.currentPlantIndex || 0,
        lastStreamedAt: legacyConfig.lastStreamedAt,
        dataRetentionOnReset: legacyConfig.dataRetentionOnReset || 'ask',
        notifyOnCompletion: legacyConfig.notifyOnCompletion ?? true,
        notifyOnError: legacyConfig.notifyOnError ?? true,
        fishSessionId: legacyConfig.fishSessionId,
        plantSessionId: legacyConfig.plantSessionId,
      })
      .returning();

    result.environments.push({
      id: newEnvironment.id,
      name: newEnvironment.name,
    });

    // Create cron job for the new environment if it's enabled
    if (newEnvironment.enabled) {
      try {
        const cronResult = await syncEnvironmentCronJob(
          newEnvironment.id,
          newEnvironment.name,
          null, // No existing job ID for new environment
          true  // Enable the cron job
        );

        if (cronResult.success && cronResult.jobId) {
          // Generate the cron job URL
          const cronJobUrl = generateEnvironmentCronUrl(newEnvironment.id);

          // Update environment with cron job info
          await db
            .update(virtualDeviceEnvironments)
            .set({
              cronJobId: cronResult.jobId,
              cronJobEnabled: true,
              cronJobLastSync: new Date(),
              cronJobUrl: cronJobUrl,
            })
            .where(eq(virtualDeviceEnvironments.id, newEnvironment.id));

          result.environments[0].cronJobId = cronResult.jobId;
        }
      } catch (cronError) {
        const errMsg = cronError instanceof Error ? cronError.message : 'Unknown cron error';
        result.errors.push(`Warning: Failed to create cron job: ${errMsg}`);
        // Don't fail the entire migration for cron job creation failure
      }
    }

    // Disable the legacy config (don't delete, keep for reference)
    await db
      .update(virtualDeviceConfig)
      .set({
        enabled: false,
        updatedAt: new Date(),
        lastUserAction: 'migrated_to_environments',
        lastUserActionAt: new Date(),
      })
      .where(eq(virtualDeviceConfig.id, legacyConfig.id));

    result.success = true;
    result.migratedCount = 1;

    console.log(`[Migration] Successfully migrated user ${userId} to environment system`);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown migration error';
    result.errors.push(errorMsg);
    console.error('[Migration] Error:', error);
    return result;
  }
}

/**
 * Migrate all legacy configs (admin function)
 */
export async function migrateAllLegacyConfigs(): Promise<{
  totalMigrated: number;
  totalFailed: number;
  results: Array<{ userId: string; result: MigrationResult }>;
}> {
  const allConfigs = await db
    .select()
    .from(virtualDeviceConfig)
    .where(eq(virtualDeviceConfig.enabled, true));

  const results: Array<{ userId: string; result: MigrationResult }> = [];
  let totalMigrated = 0;
  let totalFailed = 0;

  for (const config of allConfigs) {
    const result = await migrateLegacyConfig(config.userId);
    results.push({ userId: config.userId, result });

    if (result.success) {
      totalMigrated += result.migratedCount;
    } else {
      totalFailed++;
    }
  }

  return { totalMigrated, totalFailed, results };
}

/**
 * Retire the legacy cron job on cron-job.org
 * This should only be called after all users have been migrated
 */
export async function retireLegacyCronJob(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // First check if any legacy configs are still enabled
    const activeConfigs = await db
      .select({ id: virtualDeviceConfig.id })
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.enabled, true))
      .limit(1);

    if (activeConfigs.length > 0) {
      return {
        success: false,
        message: 'Cannot retire legacy cron job: There are still active legacy configurations',
      };
    }

    // Disable the legacy cron job (we'll disable instead of delete for safety)
    // This requires calling the cron-job.org API to update the job
    const CRONJOB_API_KEY = process.env.CRONJOB_ORG_API_KEY || '3KjxViJoTMHiXOnOA38QdIIErIFgUTpH7HqCzqMMxhk=';

    const response = await fetch(`https://api.cron-job.org/jobs/${LEGACY_CRON_JOB_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CRONJOB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job: {
          enabled: false,
          title: '[RETIRED] AquaNexus - Virtual Device (Legacy)',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to disable legacy cron job: ${JSON.stringify(errorData)}`);
    }

    console.log('[Migration] Successfully retired legacy cron job');

    return {
      success: true,
      message: 'Legacy cron job has been disabled. The new environment-based system is now active.',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Migration] Error retiring legacy cron job:', error);
    return {
      success: false,
      message: `Failed to retire legacy cron job: ${errorMsg}`,
    };
  }
}

/**
 * Get summary of migration status across all users
 */
export async function getMigrationSummary(): Promise<{
  totalLegacyConfigs: number;
  totalEnvironments: number;
  legacyConfigsEnabled: number;
  environmentsEnabled: number;
  needsMigration: number;
}> {
  const legacyConfigs = await db
    .select()
    .from(virtualDeviceConfig);

  const environments = await db
    .select()
    .from(virtualDeviceEnvironments);

  const legacyUserIds = new Set(legacyConfigs.map(c => c.userId));
  const environmentUserIds = new Set(environments.map(e => e.userId));

  // Users with legacy config but no environments need migration
  const needsMigration = Array.from(legacyUserIds).filter(id => !environmentUserIds.has(id)).length;

  return {
    totalLegacyConfigs: legacyConfigs.length,
    totalEnvironments: environments.length,
    legacyConfigsEnabled: legacyConfigs.filter(c => c.enabled).length,
    environmentsEnabled: environments.filter(e => e.enabled).length,
    needsMigration,
  };
}
