# ============================================================================
# PRODUCTION DOCKERFILE - SUPABASE + UPSTASH + RAILWAY
# ============================================================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL (needed for Prisma)
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Copy prisma schema FIRST
COPY prisma ./prisma/

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Generate Prisma Client BEFORE copying other files
RUN npx prisma generate

# Copy source code
COPY . .

# Build application
RUN npm run build

# ============================================================================
# Production stage
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL and wget
RUN apk add --no-cache openssl wget

# Copy package files
COPY package*.json ./

# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma

# Install production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Generate Prisma Client in production
RUN npx prisma generate

# Copy Prisma client from builder (as backup)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Create directories
RUN mkdir -p /app/uploads/dokumen /app/logs

# Set ownership
RUN chown -R node:node /app

# Switch to node user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Start application with migrations
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]