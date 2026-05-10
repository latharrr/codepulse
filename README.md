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

---

## Production Deployment

### Hosting

The Phase 1 MVP runs on a single AWS EC2 instance — all four containers (web, worker, postgres, redis) plus a Caddy reverse proxy on one box.

| Resource                   | Spec                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Instance type              | `t3.large` (2 vCPU, 8 GB RAM)                                                              |
| Region                     | `ap-south-1` (Mumbai)                                                                      |
| OS                         | Amazon Linux 2023                                                                          |
| Storage                    | 8 GB EBS gp3 (root) — **uncomfortably tight, plan to grow to ≥ 16 GB**                     |
| Public hostname            | `15-206-168-222.sslip.io` (sslip.io maps `<dashed-ip>.sslip.io` → IP, no DNS setup needed) |
| Public ports               | 80 (HTTP→HTTPS redirect), 443 (HTTPS, also UDP for HTTP/3 — optional)                      |
| Estimated cost off credits | ~$66/mo USD (~₹5,500 INR)                                                                  |

### Container topology

```
┌─────────────────────── EC2 t3.large ──────────────────────┐
│                                                            │
│   ┌──────────────┐                                         │
│   │   caddy      │  :80, :443  (Let's Encrypt)             │
│   │ caddy:2-alp  │  reverse_proxy → web:3000               │
│   └──────┬───────┘                                         │
│          │                                                 │
│   ┌──────▼───────┐    ┌─────────────┐                      │
│   │     web      │    │   worker    │                      │
│   │ Next.js 14   │    │ BullMQ proc │                      │
│   │ standalone   │    │  + adapters │                      │
│   └──────┬───────┘    └──────┬──────┘                      │
│          │                   │                             │
│          ▼                   ▼                             │
│   ┌──────────────┐    ┌─────────────┐                      │
│   │  postgres    │    │    redis    │                      │
│   │     :15      │    │     :7      │                      │
│   └──────────────┘    └─────────────┘                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

The `web` container has no host port mapping — it is reachable only over the internal Docker network as `web:3000`. Caddy is the only ingress.

### Deploy from scratch

```bash
# On EC2 (Amazon Linux 2023):
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# log out/back in for the docker group to apply

# Install Compose v2 plugin (Amazon Linux 2023's docker package
# does not bundle it):
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/libexec/docker/cli-plugins/docker-compose
sudo chmod +x /usr/libexec/docker/cli-plugins/docker-compose

git clone https://github.com/latharrr/codepulse.git
cd codepulse
cp .env.example .env
# Edit .env — set NEXT_PUBLIC_APP_URL to https://<your-host>,
# fill all AUTH_*, ENCRYPTION_KEY, AUTH_SECRET, etc.

docker-compose -f docker-compose.prod.yml up -d --build
```

### HTTPS via Caddy

Caddy 2 fronts the web container and obtains a free Let's Encrypt certificate on first start. The cert is stored in the persistent `caddy_data` Docker volume so renewals (every ~60 days) survive container restarts.

The [`Caddyfile`](Caddyfile) is intentionally minimal — set the public hostname and the upstream:

```caddy
{
  email <real-email-for-let's-encrypt-renewal-warnings>
}

15-206-168-222.sslip.io {
  encode zstd gzip
  reverse_proxy web:3000
}
```

**Required to issue the cert successfully:**

1. EC2 security group must allow inbound **TCP 443** from `0.0.0.0/0` (Let's Encrypt's HTTP-01 challenge needs port 80 too — keep 80 open).
2. The ACME contact email must use a real public TLD. `admin@codepulse.local` was rejected by both Let's Encrypt (`Domain name does not end with a valid public suffix`) and ZeroSSL (`A contact URL for an account was invalid`). Use a real email you actually monitor.
3. `NEXT_PUBLIC_APP_URL` (and therefore `AUTH_URL`) must be `https://<host>` — Auth.js v5 keys cookie-name selection off this, not `NODE_ENV`.

### Operational notes for the 8 GB EBS

The disk fills up faster than you'd expect on this size. Patterns that hurt:

- `docker compose build --no-cache` re-copies the entire 6+ MB build context AND voids the layer cache → easy `ENOSPC` mid-build.
- Iterative rebuilds leave dangling images and BuildKit cache. After ~3 rebuilds, expect ~5 GB of stale data.
- Next.js webpack needs ~2 GB of scratch space during `next build`.

Safe pre-rebuild routine:

```bash
df -h /
docker system df

# Free space without touching named volumes (DB / Caddy certs survive):
docker image prune -af
docker builder prune -af
```

