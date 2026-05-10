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

# Copy the generated Prisma client (with the linux-musl-openssl-3.0.x query
# engine) into one of the paths Prisma actually searches at runtime under
# Next.js standalone output. Without this, every prisma call throws
# "Could not locate the Query Engine for runtime linux-musl-openssl-3.0.x"
# inside Auth.js's JWT callback, which makes every authenticated request
# crash with JWTSessionError.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client ./apps/web/.next/server/.prisma/client

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the Next.js server
CMD ["node", "apps/web/server.js"]
