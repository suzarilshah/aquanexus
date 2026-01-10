import { db } from '@/lib/db';
import {
  streamingEventLogs,
  cronExecutionLogs,
  deviceStreamingSessions,
  NewStreamingEventLog,
  NewCronExecutionLog,
} from '@/lib/db/schema';
import { eq, desc, and, gte, lte, or, sql } from 'drizzle-orm';
// Generate unique run ID without external dependency
function generateRunId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

// Event types
export type StreamingEventType =
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_completed'
  | 'session_failed'
  | 'data_sent'
  | 'data_batch_sent'
  | 'dataset_reset'
  | 'dataset_loop_started'
  | 'error_occurred'
  | 'error_recovered'
  | 'cron_triggered'
  | 'manual_sync_triggered'
  | 'sync_completed';

// Event details interfaces
export interface DataSentDetails {
  deviceType: 'fish' | 'plant';
  rowIndex: number;
  csvTimestamp: string;
  sensorValues: Record<string, number>;
  telemetryResponseStatus?: number;
}

export interface DataBatchSentDetails {
  deviceType: 'fish' | 'plant';
  startIndex: number;
  endIndex: number;
  count: number;
  duration: number;
}

export interface ErrorDetails {
  error: string;
  errorCode?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface SessionEventDetails {
  reason?: string;
  triggeredBy?: string;
  previousStatus?: string;
  retainData?: boolean;
}

/**
 * Log a streaming event
 */
export async function logStreamingEvent(
  sessionId: string,
  eventType: StreamingEventType,
  options?: {
    eventDetails?: Record<string, unknown>;
    dataRowIndex?: number;
    csvTimestamp?: string;
    sensorValues?: Record<string, unknown>;
    cronRunId?: string;
  }
): Promise<string> {
  const event: NewStreamingEventLog = {
    sessionId,
    eventType,
    eventDetails: options?.eventDetails || null,
    dataRowIndex: options?.dataRowIndex ?? null,
    csvTimestamp: options?.csvTimestamp || null,
    sensorValues: options?.sensorValues || null,
    cronRunId: options?.cronRunId || null,
  };

  const [inserted] = await db.insert(streamingEventLogs).values(event).returning({ id: streamingEventLogs.id });
  return inserted.id;
}

/**
 * Log a data_sent event with sensor values
 */
export async function logDataSent(
  sessionId: string,
  details: DataSentDetails,
  cronRunId?: string
): Promise<string> {
  return logStreamingEvent(sessionId, 'data_sent', {
    eventDetails: {
      deviceType: details.deviceType,
      telemetryResponseStatus: details.telemetryResponseStatus,
    },
    dataRowIndex: details.rowIndex,
    csvTimestamp: details.csvTimestamp,
    sensorValues: details.sensorValues,
    cronRunId,
  });
}

/**
 * Log a batch of data sent
 */
export async function logDataBatchSent(
  sessionId: string,
  details: DataBatchSentDetails,
  cronRunId?: string
): Promise<string> {
  return logStreamingEvent(sessionId, 'data_batch_sent', {
    eventDetails: { ...details } as Record<string, unknown>,
    cronRunId,
  });
}

/**
 * Log an error event
 */
export async function logError(
  sessionId: string,
  error: Error | string,
  context?: Record<string, unknown>,
  cronRunId?: string
): Promise<string> {
  const errorDetails: ErrorDetails = {
    error: error instanceof Error ? error.message : error,
    errorCode: error instanceof Error ? (error as Error & { code?: string }).code : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    context,
  };

  return logStreamingEvent(sessionId, 'error_occurred', {
    eventDetails: { ...errorDetails } as Record<string, unknown>,
    cronRunId,
  });
}

/**
 * Log a session lifecycle event
 */
export async function logSessionEvent(
  sessionId: string,
  eventType: 'session_started' | 'session_paused' | 'session_resumed' | 'session_completed' | 'session_failed',
  details?: SessionEventDetails,
  cronRunId?: string
): Promise<string> {
  return logStreamingEvent(sessionId, eventType, {
    eventDetails: details ? { ...details } as Record<string, unknown> : {},
    cronRunId,
  });
}

// ============================================================================
// Cron Execution Logging
// ============================================================================

export interface CronRunContext {
  runId: string;
  startedAt: Date;
  triggerSource: string;
  configsProcessed: string[];
  sessionsProcessed: string[];
  readingsSent: number;
  errors: Array<{ sessionId?: string; error: string; timestamp: Date }>;
}

/**
 * Start a new cron execution log
 */
export async function startCronRun(triggerSource: string = 'cron-job.org'): Promise<CronRunContext> {
  const runId = `cron_${generateRunId()}`;
  const startedAt = new Date();

  const log: NewCronExecutionLog = {
    runId,
    status: 'started',
    triggerSource,
    startedAt,
    configsProcessed: 0,
    sessionsProcessed: 0,
    readingsSent: 0,
    errorsEncountered: 0,
  };

  await db.insert(cronExecutionLogs).values(log);

  return {
    runId,
    startedAt,
    triggerSource,
    configsProcessed: [],
    sessionsProcessed: [],
    readingsSent: 0,
    errors: [],
  };
}

/**
 * Complete a cron execution log
 */
export async function completeCronRun(context: CronRunContext, status: 'completed' | 'failed' = 'completed'): Promise<void> {
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - context.startedAt.getTime();

  await db
    .update(cronExecutionLogs)
    .set({
      status,
      configsProcessed: context.configsProcessed.length,
      sessionsProcessed: context.sessionsProcessed.length,
      readingsSent: context.readingsSent,
      errorsEncountered: context.errors.length,
      processedConfigs: context.configsProcessed,
      processedSessions: context.sessionsProcessed,
      errorDetails: context.errors.length > 0 ? context.errors : null,
      completedAt,
      durationMs,
    })
    .where(eq(cronExecutionLogs.runId, context.runId));
}

/**
 * Add an error to the cron run context
 */
export function addCronError(context: CronRunContext, error: string, sessionId?: string): void {
  context.errors.push({
    sessionId,
    error,
    timestamp: new Date(),
  });
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get recent events for a session
 */
export async function getSessionEvents(
  sessionId: string,
  options?: {
    limit?: number;
    offset?: number;
    eventTypes?: StreamingEventType[];
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{ events: typeof streamingEventLogs.$inferSelect[]; total: number }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const conditions = [eq(streamingEventLogs.sessionId, sessionId)];

  if (options?.eventTypes && options.eventTypes.length > 0) {
    conditions.push(
      or(...options.eventTypes.map(t => eq(streamingEventLogs.eventType, t)))!
    );
  }

  if (options?.startDate) {
    conditions.push(gte(streamingEventLogs.createdAt, options.startDate));
  }

  if (options?.endDate) {
    conditions.push(lte(streamingEventLogs.createdAt, options.endDate));
  }

  const [events, countResult] = await Promise.all([
    db
      .select()
      .from(streamingEventLogs)
      .where(and(...conditions))
      .orderBy(desc(streamingEventLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(streamingEventLogs)
      .where(and(...conditions)),
  ]);

  return {
    events,
    total: Number(countResult[0]?.count || 0),
  };
}

/**
 * Get recent cron executions
 */
export async function getRecentCronRuns(limit: number = 10): Promise<typeof cronExecutionLogs.$inferSelect[]> {
  return db
    .select()
    .from(cronExecutionLogs)
    .orderBy(desc(cronExecutionLogs.startedAt))
    .limit(limit);
}

/**
 * Get event counts by type for a session
 */
export async function getEventCounts(sessionId: string): Promise<Record<string, number>> {
  const results = await db
    .select({
      eventType: streamingEventLogs.eventType,
      count: sql<number>`count(*)`,
    })
    .from(streamingEventLogs)
    .where(eq(streamingEventLogs.sessionId, sessionId))
    .groupBy(streamingEventLogs.eventType);

  return results.reduce((acc, row) => {
    acc[row.eventType] = Number(row.count);
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Delete all events for a session (used during reset with data deletion)
 */
export async function deleteSessionEvents(sessionId: string): Promise<number> {
  const result = await db
    .delete(streamingEventLogs)
    .where(eq(streamingEventLogs.sessionId, sessionId))
    .returning({ id: streamingEventLogs.id });

  return result.length;
}
