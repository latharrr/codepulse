# Base image
FROM node:20-alpine AS base
RUN npm install -g pnpm

# Builder stage
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm build --filter=@codepulse/worker

# Deploy the worker to a standalone directory
# This resolves symlinks and creates a self-contained folder
RUN pnpm --filter=@codepulse/worker --prod deploy /app/deployed-worker

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Copy the deployed worker
COPY --from=builder /app/deployed-worker ./

# Also copy the prisma schema and migrations for db commands
COPY --from=builder /app/packages/db/prisma ./prisma

# The build output is in dist/
CMD ["node", "dist/index.js"]
