# ──────────────────────────────────────────────
# Build stage
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ──────────────────────────────────────────────
# Runtime stage
# ──────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create upload dirs with correct ownership
RUN mkdir -p uploads/covers uploads/temp logs \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
