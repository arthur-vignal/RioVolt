# Dockerfile para o Voltrio MVP — Next.js 16 + Postgres-ready.
#
# Em prod (DATABASE_URL setada), o dispatcher em src/lib/db.ts delega
# para db-pg.ts. Sem DATABASE_URL, fallback para db-sqlite.ts (apenas dev).
#
# Multi-stage build pra imagem pequena. Next.js standalone trace.
# Node 22 é o que o next 16 espera em runtime.

FROM node:22-bookworm-slim AS base
WORKDIR /app

# deps nativas (better-sqlite3 opcional via optionalDependencies)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# --- deps layer (cacheado) ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --include=optional

# --- build layer ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js standalone output (precisa output: 'standalone' no next.config)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runtime layer ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Railway injeta $PORT dinamicamente. Default 3000 pra local.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# usuário não-root
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

# start.sh sobrescreve $PORT (railway) na chamada do next start
CMD ["sh", "-c", "node_modules/.bin/next start -p ${PORT:-3000}"]