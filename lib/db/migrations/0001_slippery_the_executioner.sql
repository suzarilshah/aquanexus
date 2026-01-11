CREATE TYPE "public"."growth_stage" AS ENUM('seedling', 'vegetative', 'flowering', 'fruiting', 'harvest');--> statement-breakpoint
CREATE TYPE "public"."prediction_horizon" AS ENUM('short', 'medium');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'paused', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "cron_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"trigger_source" varchar(50),
	"configs_processed" integer DEFAULT 0,
	"sessions_processed" integer DEFAULT 0,
	"readings_sent" integer DEFAULT 0,
	"errors_encountered" integer DEFAULT 0,
	"processed_configs" jsonb,
	"processed_sessions" jsonb,
	"error_details" jsonb,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cron_execution_logs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "cron_health_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last_cron_success_at" timestamp,
	"last_cron_attempt_at" timestamp,
	"last_cron_error" text,
	"cron_status" varchar(20) DEFAULT 'unknown' NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"total_success_count" integer DEFAULT 0 NOT NULL,
	"total_failure_count" integer DEFAULT 0 NOT NULL,
	"sync_status" varchar(20) DEFAULT 'unknown' NOT NULL,
	"last_sync_at" timestamp,
	"last_sync_error" text,
	"active_devices_count" integer DEFAULT 0 NOT NULL,
	"active_sessions_count" integer DEFAULT 0 NOT NULL,
	"orphaned_sessions_count" integer DEFAULT 0 NOT NULL,
	"alert_on_failure" boolean DEFAULT true NOT NULL,
	"alert_threshold_minutes" integer DEFAULT 360 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_healthchecks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"device_name" varchar(255),
	"device_type" varchar(50),
	"mac_address" varchar(17),
	"firmware_version" varchar(50),
	"board_type" varchar(100),
	"chip_id" varchar(50),
	"free_heap" integer,
	"heap_size" integer,
	"min_free_heap" integer,
	"uptime_ms" integer,
	"cpu_frequency" integer,
	"wifi_connected" boolean,
	"wifi_ssid" varchar(64),
	"wifi_rssi" integer,
	"wifi_ip" varchar(45),
	"wifi_gateway" varchar(45),
	"wifi_dns" varchar(45),
	"wifi_reconnect_count" integer,
	"connection_success_count" integer,
	"connection_fail_count" integer,
	"consecutive_errors" integer,
	"last_error" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_streaming_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"device_type" varchar(10) NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"total_rows" integer NOT NULL,
	"last_row_sent" integer DEFAULT 0 NOT NULL,
	"rows_streamed" integer DEFAULT 0 NOT NULL,
	"session_started_at" timestamp NOT NULL,
	"session_paused_at" timestamp,
	"total_paused_ms" integer DEFAULT 0 NOT NULL,
	"session_completed_at" timestamp,
	"last_data_sent_at" timestamp,
	"expected_completion_at" timestamp,
	"error_count" integer DEFAULT 0 NOT NULL,
	"consecutive_errors" integer DEFAULT 0 NOT NULL,
	"last_error_at" timestamp,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hourly_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"hour" timestamp NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"avg_value" numeric(10, 4),
	"min_value" numeric(10, 4),
	"max_value" numeric(10, 4),
	"std_dev" numeric(10, 4),
	"sample_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ml_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_type" varchar(50) NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"trained_at" timestamp NOT NULL,
	"metrics" jsonb,
	"hyperparameters" jsonb,
	"model_path" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_growth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"measured_at" timestamp NOT NULL,
	"height" numeric(6, 2) NOT NULL,
	"growth_rate" numeric(6, 4),
	"growth_stage" "growth_stage",
	"days_from_planting" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"prediction_horizon" "prediction_horizon" NOT NULL,
	"predicted_values" jsonb NOT NULL,
	"actual_values" jsonb,
	"model_version" varchar(50),
	"accuracy" numeric(5, 4),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_event_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_details" jsonb,
	"data_row_index" integer,
	"csv_timestamp" varchar(50),
	"sensor_values" jsonb,
	"cron_run_id" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_datasets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid,
	"dataset_type" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"record_count" integer NOT NULL,
	"features" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "virtual_device_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"fish_device_id" uuid,
	"plant_device_id" uuid,
	"data_source" varchar(50) DEFAULT 'training',
	"speed_multiplier" integer DEFAULT 1,
	"current_fish_index" integer DEFAULT 0,
	"current_plant_index" integer DEFAULT 0,
	"last_streamed_at" timestamp,
	"fish_session_id" uuid,
	"plant_session_id" uuid,
	"data_retention_on_reset" varchar(20) DEFAULT 'ask',
	"notify_on_completion" boolean DEFAULT true,
	"notify_on_error" boolean DEFAULT true,
	"last_user_action" varchar(50),
	"last_user_action_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fish_readings" ADD COLUMN "ec_value" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "plant_readings" ADD COLUMN "pressure" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "plant_readings" ADD COLUMN "height" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "cron_health_metrics" ADD CONSTRAINT "cron_health_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_healthchecks" ADD CONSTRAINT "device_healthchecks_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hourly_aggregates" ADD CONSTRAINT "hourly_aggregates_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_growth" ADD CONSTRAINT "plant_growth_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_event_logs" ADD CONSTRAINT "streaming_event_logs_session_id_device_streaming_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."device_streaming_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_datasets" ADD CONSTRAINT "training_datasets_model_id_ml_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ml_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_device_config" ADD CONSTRAINT "virtual_device_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_device_config" ADD CONSTRAINT "virtual_device_config_fish_device_id_devices_id_fk" FOREIGN KEY ("fish_device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_device_config" ADD CONSTRAINT "virtual_device_config_plant_device_id_devices_id_fk" FOREIGN KEY ("plant_device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_device_config" ADD CONSTRAINT "virtual_device_config_fish_session_id_device_streaming_sessions_id_fk" FOREIGN KEY ("fish_session_id") REFERENCES "public"."device_streaming_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_device_config" ADD CONSTRAINT "virtual_device_config_plant_session_id_device_streaming_sessions_id_fk" FOREIGN KEY ("plant_session_id") REFERENCES "public"."device_streaming_sessions"("id") ON DELETE no action ON UPDATE no action;