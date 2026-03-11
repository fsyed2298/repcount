# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Includes a smart gym tracking mobile app (RepCount) with AI-powered weight detection, exercise recognition, Apple Watch rep tracking, and Apple Health integration.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) with Expo Router
- **AI**: OpenAI via Replit AI Integrations (weight detection, exercise recognition)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── gymlog/             # Expo mobile app (RepCount)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## App Features (RepCount)

- **Camera weight detection**: AI analyzes dumbbell/weight stack images to extract the weight value
- **Exercise detection**: AI attempts to identify exercise type from camera image
- **Exercise browser**: 30+ popular exercises organized by muscle group (chest, back, shoulders, arms, legs, core)
- **Active workout session**: Log sets with weight + reps, rest timer, live stats
- **Apple Watch integration**: Rep counting via motion sensors (paired)
- **Apple Health sync**: Workout data synced to Apple Health
- **Workout history**: Full history with volume, reps, duration stats
- **Stats dashboard**: Total workouts, volume, reps, favorite exercise
- **Settings**: kg/lbs toggle, integration status

## Database Schema

- `workouts` — workout sessions with exercise info, timestamps, volume
- `workout_sets` — individual sets with reps/weight per workout

## API Endpoints

- `GET /api/healthz` — health check
- `GET /api/exercises` — list all exercises (hardcoded catalog)
- `GET /api/workouts` — list all workout sessions
- `POST /api/workouts` — create new workout
- `GET /api/workouts/:id` — get workout details
- `PATCH /api/workouts/:id` — update/complete workout
- `DELETE /api/workouts/:id` — delete workout
- `POST /api/workouts/:id/sets` — add a set to a workout
- `POST /api/ai/detect-weight` — AI weight detection from base64 image
- `POST /api/ai/detect-exercise` — AI exercise detection from base64 image

## AI Integration

Uses OpenAI GPT-5.2 with vision capabilities via Replit AI Integrations (no API key needed). Charged to Replit credits.

## Development Notes

- Run codegen after OpenAPI changes: `pnpm --filter @workspace/api-spec run codegen`
- Push DB schema: `pnpm --filter @workspace/db run push`
- API server starts on port 8080
- Expo dev server uses $REPLIT_EXPO_DEV_DOMAIN
