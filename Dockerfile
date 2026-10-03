FROM node:20-slim AS base

# Instalar pnpm, netcat y openssl en Debian (requerido por Prisma en Debian)
RUN npm install -g pnpm@9.12.0 && \
    apt-get update && \
    apt-get install -y netcat-traditional openssl && \
    rm -rf /var/lib/apt/lists/*

# 1. Etapa de dependencias
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/logger/package.json ./packages/logger/
COPY packages/domain/package.json ./packages/domain/
COPY packages/eslint-config/package.json ./packages/eslint-config/

RUN pnpm install --frozen-lockfile

# 2. Etapa de compilación
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY . .

# Generar cliente Prisma y compilar todo el monorepo
RUN pnpm --filter database db:generate
RUN pnpm build

# 3. Etapa de producción para API Backend
FROM base AS api-runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts

RUN chmod +x ./scripts/entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./scripts/entrypoint.sh"]

# 4. Etapa de producción para Web Frontend (Next.js)
FROM base AS web-runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
