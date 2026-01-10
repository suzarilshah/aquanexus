import { db } from '@/lib/db';
import {
  deviceStreamingSessions,
  virtualDeviceConfig,
  fishReadings,
  plantReadings,
  NewDeviceStreamingSession,
  DeviceStreamingSession,
  VirtualDeviceConfig,
} from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { parseFishCSV, parsePlantCSV } from './csv-parser';
import { calculateExpectedCompletion, calculateProgress, formatDuration, timeAgo } from './timing-calculator';
import { logSessionEvent, deleteSessionEvents } from './logging-service';

export interface SessionDetails extends DeviceStreamingSession {
  progress: {
    percentage: number;
    rowsStreamed: number;
    totalRows: number;
    timeRemainingMs: number;
    estimatedCompletion: Date;
    timeRemainingFormatted: string;
    lastDataSentAgo: string | null;
  };
}

/**
 * Create a new streaming session
 */
export async function createSession(
  configId: string,
  deviceType: 'fish' | 'plant',
  cronRunId?: string
): Promise<DeviceStreamingSession> {
  const csvData = deviceType === 'fish' ? parseFishCSV() : parsePlantCSV();
  const sessionStartedAt = new Date();
  const expectedCompletionAt = calculateExpectedCompletion(sessionStartedAt, 0, deviceType);

  const newSession: NewDeviceStreamingSession = {
    configId,
    deviceType,
    status: 'active',
    totalRows: csvData.totalRows,
    lastRowSent: 0,
    rowsStreamed: 0,
    sessionStartedAt,
    totalPausedMs: 0,
    expectedCompletionAt,
    errorCount: 0,
    consecutiveErrors: 0,
  };

  const [session] = await db
    .insert(deviceStreamingSessions)
    .values(newSession)
    .returning();

  // Log the session start event
  await logSessionEvent(session.id, 'session_started', {
    triggeredBy: 'user',
    reason: 'New streaming session started',
  }, cronRunId);

  // Update the config with the new session ID
  const updateField = deviceType === 'fish' ? 'fishSessionId' : 'plantSessionId';
  await db
    .update(virtualDeviceConfig)
    .set({
      [updateField]: session.id,
      lastUserAction: 'start',
      lastUserActionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(virtualDeviceConfig.id, configId));

  return session;
}

/**
 * Get a session by ID with progress details
 */
export async function getSessionWithProgress(sessionId: string): Promise<SessionDetails | null> {
  const [session] = await db
    .select()
    .from(deviceStreamingSessions)
    .where(eq(deviceStreamingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return null;
  }

  const progress = calculateProgress(session);

  return {
    ...session,
    progress: {
      ...progress,
      timeRemainingFormatted: formatDuration(progress.timeRemainingMs),
      lastDataSentAgo: session.lastDataSentAt ? timeAgo(new Date(session.lastDataSentAt)) : null,
    },
  };
}

/**
 * Get active sessions for a config
 */
export async function getActiveSessions(configId: string): Promise<{
  fishSession: SessionDetails | null;
  plantSession: SessionDetails | null;
}> {
  const sessions = await db
    .select()
    .from(deviceStreamingSessions)
    .where(
      and(
        eq(deviceStreamingSessions.configId, configId),
        or(
          eq(deviceStreamingSessions.status, 'active'),
          eq(deviceStreamingSessions.status, 'paused')
        )
      )
    );

  let fishSession: SessionDetails | null = null;
  let plantSession: SessionDetails | null = null;

  for (const session of sessions) {
    const progress = calculateProgress(session);
    const details: SessionDetails = {
      ...session,
      progress: {
        ...progress,
        timeRemainingFormatted: formatDuration(progress.timeRemainingMs),
        lastDataSentAgo: session.lastDataSentAt ? timeAgo(new Date(session.lastDataSentAt)) : null,
      },
    };

    if (session.deviceType === 'fish') {
      fishSession = details;
    } else {
      plantSession = details;
    }
  }

  return { fishSession, plantSession };
}

/**
 * Pause a session
 */
export async function pauseSession(sessionId: string, cronRunId?: string): Promise<DeviceStreamingSession> {
  const [session] = await db
    .select()
    .from(deviceStreamingSessions)
    .where(eq(deviceStreamingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'active') {
    throw new Error(`Cannot pause session with status: ${session.status}`);
  }

  const previousStatus = session.status;

  const [updated] = await db
    .update(deviceStreamingSessions)
    .set({
      status: 'paused',
      sessionPausedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(deviceStreamingSessions.id, sessionId))
    .returning();

  // Log the pause event
  await logSessionEvent(sessionId, 'session_paused', {
    triggeredBy: 'user',
    previousStatus,
  }, cronRunId);

  // Update config
  await db
    .update(virtualDeviceConfig)
    .set({
      lastUserAction: 'pause',
      lastUserActionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(virtualDeviceConfig.id, session.configId));

  return updated;
}

/**
 * Resume a paused session
 */
export async function resumeSession(sessionId: string, cronRunId?: string): Promise<DeviceStreamingSession> {
  const [session] = await db
    .select()
    .from(deviceStreamingSessions)
    .where(eq(deviceStreamingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'paused') {
    throw new Error(`Cannot resume session with status: ${session.status}`);
  }

  // Calculate pause duration
  const pausedAt = session.sessionPausedAt ? new Date(session.sessionPausedAt).getTime() : Date.now();
  const pauseDuration = Date.now() - pausedAt;
  const newTotalPausedMs = (session.totalPausedMs || 0) + pauseDuration;

  // Recalculate expected completion
  const deviceType = session.deviceType as 'fish' | 'plant';
  const expectedCompletionAt = calculateExpectedCompletion(
    new Date(session.sessionStartedAt),
    newTotalPausedMs,
    deviceType
  );

  const previousStatus = session.status;

  const [updated] = await db
    .update(deviceStreamingSessions)
    .set({
      status: 'active',
      sessionPausedAt: null,
      totalPausedMs: newTotalPausedMs,
      expectedCompletionAt,
      updatedAt: new Date(),
    })
    .where(eq(deviceStreamingSessions.id, sessionId))
    .returning();

  // Log the resume event
  await logSessionEvent(sessionId, 'session_resumed', {
    triggeredBy: 'user',
    previousStatus,
  }, cronRunId);

  // Update config
  await db
    .update(virtualDeviceConfig)
    .set({
      lastUserAction: 'resume',
      lastUserActionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(virtualDeviceConfig.id, session.configId));

  return updated;
}

/**
 * Mark a session as completed
 */
export async function completeSession(sessionId: string, cronRunId?: string): Promise<DeviceStreamingSession> {
  const [updated] = await db
    .update(deviceStreamingSessions)
    .set({
      status: 'completed',
      sessionCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(deviceStreamingSessions.id, sessionId))
    .returning();

  // Log the completion event
  await logSessionEvent(sessionId, 'session_completed', {
    reason: 'Dataset streaming completed',
  }, cronRunId);

  return updated;
}

/**
 * Mark a session as failed
 */
export async function failSession(sessionId: string, reason: string, cronRunId?: string): Promise<DeviceStreamingSession> {
  const [updated] = await db
    .update(deviceStreamingSessions)
    .set({
      status: 'failed',
      lastErrorMessage: reason,
      lastErrorAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(deviceStreamingSessions.id, sessionId))
    .returning();

  // Log the failure event
  await logSessionEvent(sessionId, 'session_failed', {
    reason,
  }, cronRunId);

  return updated;
}

/**
 * Reset a session (create new one, optionally delete data)
 */
export async function resetSession(
  configId: string,
  deviceType: 'fish' | 'plant',
  retainData: boolean,
  cronRunId?: string
): Promise<DeviceStreamingSession> {
  // Find the current session
  const updateField = deviceType === 'fish' ? 'fishSessionId' : 'plantSessionId';
  const [config] = await db
    .select()
    .from(virtualDeviceConfig)
    .where(eq(virtualDeviceConfig.id, configId))
    .limit(1);

  if (!config) {
    throw new Error('Config not found');
  }

  const oldSessionId = deviceType === 'fish' ? config.fishSessionId : config.plantSessionId;

  // If not retaining data, delete readings and events
  if (!retainData && oldSessionId) {
    // Delete event logs for the old session
    await deleteSessionEvents(oldSessionId);

    // Get device ID to delete readings
    const deviceId = deviceType === 'fish' ? config.fishDeviceId : config.plantDeviceId;

    if (deviceId) {
      if (deviceType === 'fish') {
        await db.delete(fishReadings).where(eq(fishReadings.deviceId, deviceId));
      } else {
        await db.delete(plantReadings).where(eq(plantReadings.deviceId, deviceId));
      }
    }
  }

  // Log reset event on old session if it exists
  if (oldSessionId) {
    await logSessionEvent(oldSessionId, 'dataset_reset' as any, {
      reason: retainData ? 'Reset with data retention' : 'Reset with data deletion',
      retainData,
      triggeredBy: 'user',
    }, cronRunId);

    // Mark old session as completed/superseded
    await db
      .update(deviceStreamingSessions)
      .set({
        status: 'completed',
        sessionCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deviceStreamingSessions.id, oldSessionId));
  }

  // Create new session
  const newSession = await createSession(configId, deviceType, cronRunId);

  return newSession;
}

/**
 * Update session progress after sending data
 */
export async function updateSessionProgress(
  sessionId: string,
  lastRowSent: number,
  rowsStreamedIncrement: number
): Promise<void> {
  await db
    .update(deviceStreamingSessions)
    .set({
      lastRowSent,
      rowsStreamed: rowsStreamedIncrement,
      lastDataSentAt: new Date(),
      consecutiveErrors: 0, // Reset consecutive errors on success
      updatedAt: new Date(),
    })
    .where(eq(deviceStreamingSessions.id, sessionId));
}

/**
 * Record an error on a session
 */
export async function recordSessionError(
  sessionId: string,
  errorMessage: string
): Promise<{ errorCount: number; consecutiveErrors: number; shouldFail: boolean }> {
  const [session] = await db
    .select()
    .from(deviceStreamingSessions)
    .where(eq(deviceStreamingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error('Session not found');
  }

  const newErrorCount = (session.errorCount || 0) + 1;
  const newConsecutiveErrors = (session.consecutiveErrors || 0) + 1;
  const shouldFail = newConsecutiveErrors >= 10; // Fail after 10 consecutive errors

  await db
    .update(deviceStreamingSessions)
    .set({
      errorCount: newErrorCount,
      consecutiveErrors: newConsecutiveErrors,
      lastErrorAt: new Date(),
      lastErrorMessage: errorMessage,
      status: shouldFail ? 'failed' : session.status,
      updatedAt: new Date(),
    })
    .where(eq(deviceStreamingSessions.id, sessionId));

  return { errorCount: newErrorCount, consecutiveErrors: newConsecutiveErrors, shouldFail };
}

/**
 * Get or create session for a config
 */
export async function getOrCreateSession(
  config: VirtualDeviceConfig,
  deviceType: 'fish' | 'plant'
): Promise<DeviceStreamingSession | null> {
  const sessionId = deviceType === 'fish' ? config.fishSessionId : config.plantSessionId;
  const deviceId = deviceType === 'fish' ? config.fishDeviceId : config.plantDeviceId;

  // No device configured
  if (!deviceId) {
    return null;
  }

  // Check if session exists and is active
  if (sessionId) {
    const [session] = await db
      .select()
      .from(deviceStreamingSessions)
      .where(eq(deviceStreamingSessions.id, sessionId))
      .limit(1);

    if (session && (session.status === 'active' || session.status === 'paused')) {
      return session;
    }
  }

  // Create new session if config is enabled
  if (config.enabled) {
    return createSession(config.id, deviceType);
  }

  return null;
}
