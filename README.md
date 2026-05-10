# CodePulse

> **University Coding Intelligence Platform** — B2B SaaS that aggregates, verifies, normalizes, and ranks student programming activity from GitHub, Codeforces, and LeetCode into a unified profile per student.

---

## Quick Start (Local Dev — under 10 minutes)

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation) — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Postgres + Redis)

### 1. Clone and install

```bash
git clone <repo-url> codepulse
cd codepulse
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set:
#   AUTH_SECRET          (openssl rand -base64 32)
#   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
#   AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
#   ENCRYPTION_KEY       (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### 3. Start infrastructure

```bash
docker compose up -d
# Wait ~15s for Postgres + Redis to be healthy
docker compose ps   # confirm both services are "healthy"
```

### 4. Run database migrations + seed

```bash
pnpm db:generate   # generates Prisma client
pnpm db:migrate    # runs migrations (creates all tables)
pnpm db:seed       # seeds 1 institution, 1 admin, 5 students
```

### 5. Start development servers

```bash
# Terminal 1 — Next.js web app (port 3000)
pnpm dev:web

# Terminal 2 — BullMQ worker process
pnpm dev:worker
```

Open [http://localhost:3000](http://localhost:3000) — sign in with Google.

---

## Monorepo Structure

```
codepulse/
├── apps/
│   ├── web/                    # Next.js 14 (App Router) — UI + API routes
│   └── worker/                 # BullMQ worker process (separate Node process)
├── packages/
│   ├── db/                     # Prisma schema, client, migrations, seed
│   ├── adapters/               # Platform adapters: GitHub, Codeforces, LeetCode
│   ├── normalizer/             # Raw → canonical NormalizedMetrics transforms
│   ├── scoring/                # CodePulse Score computation engine
│   ├── types/                  # Shared TypeScript types + Zod schemas
│   └── config/                 # Env loader (Zod-validated), logger (Pino), feature flags
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / Client                      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│              apps/web (Next.js 14)                       │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │  App Router UI  │  │  Route Handlers (/api/*)     │  │
│  │  (React, SSR)   │  │  Zod validation, Auth check  │  │
│  └─────────────────┘  └──────────────┬───────────────┘  │
└──────────────────────────────────────┼──────────────────┘
                                       │ enqueue jobs
┌──────────────────────────────────────▼──────────────────┐
│                   Redis (BullMQ queues)                  │
│  verify-handle | fetch:github | fetch:cf | fetch:lc      │
│  recompute-score                                         │
└──────────────────────────────────────┬──────────────────┘
                                       │ dequeue
┌──────────────────────────────────────▼──────────────────┐
│              apps/worker (Node.js + BullMQ)              │
│  ┌────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │  Adapters  │ │  Normalizer  │ │  Scoring Engine  │   │
│  │  (GitHub,  │ │  (canonical  │ │  (compute +      │   │
│  │   CF, LC)  │ │   metrics)   │ │   rank update)   │   │
│  └────────────┘ └──────────────┘ └──────────────────┘   │
└──────────────────────────────────────┬──────────────────┘
                                       │ read/write
┌──────────────────────────────────────▼──────────────────┐
│              PostgreSQL 15 (via Prisma ORM)              │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

| Decision                         | Rationale                                                           |
| -------------------------------- | ------------------------------------------------------------------- |
| **No real-time scraping**        | Dashboards read from DB; all fetches are background jobs            |
| **BullMQ per-platform queues**   | Independent backpressure; one broken adapter can't starve others    |
| **Prisma ORM**                   | Type-safe queries, auto-generated client, migration management      |
| **Zod everywhere**               | Env vars, request bodies, adapter outputs — fail fast at boundaries |
| **Snapshot-first writes**        | Raw API response stored before normalization — safe replay          |
| **institution_id on all tables** | Multi-tenant ready without rewrite; RLS prepared for Phase 2        |

## Available Scripts

| Script             | Description                               |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | Start all apps in dev mode (web + worker) |
| `pnpm dev:web`     | Start only the Next.js web app            |
| `pnpm dev:worker`  | Start only the BullMQ worker              |
| `pnpm build`       | Build all packages and apps               |
| `pnpm test`        | Run Vitest unit tests across all packages |
| `pnpm test:e2e`    | Run Playwright end-to-end tests           |
| `pnpm lint`        | Run ESLint across the monorepo            |
| `pnpm typecheck`   | Run `tsc --noEmit` across all packages    |
| `pnpm db:generate` | Regenerate Prisma client                  |
| `pnpm db:migrate`  | Run pending database migrations           |
| `pnpm db:seed`     | Seed demo data (institution + users)      |

## Environment Variables

See [`.env.example`](.env.example) for the full list of required variables with documentation.

## Phase Roadmap

| Phase       | Status         | Description                                                           |
| ----------- | -------------- | --------------------------------------------------------------------- |
| **Phase 1** | 🚧 In Progress | Single-tenant MVP for LPU pilot (~5,000 students)                     |
| Phase 2     | Planned        | Multi-tenant self-serve onboarding, recruiter portal, AI insights     |
| Phase 3     | Planned        | Mobile app, marketplace, cohort time machine, public university index |
