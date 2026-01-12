# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/web/package*.json ./packages/web/

# Install dependencies
RUN npm ci

# Copy source
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web
COPY tsconfig.json ./

# Build shared package first
RUN npm run build -w @booth-buddy/shared

# Generate Prisma client
RUN npx prisma generate --schema=packages/shared/prisma/schema.prisma

# Build web package
RUN npm run build -w @booth-buddy/web

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/web/package*.json ./packages/web/

RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY --from=builder /app/packages/web/src/views ./packages/web/dist/views
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema for migrations
COPY packages/shared/prisma ./packages/shared/prisma

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "packages/web/dist/index.js"]
