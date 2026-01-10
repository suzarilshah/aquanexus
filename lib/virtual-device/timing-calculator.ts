import { parseFishCSV, parsePlantCSV, parseCSVTimestamp, FishDataRow, PlantDataRow } from './csv-parser';
import type { DeviceStreamingSession } from '@/lib/db/schema';

export interface DueReadings {
  rows: (FishDataRow | PlantDataRow)[];
  fromIndex: number;
  toIndex: number;
  count: number;
  isComplete: boolean;
}

/**
 * Calculate which readings are "due" based on session elapsed time.
 * Implements 1:1 timing - real elapsed time maps to dataset time.
 *
 * Example: If 5 hours have passed since session start, we should be at CSV row 2
 * (the second reading, which is ~5 hours after the first in the dataset).
 */
export function getDueReadings(
  session: DeviceStreamingSession,
  deviceType: 'fish' | 'plant'
): DueReadings {
  const csvData = deviceType === 'fish' ? parseFishCSV() : parsePlantCSV();

  // Time elapsed since streaming started
  const now = Date.now();
  const sessionStartMs = new Date(session.sessionStartedAt).getTime();
  const elapsedMs = now - sessionStartMs;

  // Account for any paused time
  let totalPausedMs = session.totalPausedMs || 0;

  // If session is currently paused, don't include time since pause
  if (session.status === 'paused' && session.sessionPausedAt) {
    const pausedAt = new Date(session.sessionPausedAt).getTime();
    const additionalPauseTime = now - pausedAt;
    totalPausedMs += additionalPauseTime;
  }

  const effectiveElapsedMs = Math.max(0, elapsedMs - totalPausedMs);

  // Dataset time calculations
  const datasetStartMs = csvData.firstTimestamp.getTime();

  // Current position in dataset time (as if we started at the beginning of the dataset)
  const currentDatasetTimeMs = datasetStartMs + effectiveElapsedMs;

  // Find all rows that are due but haven't been sent yet
  const lastRowSent = session.lastRowSent || 0;
  const dueRows: (FishDataRow | PlantDataRow)[] = [];
  let maxDueIndex = lastRowSent;

  for (let i = lastRowSent; i < csvData.totalRows; i++) {
    const row = csvData.rows[i];
    const rowTimeMs = parseCSVTimestamp(row.timestamp).getTime();

    if (rowTimeMs <= currentDatasetTimeMs) {
      dueRows.push(row);
      maxDueIndex = i + 1; // Next index to process
    } else {
      // Once we find a row that's not due yet, stop
      break;
    }
  }

  const isComplete = maxDueIndex >= csvData.totalRows;

  return {
    rows: dueRows,
    fromIndex: lastRowSent,
    toIndex: maxDueIndex,
    count: dueRows.length,
    isComplete,
  };
}

/**
 * Calculate the expected completion date for a session
 */
export function calculateExpectedCompletion(
  sessionStartedAt: Date,
  totalPausedMs: number,
  deviceType: 'fish' | 'plant'
): Date {
  const csvData = deviceType === 'fish' ? parseFishCSV() : parsePlantCSV();
  const datasetDurationMs = csvData.datasetDurationMs;

  // Expected completion = session start + dataset duration + any paused time
  const expectedCompletionMs = sessionStartedAt.getTime() + datasetDurationMs + totalPausedMs;

  return new Date(expectedCompletionMs);
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(session: DeviceStreamingSession): {
  percentage: number;
  rowsStreamed: number;
  totalRows: number;
  timeRemainingMs: number;
  estimatedCompletion: Date;
} {
  const totalRows = session.totalRows || 0;
  const rowsStreamed = session.lastRowSent || 0;
  const percentage = totalRows > 0 ? (rowsStreamed / totalRows) * 100 : 0;

  // Calculate time remaining
  const deviceType = session.deviceType as 'fish' | 'plant';
  const csvData = deviceType === 'fish' ? parseFishCSV() : parsePlantCSV();

  // Get remaining dataset duration
  if (rowsStreamed >= totalRows) {
    return {
      percentage: 100,
      rowsStreamed,
      totalRows,
      timeRemainingMs: 0,
      estimatedCompletion: new Date(),
    };
  }

  const currentRowTimestamp = rowsStreamed > 0
    ? parseCSVTimestamp(csvData.rows[rowsStreamed - 1].timestamp)
    : csvData.firstTimestamp;

  const lastRowTimestamp = csvData.lastTimestamp;
  const remainingDatasetMs = lastRowTimestamp.getTime() - currentRowTimestamp.getTime();

  const estimatedCompletion = new Date(Date.now() + remainingDatasetMs + (session.totalPausedMs || 0));

  return {
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
    rowsStreamed,
    totalRows,
    timeRemainingMs: remainingDatasetMs,
    estimatedCompletion,
  };
}

/**
 * Get the next row's timestamp to determine when it will be due
 */
export function getNextRowDueTime(
  session: DeviceStreamingSession,
  deviceType: 'fish' | 'plant'
): Date | null {
  const csvData = deviceType === 'fish' ? parseFishCSV() : parsePlantCSV();
  const nextRowIndex = session.lastRowSent || 0;

  if (nextRowIndex >= csvData.totalRows) {
    return null; // No more rows
  }

  const nextRow = csvData.rows[nextRowIndex];
  const nextRowDatasetTime = parseCSVTimestamp(nextRow.timestamp);

  // Calculate when this row will be due in real time
  const datasetStartMs = csvData.firstTimestamp.getTime();
  const rowOffsetMs = nextRowDatasetTime.getTime() - datasetStartMs;

  const sessionStartMs = new Date(session.sessionStartedAt).getTime();
  const dueTimeMs = sessionStartMs + rowOffsetMs + (session.totalPausedMs || 0);

  return new Date(dueTimeMs);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Get time ago string
 */
export function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}
