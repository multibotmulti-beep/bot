#!/bin/sh
set -e

echo "⏳ Esperando a que PostgreSQL esté listo..."
until nc -z -v -w3 postgres 5432; do
  echo "PostgreSQL no está disponible todavía - durmiendo..."
  sleep 2
done

echo "✅ PostgreSQL está listo."

echo "🔄 Aplicando esquema de base de datos con Prisma..."
pnpm --filter database db:push || npx prisma db push --schema=packages/database/prisma/schema.prisma

echo "🌱 Sembrando datos iniciales y bots pre-cargados..."
npx tsx scripts/seed-bot-rules.ts || node -e "console.log('Seed omitido')"

echo "🚀 Iniciando servidor de API en desarrollo..."
exec pnpm --filter api dev
