# Base image
FROM node:20-alpine3.18 AS base
RUN npm install -g pnpm@9

# 1. Install dependencies only when needed
FROM base AS deps
RUN apk add --no-progress --no-cache libc6-compat
WORKDIR /app

# Copy root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy all package.json files for workspace dependency resolution
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/normalizer/package.json ./packages/normalizer/
COPY packages/scoring/package.json ./packages/scoring/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN pnpm db:generate

# Build the web app
RUN pnpm build --filter=@codepulse/web

# 3. Production image, copy all the files and run next
FROM node:20-alpine3.18 AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets from builder
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Note: The standalone build copies only the necessary files for the specific app
CMD ["node", "apps/web/server.js"]
