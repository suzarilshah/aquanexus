import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { virtualDeviceEnvironments, devices, deviceStreamingSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  syncEnvironmentCronJob,
  deleteCronJob,
  toggleCronJob,
  SPEED_CONFIGS,
  StreamingSpeed,
} from '@/lib/virtual-device/cronjob-org-client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/virtual-devices/environments/[id]
 * Get a specific environment with full details
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [environment] = await db
      .select()
      .from(virtualDeviceEnvironments)
      .where(
        and(
          eq(virtualDeviceEnvironments.id, id),
          eq(virtualDeviceEnvironments.userId, session.userId)
        )
      )
      .limit(1);

    if (!environment) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    // Get device and session details
    let fishDevice = null;
    let plantDevice = null;
    let fishSession = null;
    let plantSession = null;

    if (environment.fishDeviceId) {
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, environment.fishDeviceId))
        .limit(1);
      fishDevice = device || null;
    }

    if (environment.plantDeviceId) {
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, environment.plantDeviceId))
        .limit(1);
      plantDevice = device || null;
    }

    if (environment.fishSessionId) {
      const [s] = await db
        .select()
        .from(deviceStreamingSessions)
        .where(eq(deviceStreamingSessions.id, environment.fishSessionId))
        .limit(1);
      fishSession = s || null;
    }

    if (environment.plantSessionId) {
      const [s] = await db
        .select()
        .from(deviceStreamingSessions)
        .where(eq(deviceStreamingSessions.id, environment.plantSessionId))
        .limit(1);
      plantSession = s || null;
    }

    return NextResponse.json({
      environment: {
        ...environment,
        fishDevice,
        plantDevice,
        fishSession,
        plantSession,
        speedConfig: SPEED_CONFIGS[environment.streamingSpeed as StreamingSpeed],
      },
    });
  } catch (error) {
    console.error('[Environments API] GET [id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/virtual-devices/environments/[id]
 * Update an environment
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check environment exists and belongs to user
    const [existing] = await db
      .select()
      .from(virtualDeviceEnvironments)
      .where(
        and(
          eq(virtualDeviceEnvironments.id, id),
          eq(virtualDeviceEnvironments.userId, session.userId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    const updates: Partial<typeof virtualDeviceEnvironments.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Handle name update
    if (body.name !== undefined) {
      updates.name = body.name;
    }

    // Handle description update
    if (body.description !== undefined) {
      updates.description = body.description;
    }

    // Handle streaming speed update
    if (body.streamingSpeed !== undefined) {
      if (!Object.keys(SPEED_CONFIGS).includes(body.streamingSpeed)) {
        return NextResponse.json(
          { error: 'Invalid streaming speed. Must be one of: 1x, 2x, 5x, 10x, 20x' },
          { status: 400 }
        );
      }
      updates.streamingSpeed = body.streamingSpeed;
    }

    // Handle device assignment updates
    if (body.fishDeviceId !== undefined) {
      if (body.fishDeviceId === null) {
        updates.fishDeviceId = null;
        updates.fishSessionId = null;
      } else {
        const [device] = await db
          .select()
          .from(devices)
          .where(
            and(
              eq(devices.id, body.fishDeviceId),
              eq(devices.userId, session.userId)
            )
          )
          .limit(1);

        if (!device) {
          return NextResponse.json({ error: 'Fish device not found' }, { status: 404 });
        }

        if (device.deviceType !== 'fish') {
          return NextResponse.json({ error: 'Selected device is not a fish device' }, { status: 400 });
        }

        updates.fishDeviceId = body.fishDeviceId;
      }
    }

    if (body.plantDeviceId !== undefined) {
      if (body.plantDeviceId === null) {
        updates.plantDeviceId = null;
        updates.plantSessionId = null;
      } else {
        const [device] = await db
          .select()
          .from(devices)
          .where(
            and(
              eq(devices.id, body.plantDeviceId),
              eq(devices.userId, session.userId)
            )
          )
          .limit(1);

        if (!device) {
          return NextResponse.json({ error: 'Plant device not found' }, { status: 404 });
        }

        if (device.deviceType !== 'plant') {
          return NextResponse.json({ error: 'Selected device is not a plant device' }, { status: 400 });
        }

        updates.plantDeviceId = body.plantDeviceId;
      }
    }

    // Handle enabled state
    if (body.enabled !== undefined) {
      updates.enabled = body.enabled;

      // Sync with cron-job.org if job exists
      if (existing.cronJobId) {
        const toggleResult = await toggleCronJob(existing.cronJobId, body.enabled);
        if (toggleResult.success) {
          updates.cronJobEnabled = body.enabled;
          updates.cronJobLastSync = new Date();
        } else {
          console.error('[Environments API] Failed to toggle cron job:', toggleResult.error);
        }
      }
    }

    // Apply updates
    const [updated] = await db
      .update(virtualDeviceEnvironments)
      .set(updates)
      .where(eq(virtualDeviceEnvironments.id, id))
      .returning();

    // Sync cron job if name changed
    if (body.name && existing.cronJobId) {
      await syncEnvironmentCronJob(id, body.name, existing.cronJobId, updated.enabled);
    }

    return NextResponse.json({
      success: true,
      environment: {
        ...updated,
        speedConfig: SPEED_CONFIGS[updated.streamingSpeed as StreamingSpeed],
      },
    });
  } catch (error) {
    console.error('[Environments API] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/virtual-devices/environments/[id]
 * Delete an environment and its cron job
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check environment exists and belongs to user
    const [existing] = await db
      .select()
      .from(virtualDeviceEnvironments)
      .where(
        and(
          eq(virtualDeviceEnvironments.id, id),
          eq(virtualDeviceEnvironments.userId, session.userId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    // Delete cron job from cron-job.org if exists
    if (existing.cronJobId) {
      const deleteResult = await deleteCronJob(existing.cronJobId);
      if (!deleteResult.success) {
        console.error('[Environments API] Failed to delete cron job:', deleteResult.error);
        // Continue with environment deletion even if cron job deletion fails
      }
    }

    // Mark associated sessions as failed
    if (existing.fishSessionId) {
      await db
        .update(deviceStreamingSessions)
        .set({ status: 'failed', sessionCompletedAt: new Date() })
        .where(eq(deviceStreamingSessions.id, existing.fishSessionId));
    }

    if (existing.plantSessionId) {
      await db
        .update(deviceStreamingSessions)
        .set({ status: 'failed', sessionCompletedAt: new Date() })
        .where(eq(deviceStreamingSessions.id, existing.plantSessionId));
    }

    // Delete the environment
    await db
      .delete(virtualDeviceEnvironments)
      .where(eq(virtualDeviceEnvironments.id, id));

    return NextResponse.json({
      success: true,
      message: 'Environment deleted successfully',
    });
  } catch (error) {
    console.error('[Environments API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
