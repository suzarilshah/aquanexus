import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  integer,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enums
export const deviceTypeEnum = pgEnum('device_type', ['fish', 'plant']);
export const deviceStatusEnum = pgEnum('device_status', ['online', 'offline', 'warning']);
export const alertSeverityEnum = pgEnum('alert_severity', ['low', 'medium', 'high', 'critical']);
export const predictionHorizonEnum = pgEnum('prediction_horizon', ['short', 'medium']);
export const growthStageEnum = pgEnum('growth_stage', ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Devices table
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceMac: varchar('device_mac', { length: 17 }).unique().notNull(),
  deviceName: varchar('device_name', { length: 255 }).notNull(),
  deviceType: deviceTypeEnum('device_type').notNull(),
  apiKey: varchar('api_key', { length: 64 }).notNull(),
  status: deviceStatusEnum('status').default('offline').notNull(),
  lastSeen: timestamp('last_seen'),
  readingInterval: integer('reading_interval').default(300).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Fish readings table - matches CSV columns:
// Water Temperature(°C), EC Values(µS/cm), TDS(mg/L), Turbidity(NTU), Water pH
export const fishReadings = pgTable('fish_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  temperature: decimal('temperature', { precision: 5, scale: 2 }), // Water Temperature from DS18B20 (°C)
  ph: decimal('ph', { precision: 4, scale: 2 }), // Water pH from generic pH sensor
  dissolvedOxygen: decimal('dissolved_oxygen', { precision: 5, scale: 2 }), // DO (mg/L) - optional
  turbidity: decimal('turbidity', { precision: 6, scale: 2 }), // Turbidity sensor (NTU)
  tds: decimal('tds', { precision: 7, scale: 2 }), // Total Dissolved Solids (mg/L)
  ecValue: decimal('ec_value', { precision: 8, scale: 2 }), // Electrical Conductivity (µS/cm) from TDS sensor
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Plant readings table - matches CSV columns:
// Height of the Plant(cm), Plant Temperature(°C), Humidity(RH), Pressure(Pa)
export const plantReadings = pgTable('plant_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  soilMoisture: decimal('soil_moisture', { precision: 5, scale: 2 }), // Optional for future use
  lightLevel: decimal('light_level', { precision: 8, scale: 2 }), // Optional for future use
  temperature: decimal('temperature', { precision: 5, scale: 2 }), // Plant Temperature from BME280 (°C)
  humidity: decimal('humidity', { precision: 5, scale: 2 }), // Humidity from BME280 (RH%)
  pressure: decimal('pressure', { precision: 10, scale: 2 }), // Pressure from BME280 (Pa)
  height: decimal('height', { precision: 6, scale: 2 }), // Plant height in cm (ultrasonic sensor) - PRIMARY TARGET
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Alerts table
export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  message: text('message').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }),
  threshold: decimal('threshold', { precision: 10, scale: 2 }),
  resolved: boolean('resolved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI analysis results table
export const aiAnalyses = pgTable('ai_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  model1Verdict: jsonb('model1_verdict'),
  model2Verdict: jsonb('model2_verdict'),
  consensusVerdict: jsonb('consensus_verdict'),
  agreementScore: decimal('agreement_score', { precision: 3, scale: 2 }),
  errorMargin: decimal('error_margin', { precision: 3, scale: 2 }),
  timeRange: varchar('time_range', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI configuration table
export const aiConfig = pgTable('ai_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  model1Name: varchar('model1_name', { length: 100 }).default('gpt-o3-mini'),
  model1Endpoint: text('model1_endpoint'),
  model1ApiKey: text('model1_api_key'),
  model1ApiVersion: varchar('model1_api_version', { length: 50 }),
  model2Name: varchar('model2_name', { length: 100 }).default('deepseek-r1'),
  model2Endpoint: text('model2_endpoint'),
  model2ApiKey: text('model2_api_key'),
  model2ApiVersion: varchar('model2_api_version', { length: 50 }),
  consensusEnabled: boolean('consensus_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Plant growth analysis table - tracks height measurements and growth rate
export const plantGrowth = pgTable('plant_growth', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  measuredAt: timestamp('measured_at').notNull(),
  height: decimal('height', { precision: 6, scale: 2 }).notNull(), // Height in cm
  growthRate: decimal('growth_rate', { precision: 6, scale: 4 }), // Growth rate in cm/day
  growthStage: growthStageEnum('growth_stage'),
  daysFromPlanting: integer('days_from_planting'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ML predictions table - stores forecasts from LSTM model
export const predictions = pgTable('predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  metricType: varchar('metric_type', { length: 50 }).notNull(), // 'height', 'temperature', etc.
  predictionHorizon: predictionHorizonEnum('prediction_horizon').notNull(),
  predictedValues: jsonb('predicted_values').notNull(), // Array of {timestamp, value, confidence}
  actualValues: jsonb('actual_values'), // Filled in later for accuracy tracking
  modelVersion: varchar('model_version', { length: 50 }),
  accuracy: decimal('accuracy', { precision: 5, scale: 4 }), // MAPE or similar metric
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ML model metadata table - tracks trained models
export const mlModels = pgTable('ml_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelType: varchar('model_type', { length: 50 }).notNull(), // 'lstm_height', 'lstm_fish_temp', etc.
  modelVersion: varchar('model_version', { length: 50 }).notNull(),
  trainedAt: timestamp('trained_at').notNull(),
  metrics: jsonb('metrics'), // {mse, mae, r2, etc.}
  hyperparameters: jsonb('hyperparameters'), // {layers, units, dropout, etc.}
  modelPath: text('model_path'), // Storage path (Vercel Blob/S3)
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Enum for streaming session status
export const sessionStatusEnum = pgEnum('session_status', ['active', 'paused', 'completed', 'failed']);

// Device streaming sessions table - track streaming sessions
export const deviceStreamingSessions = pgTable('device_streaming_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  configId: uuid('config_id').notNull(), // Will reference virtualDeviceConfig
  deviceType: varchar('device_type', { length: 10 }).notNull(), // 'fish' | 'plant'

  // Session status
  status: sessionStatusEnum('status').default('active').notNull(),

  // Progress tracking
  totalRows: integer('total_rows').notNull(),
  lastRowSent: integer('last_row_sent').default(0).notNull(),
  rowsStreamed: integer('rows_streamed').default(0).notNull(),

  // Timing
  sessionStartedAt: timestamp('session_started_at').notNull(),
  sessionPausedAt: timestamp('session_paused_at'),
  totalPausedMs: integer('total_paused_ms').default(0).notNull(),
  sessionCompletedAt: timestamp('session_completed_at'),
  lastDataSentAt: timestamp('last_data_sent_at'),
  expectedCompletionAt: timestamp('expected_completion_at'),

  // Error tracking
  errorCount: integer('error_count').default(0).notNull(),
  consecutiveErrors: integer('consecutive_errors').default(0).notNull(),
  lastErrorAt: timestamp('last_error_at'),
  lastErrorMessage: text('last_error_message'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Streaming event logs table - comprehensive event logging
export const streamingEventLogs = pgTable('streaming_event_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => deviceStreamingSessions.id).notNull(),

  eventType: varchar('event_type', { length: 50 }).notNull(),
  // Event types:
  // - session_started, session_paused, session_resumed, session_completed, session_failed
  // - data_sent (each reading), data_batch_sent (group of readings)
  // - dataset_reset, dataset_loop_started
  // - error_occurred, error_recovered
  // - cron_triggered

  // Event details
  eventDetails: jsonb('event_details'), // Flexible JSON for event-specific data
  dataRowIndex: integer('data_row_index'), // Which CSV row
  csvTimestamp: varchar('csv_timestamp', { length: 50 }), // Original timestamp from CSV
  sensorValues: jsonb('sensor_values'), // The actual sensor data sent

  // Grouping
  cronRunId: varchar('cron_run_id', { length: 50 }), // Group events by cron execution

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Cron execution logs table - track each cron run
export const cronExecutionLogs = pgTable('cron_execution_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: varchar('run_id', { length: 50 }).unique().notNull(),

  status: varchar('status', { length: 20 }).notNull(), // started, completed, failed
  triggerSource: varchar('trigger_source', { length: 50 }), // cron-job.org, manual, vercel-cron

  // Metrics
  configsProcessed: integer('configs_processed').default(0),
  sessionsProcessed: integer('sessions_processed').default(0),
  readingsSent: integer('readings_sent').default(0),
  errorsEncountered: integer('errors_encountered').default(0),

  // Details
  processedConfigs: jsonb('processed_configs'), // Array of config IDs processed
  processedSessions: jsonb('processed_sessions'), // Array of session IDs processed
  errorDetails: jsonb('error_details'), // Array of error objects

  // Timing
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Virtual device configuration table - for server-side streaming
export const virtualDeviceConfig = pgTable('virtual_device_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  enabled: boolean('enabled').default(false).notNull(),
  fishDeviceId: uuid('fish_device_id').references(() => devices.id),
  plantDeviceId: uuid('plant_device_id').references(() => devices.id),
  dataSource: varchar('data_source', { length: 50 }).default('training'),
  speedMultiplier: integer('speed_multiplier').default(1),
  currentFishIndex: integer('current_fish_index').default(0),
  currentPlantIndex: integer('current_plant_index').default(0),
  lastStreamedAt: timestamp('last_streamed_at'),

  // Session management
  fishSessionId: uuid('fish_session_id').references(() => deviceStreamingSessions.id),
  plantSessionId: uuid('plant_session_id').references(() => deviceStreamingSessions.id),

  // User preferences
  dataRetentionOnReset: varchar('data_retention_on_reset', { length: 20 }).default('ask'), // retain, delete, ask
  notifyOnCompletion: boolean('notify_on_completion').default(true),
  notifyOnError: boolean('notify_on_error').default(true),

  // Action tracking
  lastUserAction: varchar('last_user_action', { length: 50 }),
  lastUserActionAt: timestamp('last_user_action_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Training datasets table - tracks data used for training
export const trainingDatasets = pgTable('training_datasets', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: uuid('model_id').references(() => mlModels.id),
  datasetType: varchar('dataset_type', { length: 50 }).notNull(), // 'fish', 'plant', 'height'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  recordCount: integer('record_count').notNull(),
  features: jsonb('features'), // List of features used
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Hourly aggregates table - for faster ML queries
export const hourlyAggregates = pgTable('hourly_aggregates', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  hour: timestamp('hour').notNull(),
  metricType: varchar('metric_type', { length: 50 }).notNull(),
  avgValue: decimal('avg_value', { precision: 10, scale: 4 }),
  minValue: decimal('min_value', { precision: 10, scale: 4 }),
  maxValue: decimal('max_value', { precision: 10, scale: 4 }),
  stdDev: decimal('std_dev', { precision: 10, scale: 4 }),
  sampleCount: integer('sample_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Cron health metrics table - track cron job health and synchronization status
export const cronHealthMetrics = pgTable('cron_health_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // Last successful cron execution
  lastCronSuccessAt: timestamp('last_cron_success_at'),
  lastCronAttemptAt: timestamp('last_cron_attempt_at'),
  lastCronError: text('last_cron_error'),

  // Health status
  cronStatus: varchar('cron_status', { length: 20 }).default('unknown').notNull(), // healthy, degraded, failed, unknown
  consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
  totalSuccessCount: integer('total_success_count').default(0).notNull(),
  totalFailureCount: integer('total_failure_count').default(0).notNull(),

  // Sync status
  syncStatus: varchar('sync_status', { length: 20 }).default('unknown').notNull(), // synced, out_of_sync, syncing, unknown
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncError: text('last_sync_error'),

  // Device status snapshot
  activeDevicesCount: integer('active_devices_count').default(0).notNull(),
  activeSessionsCount: integer('active_sessions_count').default(0).notNull(),
  orphanedSessionsCount: integer('orphaned_sessions_count').default(0).notNull(),

  // Alert settings
  alertOnFailure: boolean('alert_on_failure').default(true).notNull(),
  alertThresholdMinutes: integer('alert_threshold_minutes').default(360).notNull(), // 6 hours default (slightly more than 5-hour interval)

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type FishReading = typeof fishReadings.$inferSelect;
export type NewFishReading = typeof fishReadings.$inferInsert;
export type PlantReading = typeof plantReadings.$inferSelect;
export type NewPlantReading = typeof plantReadings.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type AIAnalysis = typeof aiAnalyses.$inferSelect;
export type NewAIAnalysis = typeof aiAnalyses.$inferInsert;
export type AIConfig = typeof aiConfig.$inferSelect;
export type NewAIConfig = typeof aiConfig.$inferInsert;
export type PlantGrowth = typeof plantGrowth.$inferSelect;
export type NewPlantGrowth = typeof plantGrowth.$inferInsert;
export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
export type MLModel = typeof mlModels.$inferSelect;
export type NewMLModel = typeof mlModels.$inferInsert;
export type TrainingDataset = typeof trainingDatasets.$inferSelect;
export type NewTrainingDataset = typeof trainingDatasets.$inferInsert;
export type HourlyAggregate = typeof hourlyAggregates.$inferSelect;
export type NewHourlyAggregate = typeof hourlyAggregates.$inferInsert;
export type VirtualDeviceConfig = typeof virtualDeviceConfig.$inferSelect;
export type NewVirtualDeviceConfig = typeof virtualDeviceConfig.$inferInsert;
export type DeviceStreamingSession = typeof deviceStreamingSessions.$inferSelect;
export type NewDeviceStreamingSession = typeof deviceStreamingSessions.$inferInsert;
export type StreamingEventLog = typeof streamingEventLogs.$inferSelect;
export type NewStreamingEventLog = typeof streamingEventLogs.$inferInsert;
export type CronExecutionLog = typeof cronExecutionLogs.$inferSelect;
export type NewCronExecutionLog = typeof cronExecutionLogs.$inferInsert;
export type CronHealthMetrics = typeof cronHealthMetrics.$inferSelect;
export type NewCronHealthMetrics = typeof cronHealthMetrics.$inferInsert;
