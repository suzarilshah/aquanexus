import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { virtualDeviceConfig, deviceStreamingSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resumeSession, getSessionWithProgress } from '@/lib/virtual-device/session-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, deviceType } = body as { sessionId?: string; deviceType?: 'fish' | 'plant' };

    // Get session ID either directly or from config
    let targetSessionId = sessionId;

    if (!targetSessionId && deviceType) {
      const [config] = await db
        .select()
        .from(virtualDeviceConfig)
        .where(eq(virtualDeviceConfig.userId, session.userId))
        .limit(1);

      if (config) {
        targetSessionId = (deviceType === 'fish' ? config.fishSessionId : config.plantSessionId) ?? undefined;
      }
    }

    if (!targetSessionId) {
      return NextResponse.json(
        { error: 'Session ID or device type is required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const [streamingSession] = await db
      .select()
      .from(deviceStreamingSessions)
      .where(eq(deviceStreamingSessions.id, targetSessionId))
      .limit(1);

    if (!streamingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify ownership through config
    const [config] = await db
      .select()
      .from(virtualDeviceConfig)
      .where(eq(virtualDeviceConfig.id, streamingSession.configId))
      .limit(1);

    if (!config || config.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Resume the session
    await resumeSession(targetSessionId);
    const updatedSession = await getSessionWithProgress(targetSessionId);

    return NextResponse.json({
      success: true,
      message: 'Session resumed successfully',
      session: updatedSession,
    });
  } catch (error) {
    console.error('[Session Resume] Error:', error);

    if (error instanceof Error && error.message.includes('Cannot resume')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to resume session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
