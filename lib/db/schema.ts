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

// Fish readings table
export const fishReadings = pgTable('fish_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  temperature: decimal('temperature', { precision: 5, scale: 2 }),
  ph: decimal('ph', { precision: 4, scale: 2 }),
  dissolvedOxygen: decimal('dissolved_oxygen', { precision: 5, scale: 2 }),
  turbidity: decimal('turbidity', { precision: 6, scale: 2 }),
  tds: decimal('tds', { precision: 7, scale: 2 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Plant readings table
export const plantReadings = pgTable('plant_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  soilMoisture: decimal('soil_moisture', { precision: 5, scale: 2 }),
  lightLevel: decimal('light_level', { precision: 8, scale: 2 }),
  temperature: decimal('temperature', { precision: 5, scale: 2 }),
  humidity: decimal('humidity', { precision: 5, scale: 2 }),
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
  model2Name: varchar('model2_name', { length: 100 }).default('deepseek-r1'),
  model2Endpoint: text('model2_endpoint'),
  model2ApiKey: text('model2_api_key'),
  consensusEnabled: boolean('consensus_enabled').default(true).notNull(),
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