Never pass `--volumes` to prune. The `postgres_data`, `redis_data`, `snapshots`, and `caddy_data` volumes hold irreplaceable state.

---

## Bug History & Fixes

This section is a running record of non-obvious bugs hit during the LPU pilot deployment. Each entry includes the symptom, the root cause, and the actual code change. Future deployments to similar setups can avoid these traps.

### Authentication & Session

#### 1. Google sign-in succeeded but every authenticated request bounced back to `/login`

**Symptom:** OAuth flow completed (Google consent → callback → cookie set), but the next request to `/dashboard` immediately redirected to `/login`. Network tab showed `/api/auth/callback/google` 307 → `/dashboard` 307 → `/login` 304 in a loop.

**Root cause:** `apps/web/src/middleware.ts` was hardcoding the JWE salt off `NODE_ENV`:

```ts
const salt =
  process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
```

But Auth.js v5 picks the cookie name (and matching JWE salt) from `AUTH_URL`'s **protocol**, not `NODE_ENV`. Since the site was originally served over plain HTTP, Auth.js encoded the JWT with salt `authjs.session-token` while the middleware tried to decode it with salt `__Secure-authjs.session-token`. JWE decryption silently failed, `getToken` returned `null`, and middleware redirected every authenticated request back to `/login`.

**Fix:** Derive `cookieName` (and salt) from the actual `AUTH_URL` protocol, and pass both explicitly to `getToken` so they cannot drift. — commit `da0fee9`

```ts
const useSecureCookies = process.env.AUTH_URL?.startsWith('https://') ?? false;
const cookieName = useSecureCookies
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';
const token = await getToken({
  req,
  secret: process.env.AUTH_SECRET!,
  cookieName,
  salt: cookieName,
});
```

#### 2. Internal Docker hostname leaking into the `callbackUrl` query string

**Symptom:** Login page URL contained `?callbackUrl=http%3A%2F%2F0.0.0.0%3A3000%2Fdashboard` — the internal Docker bind address was being exposed in the browser URL.

**Root cause:** When Next.js runs in standalone mode behind a reverse proxy, `req.url` reports the **server-bound** URL (`http://0.0.0.0:3000/...`), not the user-facing host. The middleware was setting `callbackUrl` with `req.url`, leaking the internal hostname.

**Fix:** Use `req.nextUrl.pathname + req.nextUrl.search` for the param value so the browser resolves the URL relative to the current origin (which is always the user-facing host). — commit `55d8320`

#### 3. `req.url` leak applied to redirect Location headers too

**Symptom:** After fix #2, the `callbackUrl` param was clean, but `NextResponse.redirect(new URL('/x', req.url))` calls were still constructed against `req.url` — the same internal-hostname leak, only this time in the `Location` response header.

**Root cause:** Fix #2 only patched the `callbackUrl` query-string value. The redirect URLs themselves were still built from `req.url`.

**Fix:** Switch every `new URL('/x', req.url)` to `new URL('/x', req.nextUrl)`. `req.nextUrl` is built from the trusted X-Forwarded-Host / X-Forwarded-Proto headers Caddy emits, so it always reflects the user-facing origin. — commit `cd3f466`

#### 4. Loop between `/dashboard` and `/onboarding` post-sign-in

**Symptom:** After completing Google OAuth, the user landed on `/onboarding` and saw a blank page. A refresh produced `ERR_TOO_MANY_REDIRECTS` after ~120 navigations.

**Root cause:** Two parts:

- The middleware reads `onboardingComplete` from the **JWT cookie** (stale until re-encoded).
- The `(student)/layout.tsx` and the onboarding page read `onboardingComplete` from a **fresh DB query** (via `auth()` → JWT callback → `prisma.user.findUnique`).

If the cookie said `onboardingComplete: false` but the DB row had `regno` set, middleware sent `/dashboard → /onboarding` and the page sent `/onboarding → /dashboard`, indefinitely.

But the deeper cause was that the JWT callback was **failing entirely** because of bug #5 below — the page's `auth()` returned no session, and the page-level redirect logic became unpredictable.

**Fix:** Resolved by fix #5 (Prisma engine). Once the JWT callback could actually run its DB query without crashing, both views agreed.

#### 5. Every authenticated request crashed with `JWTSessionError → PrismaClientInitializationError`

**The big one — root cause of essentially every auth symptom we saw.**

**Symptom:** Server logs showed:

