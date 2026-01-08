CREATE TYPE "public"."alert_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('online', 'offline', 'warning');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('fish', 'plant');--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"model1_verdict" jsonb,
	"model2_verdict" jsonb,
	"consensus_verdict" jsonb,
	"agreement_score" numeric(3, 2),
	"error_margin" numeric(3, 2),
	"time_range" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"model1_name" varchar(100) DEFAULT 'gpt-o3-mini',
	"model1_endpoint" text,
	"model1_api_key" text,
	"model1_api_version" varchar(50),
	"model2_name" varchar(100) DEFAULT 'deepseek-r1',
	"model2_endpoint" text,
	"model2_api_key" text,
	"model2_api_version" varchar(50),
	"consensus_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"message" text NOT NULL,
	"value" numeric(10, 2),
	"threshold" numeric(10, 2),
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_mac" varchar(17) NOT NULL,
	"device_name" varchar(255) NOT NULL,
	"device_type" "device_type" NOT NULL,
	"api_key" varchar(64) NOT NULL,
	"status" "device_status" DEFAULT 'offline' NOT NULL,
	"last_seen" timestamp,
	"reading_interval" integer DEFAULT 300 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_device_mac_unique" UNIQUE("device_mac")
);
--> statement-breakpoint
CREATE TABLE "fish_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"temperature" numeric(5, 2),
	"ph" numeric(4, 2),
	"dissolved_oxygen" numeric(5, 2),
	"turbidity" numeric(6, 2),
	"tds" numeric(7, 2),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"soil_moisture" numeric(5, 2),
	"light_level" numeric(8, 2),
	"temperature" numeric(5, 2),
	"humidity" numeric(5, 2),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_config" ADD CONSTRAINT "ai_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fish_readings" ADD CONSTRAINT "fish_readings_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_readings" ADD CONSTRAINT "plant_readings_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;