# Base image
FROM node:20-alpine3.18 AS base
RUN npm install -g pnpm@9

# Builder stage
FROM base AS builder
WORKDIR /app
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client (needed for the bundle)
RUN pnpm db:generate

# Bundle the worker using esbuild (handles the internal TS packages)
RUN pnpm --filter=@codepulse/worker bundle

# Deploy to a standalone folder for production dependencies
RUN pnpm --filter=@codepulse/worker --prod deploy /app/deployed-worker

# Runner stage
FROM node:20-alpine3.18 AS runner
WORKDIR /app
ENV NODE_ENV production

# Copy the production dependencies
COPY --from=builder /app/deployed-worker/node_modules ./node_modules

# Copy the bundled worker file
COPY --from=builder /app/apps/worker/dist/index.js ./dist/index.js
COPY --from=builder /app/apps/worker/package.json ./package.json

# Copy Prisma engine and generated client
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/db/prisma ./prisma

# The build output is in dist/
CMD ["node", "dist/index.js"]
