# Base image
FROM node:20-alpine3.18 AS base
RUN npm install -g pnpm@9

# Builder stage
FROM base AS builder
WORKDIR /app
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm db:generate

# Stage the Prisma engine binary at a predictable path.
# We use `find` because the exact pnpm virtual-store directory name
# (e.g. @prisma+client@5.22.0_prisma@5.22.0) can vary and glob COPY
# is unreliable for mid-path wildcards in Docker BuildKit.
RUN ENGINE=$(find /app -path "*/node_modules/.prisma/client/libquery_engine-linux-musl*.so.node" \
        -not -path "*_tmp*" | head -1) && \
    if [ -z "$ENGINE" ]; then echo "ERROR: Prisma engine not found" && exit 1; fi && \
    mkdir -p /app/prisma-engine && cp "$ENGINE" /app/prisma-engine/ && \
    echo "Staged: $ENGINE"

# Build the web app
RUN pnpm build --filter=@codepulse/web

# Runner stage
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

# Copy the staged Prisma engine binary to the path Prisma searches at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/prisma-engine/ ./apps/web/.prisma/client/

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the Next.js server
CMD ["node", "apps/web/server.js"]
