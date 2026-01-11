# Virtual Device Environment System

## Overview

The AquaNexus project has migrated from a legacy single-speed virtual device streaming system to a new **multi-environment system** that supports multiple streaming speeds (1X to 100X) with individual CRON jobs per environment.

## Architecture

### New System (Active)
- **Database Table**: `virtualDeviceEnvironments`
- **API Endpoints**:
  - `GET/POST /api/virtual-devices/environments` - List/Create environments
  - `GET/PATCH/DELETE /api/virtual-devices/environments/[id]` - Single environment CRUD
  - `GET/POST /api/cron/virtual-devices/environment?envId=<uuid>` - Environment-specific cron handler
- **Migration API**: `/api/virtual-devices/migrate` - Handles legacy config migration
- **cron-job.org**: Each environment gets its own CRON job running **every 5 HOURS**

### Legacy System (Deprecated/Retired)
- **Database Table**: `virtualDeviceConfig` (still exists but disabled)
- **API Endpoints**: `/api/virtual-devices/*` (marked deprecated with warning logs)
- **CRON Job ID**: 7143071 (disabled and renamed to "[RETIRED]")

## Key Files

### Core Services
- `lib/virtual-device/cronjob-org-client.ts` - cron-job.org API integration
- `lib/virtual-device/migration-service.ts` - Migration utilities
- `lib/virtual-device/csv-parser.ts` - CSV data parsing
- `lib/virtual-device/logging-service.ts` - Event logging

### API Routes
- `app/api/virtual-devices/environments/route.ts` - Environment CRUD
- `app/api/virtual-devices/environments/[id]/route.ts` - Single environment
- `app/api/cron/virtual-devices/environment/route.ts` - New cron handler
- `app/api/virtual-devices/migrate/route.ts` - Migration endpoint

### UI
- `app/(dashboard)/dashboard/settings/page.tsx` - Settings with environment management

## CRON Configuration

**IMPORTANT: All environments run every 5 HOURS** (not 5 minutes) via cron-job.org.

Schedule: `minutes: [0], hours: [0, 5, 10, 15, 20]`
- Runs at: 00:00, 05:00, 10:00, 15:00, 20:00 UTC

This matches the original CSV data interval where readings are taken every 5 hours.

## Streaming Speed Options

The speed setting controls how many CSV rows are processed per 5-hour trigger:

| Speed | Readings per Trigger | Time to Complete 440 rows |
|-------|---------------------|--------------------------|
| 1X    | 1                   | ~92 days (real-time)     |
| 2X    | 2                   | ~46 days                 |
| 5X    | 5                   | ~18 days                 |
| 10X   | 10                  | ~9 days                  |
| 20X   | 20                  | ~5 days                  |
| 100X  | 100                 | ~22 hours                |

## Migration Process

1. User visits `/dashboard/settings`
2. Migration banner appears if legacy config exists without environments
3. User clicks "Migrate Now"
4. System creates new environment from legacy config
5. New CRON job created on cron-job.org with 5-hour schedule
6. Legacy config marked as disabled

## API Keys

- **cron-job.org API Key**: `3KjxViJoTMHiXOnOA38QdIIErIFgUTpH7HqCzqMMxhk=`
- Used for authenticating both CRON triggers and API calls to cron-job.org

## Current Active CRON Jobs (as of migration)

| Job ID | Status | Title | Schedule |
|--------|--------|-------|----------|
| 7146510 | ENABLED | AquaNexus: Migrated: Fish Tank + Plant Tank | Every 5 hours |
| 7143225 | ENABLED | AquaNexus - ML Predictions | Every 6 hours |
| 7143237 | ENABLED | AquaNexus - Model Retrain | Weekly |
| 7143071 | DISABLED | [RETIRED] Legacy Virtual Device | N/A |
