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
