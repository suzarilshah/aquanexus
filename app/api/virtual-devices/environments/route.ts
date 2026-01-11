import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { virtualDeviceEnvironments, devices, deviceStreamingSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  syncEnvironmentCronJob,
  generateEnvironmentCronUrl,
  SPEED_CONFIGS,
  StreamingSpeed,
} from '@/lib/virtual-device/cronjob-org-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/virtual-devices/environments
 * List all virtual device environments for the current user
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const environments = await db
      .select()
      .from(virtualDeviceEnvironments)
      .where(eq(virtualDeviceEnvironments.userId, session.userId))
      .orderBy(virtualDeviceEnvironments.createdAt);

    // Enrich with device details
    const enrichedEnvironments = await Promise.all(
      environments.map(async (env) => {
        let fishDevice = null;
        let plantDevice = null;
        let fishSession = null;
        let plantSession = null;

        if (env.fishDeviceId) {
          const [device] = await db
            .select()
            .from(devices)
            .where(eq(devices.id, env.fishDeviceId))
            .limit(1);
          fishDevice = device || null;
        }

        if (env.plantDeviceId) {
          const [device] = await db
            .select()
            .from(devices)
            .where(eq(devices.id, env.plantDeviceId))
            .limit(1);
          plantDevice = device || null;
        }

        if (env.fishSessionId) {
          const [s] = await db
            .select()
            .from(deviceStreamingSessions)
            .where(eq(deviceStreamingSessions.id, env.fishSessionId))
            .limit(1);
          fishSession = s || null;
        }

        if (env.plantSessionId) {
          const [s] = await db
            .select()
            .from(deviceStreamingSessions)
            .where(eq(deviceStreamingSessions.id, env.plantSessionId))
            .limit(1);
          plantSession = s || null;
        }

        return {
          ...env,
          fishDevice,
          plantDevice,
          fishSession,
          plantSession,
          speedConfig: SPEED_CONFIGS[env.streamingSpeed as StreamingSpeed],
        };
      })
    );

    return NextResponse.json({
      environments: enrichedEnvironments,
      speedOptions: SPEED_CONFIGS,
    });
  } catch (error) {
    console.error('[Environments API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/virtual-devices/environments
 * Create a new virtual device environment
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      fishDeviceId,
      plantDeviceId,
      streamingSpeed = '1x',
      enabled = false,
      autoCreateCronJob = true,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate streaming speed
    if (!Object.keys(SPEED_CONFIGS).includes(streamingSpeed)) {
      return NextResponse.json(
        { error: `Invalid streaming speed. Must be one of: ${Object.keys(SPEED_CONFIGS).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate devices belong to user if provided
    if (fishDeviceId) {
      const [fishDevice] = await db
        .select()
        .from(devices)
        .where(and(eq(devices.id, fishDeviceId), eq(devices.userId, session.userId)))
        .limit(1);

      if (!fishDevice) {
        return NextResponse.json({ error: 'Fish device not found' }, { status: 404 });
      }

      if (fishDevice.deviceType !== 'fish') {
        return NextResponse.json({ error: 'Selected device is not a fish device' }, { status: 400 });
      }
    }

    if (plantDeviceId) {
      const [plantDevice] = await db
        .select()
        .from(devices)
        .where(and(eq(devices.id, plantDeviceId), eq(devices.userId, session.userId)))
        .limit(1);

      if (!plantDevice) {
        return NextResponse.json({ error: 'Plant device not found' }, { status: 404 });
      }

      if (plantDevice.deviceType !== 'plant') {
        return NextResponse.json({ error: 'Selected device is not a plant device' }, { status: 400 });
      }
    }

    // Create the environment
    const [newEnvironment] = await db
      .insert(virtualDeviceEnvironments)
      .values({
        userId: session.userId,
        name,
        description,
        fishDeviceId: fishDeviceId || null,
        plantDeviceId: plantDeviceId || null,
        streamingSpeed,
        enabled: false, // Always start disabled, enable after cron job is set up
        cronJobUrl: '', // Will be set after cron job creation
      })
      .returning();

    // Generate and store the cron URL
    const cronUrl = generateEnvironmentCronUrl(newEnvironment.id);
    await db
      .update(virtualDeviceEnvironments)
      .set({ cronJobUrl: cronUrl })
      .where(eq(virtualDeviceEnvironments.id, newEnvironment.id));

    let cronJobId = null;
    let cronJobError = null;

    // Create cron job on cron-job.org if requested
    if (autoCreateCronJob) {
      const cronResult = await syncEnvironmentCronJob(
        newEnvironment.id,
        name,
        null,
        enabled
      );

      if (cronResult.success && cronResult.jobId) {
        cronJobId = cronResult.jobId;

        // Update environment with cron job details
        await db
          .update(virtualDeviceEnvironments)
          .set({
            cronJobId: cronResult.jobId,
            cronJobEnabled: enabled,
            cronJobLastSync: new Date(),
            enabled, // Now safe to enable
          })
          .where(eq(virtualDeviceEnvironments.id, newEnvironment.id));
      } else {
        cronJobError = cronResult.error;
        console.error('[Environments API] Failed to create cron job:', cronResult.error);
      }
    }

    // Fetch the updated environment
    const [updatedEnvironment] = await db
      .select()
      .from(virtualDeviceEnvironments)
      .where(eq(virtualDeviceEnvironments.id, newEnvironment.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      environment: {
        ...updatedEnvironment,
        speedConfig: SPEED_CONFIGS[streamingSpeed as StreamingSpeed],
      },
      cronJob: {
        created: !!cronJobId,
        jobId: cronJobId,
        error: cronJobError,
      },
    });
  } catch (error) {
    console.error('[Environments API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
