# ==============================================================================
# Multi-stage Production Dockerfile for LookAround Backend Service
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install openssl required by Prisma query engine on Alpine
RUN apk add --no-cache openssl

# Install npm dependencies first to leverage Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and configuration to generate client bindings
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and compile TypeScript to production JavaScript
COPY src ./src
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Lightweight Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime utilities:
# - openssl: required for Prisma runtime query engine
# - dumb-init: handles PID 1 signal forwarding for graceful shutdown
# - wget: used for container healthchecks
RUN apk add --no-cache openssl dumb-init wget

# Set production environment defaults
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Create an unprivileged user and group for container security
RUN addgroup -S nodejs -g 1001 && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown nodejs:nodejs /app

USER nodejs

# Install production-only dependencies
COPY --chown=nodejs:nodejs package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output from builder
COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist

# Copy generated Prisma Client engines and metadata
COPY --chown=nodejs:nodejs --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=nodejs:nodejs --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy Prisma schema and migrations for remote migration deployment
COPY --chown=nodejs:nodejs prisma ./prisma
COPY --chown=nodejs:nodejs prisma.config.ts ./

# Copy initial seed data (for remote seed pipeline)
COPY --chown=nodejs:nodejs data ./data

# Expose default application port (overridden dynamically via $PORT at runtime)
EXPOSE 3000

# Built-in container health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/health || exit 1

# Handle signal forwarding via dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Launch compiled application
CMD ["node", "dist/index.js"]
