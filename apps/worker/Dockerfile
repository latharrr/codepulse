# Base image
FROM node:20-alpine AS base
RUN npm install -g pnpm

# 1. Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/normalizer/package.json ./packages/normalizer/
COPY packages/scoring/package.json ./packages/scoring/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

# 2. Build the worker
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm db:generate
RUN pnpm build --filter=@codepulse/worker

# 3. Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Copy built files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder /app/packages ./packages

CMD ["node", "apps/worker/dist/index.js"]