```
prisma:error
Invalid `prisma.user.findUnique()` invocation:
Prisma Client could not locate the Query Engine for runtime "linux-musl-openssl-3.0.x".
[auth][error] JWTSessionError
```

Every request that touched the JWT callback (middleware, server components in `(student)/`, server actions, API routes) failed. Surface symptoms varied wildly: blank `/onboarding` page, "Unauthorized. Please sign in again." on `/handles`, redirect loops — all caused by `auth()` throwing instead of returning a session.

**Root cause:** Two compounding issues:

1. `packages/db/prisma/schema.prisma` did not declare a `binaryTargets` for the generator, so `prisma generate` only produced the host engine. When the build host happened to differ from the runtime container's libc/OpenSSL, the engine was missing.
2. The `apps/web/Dockerfile` was copying the generated `.prisma/client` folder to `apps/web/.prisma/client` — a path Prisma's runtime **does not search**. The error log lists the actual search paths, none of which matched.

**Fix:** Two changes in commit `2407114`.

In `schema.prisma`:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

In `apps/web/Dockerfile`:

```dockerfile
# Copy the generated Prisma client (with the linux-musl-openssl-3.0.x query
# engine) into one of the paths Prisma actually searches at runtime under
# Next.js standalone output.
COPY --from=builder --chown=nextjs:nodejs \
  /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client \
  ./apps/web/.next/server/.prisma/client
```

**Verification after deploy:**

```bash
docker-compose -f docker-compose.prod.yml exec -T web \
  ls apps/web/.next/server/.prisma/client/
# Should list: libquery_engine-linux-musl-openssl-3.0.x.so.node
```

#### 6. NextAuth `PrismaAdapter` was being mis-instantiated for OAuth user provisioning

**Symptom:** Build error: `Type 'X' is not assignable to type 'Adapter'` from the NextAuth config.

**Root cause:** The early auth config used `@auth/prisma-adapter` but instantiated it with the wrong shape, then later cast the return type to silence TS — the cast hid that the adapter was not being given a usable Prisma client reference.

**Fix:** Drop the PrismaAdapter entirely; provision users in the `signIn` callback instead. Auth.js v5 with JWT strategy doesn't need an adapter for sign-in — only for database sessions. We use JWT sessions, so the adapter was unnecessary surface area. — commits `242d47e`, `409d2c5`, `58893ae`, `67e124e`

The current `signIn` callback in `apps/web/src/auth.ts`:

```ts
async signIn({ user, account }) {
  if (account?.provider === 'google' && user.email) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (!existing) {
      const institution = await prisma.institution.findFirst({
        where: { slug: process.env.DEFAULT_INSTITUTION_SLUG || 'lpu' },
      });
      if (!institution) return false;
      const role = user.email === 'deepanshulathar@gmail.com' ? 'ADMIN' : 'STUDENT';
      await prisma.user.create({
        data: {
          email: user.email,
          fullName: user.name ?? null,
          role,
          institutionId: institution.id,
        },
      });
    }
  }
  return true;
}
```

### Build & Runtime

#### 7. Prisma engine not bundled by `next build` standalone output

**Symptom:** Same `Could not locate the Query Engine` error as bug #5, but pre-dates the path fix. Multiple iterations attempted to coax `outputFileTracingIncludes` into picking up the engine.

**Root cause:** Next.js's file tracer follows imports but does not always resolve through pnpm's symlink farm. The engine binary (`libquery_engine-*.so.node`) lives at `node_modules/.pnpm/@prisma+client@<ver>/node_modules/.prisma/client/`, which is a symlink target the tracer can miss.

**Fix:** In `apps/web/next.config.js`, force-include both `*.prisma` and `*.so.node`:

```js
experimental: {
  outputFileTracingIncludes: {
    '/**': ['./node_modules/**/*.prisma', './node_modules/**/*.so.node'],
  },
}
```

