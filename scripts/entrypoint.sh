#!/bin/sh
set -e

echo "=========================================================="
echo "🚀 INICIANDO SISTEMA MULTIBOT UNIFICADO (API + WEB)"
echo "=========================================================="

# 1. Si DATABASE_URL está definida, sincronizar Prisma con reintentos
if [ -n "$DATABASE_URL" ]; then
  echo "🔄 Sincronizando esquema de base de datos con PostgreSQL (Prisma)..."
  RETRIES=30
  until pnpm --filter database db:push || [ $RETRIES -eq 0 ]; do
    echo "⏳ Base de datos no disponible aún, reintentando en 3 segundos... (Intentos restantes: $RETRIES)"
    RETRIES=$((RETRIES - 1))
    sleep 3
  done

  if [ $RETRIES -eq 0 ]; then
    echo "❌ Error: No se pudo conectar a la base de datos o sincronizar las tablas después de varios intentos."
    exit 1
  fi
  echo "✅ ¡Base de datos sincronizada y tablas creadas/actualizadas correctamente!"
fi

# 2. Iniciar API Backend (Fastify) en puerto interno 4000
echo "⚡ Arrancando API Backend en http://127.0.0.1:4000..."
PORT=4000 node apps/api/dist/index.js &

# Esperar a que la API esté lista
sleep 3

# 3. Iniciar Frontend Web (Next.js) en el puerto asignado por Railway ($PORT o 3000)
FRONTEND_PORT=${PORT:-3000}
echo "🌐 Arrancando Frontend Web en puerto ${FRONTEND_PORT}..."
exec pnpm --filter plantilla-web-paneles start -p ${FRONTEND_PORT} -H 0.0.0.0