Combined with the explicit Dockerfile COPY (fix #5) for the runtime path. — commits `63233dd`, `54dc376`, `2407114`

#### 8. `node:20-alpine3.18` actually ships OpenSSL 3.0, not 1.1

The original deployment notes claimed Alpine 3.18 was chosen for OpenSSL 1.1 compatibility with Prisma. **This is wrong** — Alpine 3.17 and later default to OpenSSL 3.0. The runtime correctly auto-detects `linux-musl-openssl-3.0.x`, so the right `binaryTargets` value is `linux-musl-openssl-3.0.x` (not `linux-musl`). If you ever need OpenSSL 1.1, you'd have to drop to `node:20-alpine3.16`.

#### 9. pnpm v11 + Node 20 incompatibility

Pinning `pnpm@9` in `package.json`'s `packageManager` field is deliberate. pnpm 10/11 introduced changes that broke the Prisma generate step under Node 20 in this monorepo. The Dockerfile's `RUN npm install -g pnpm@9` enforces the pin even if the host has a newer pnpm.

#### 10. Worker bundled with esbuild (single `index.js`)

The `apps/worker` Dockerfile uses `pnpm --filter=@codepulse/worker bundle` (esbuild) to produce one `dist/index.js`, then copies _only_ that file plus `node_modules` into the runner stage. Reason: pnpm symlinks confused the Node module resolver in the standalone container. esbuild bundling avoids the issue entirely.

### Deployment & Infrastructure

#### 11. Disk full mid-build

**Symptom:** `failed to copy files: ... no space left on device` during `pnpm install` or `next build`.

**Root cause:** 8 GB EBS + multiple iterative rebuilds leaves the BuildKit cache and dangling images consuming 5+ GB. Triggering `--no-cache` made it worse — full re-copy of the build context.

**Fix workflow:**

```bash
df -h /
docker image prune -af      # safe — keeps images in use
docker builder prune -af    # frees BuildKit cache
df -h /
```

Plan to grow EBS to ≥ 16 GB long-term.

#### 12. `docker compose` plugin missing on Amazon Linux 2023

**Symptom:** `docker compose ...` errored with `unknown shorthand flag: 'f'`.

**Root cause:** `dnf install docker` on Amazon Linux 2023 installs only the Docker engine. The Compose v2 plugin is a separate install.

**Fix:** Either drop the binary into the system plugin path (so `docker compose` works for any user):

```bash
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/libexec/docker/cli-plugins/docker-compose
sudo chmod +x /usr/libexec/docker/cli-plugins/docker-compose
```

Or use the legacy hyphenated `docker-compose` if already present.

#### 13. Pre-commit hook needs `lint-staged` installed in the worktree

**Symptom:** `git commit` fails with `'lint-staged' is not recognized as an internal or external command` if you commit from a worktree where `pnpm install` has not been run.

**Root cause:** Husky's `pre-commit` hook calls `pnpm exec lint-staged`. The binary lives in `node_modules/.bin/lint-staged` — without an install, it doesn't exist.

**Fix:** Run `pnpm install --prefer-offline` in any new worktree before committing.

### Provider-specific gotchas

#### 14. LPU student emails are Microsoft Outlook, not Google

Real `@lpu.in` student emails are Microsoft 365 / Entra ID accounts. The Google OAuth provider configured for Phase 1 will **not** authenticate real LPU students once Phase 2 ships. The seeded `@lpu.in` users in the database are demo data only — when integrating with the live LPU directory, add a Microsoft Entra provider to NextAuth alongside Google.

#### 15. `AUTH_TRUST_HOST=true` is required behind Caddy

Without this env var, Auth.js refuses to honor the `X-Forwarded-Proto: https` and `X-Forwarded-Host` headers Caddy sends, treats the request as the bare `http://web:3000` it sees inside Docker, and breaks both the OAuth callback URL and the secure-cookie selection. Both `web` and `worker` services in `docker-compose.prod.yml` set this.

---

## Lessons Learned (Phase 1 deployment)

1. **`NODE_ENV` is not a substitute for inspecting the actual URL protocol.** Cookie security flags, redirect schemes, and proxy-trust decisions should be driven by the live request or `AUTH_URL`, not a build-time env var.
2. **Standalone Next.js + pnpm + native binaries is a recurring trap.** When debugging "X module not found" in production, always grep the runtime error for the _list of paths it searched_, then make sure your Dockerfile puts the artifact in one of them. Don't trust `outputFileTracingIncludes` alone.
3. **One layer's bug can produce ten symptoms.** The Prisma engine path (#5) surfaced as a redirect loop, a blank page, and a server-action-only auth failure depending on which code path called `auth()` first. When symptoms span unrelated routes, look for a shared dependency that's silently throwing.
4. **Match scope to what you're rebuilding.** `--no-cache` is rarely the right answer; changing a Dockerfile line invalidates the cache from that line down anyway, and `--no-cache` blows out the upstream `pnpm install` cache too — turning a 30 s rebuild into a 200 s+ rebuild on a tight 8 GB disk.
5. **8 GB is too small.** Grow the EBS volume before the next major iteration; the time wasted on disk-full retries dwarfs the ~$1/mo extra for 20 GB.
