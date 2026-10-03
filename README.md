# Monorepo Full-Stack con Node, Next.js, TypeScript, Pino y PostgreSQL

Este repositorio contiene una arquitectura monorepo moderna, modular y escalable diseñada con **pnpm workspaces** y **Turborepo**. Está estructurada bajo principios de Clean Architecture y Domain-Driven Design (DDD), permitiendo que cualquier función o caso de negocio sea reutilizable entre diferentes aplicaciones (web, api, workers, CLI) y dominios.

---

## 📂 Estructura del Proyecto

```text
/
├── apps/
│   ├── web/                # Frontend (Next.js 14+ App Router, Tailwind CSS, TypeScript)
│   └── api/                # Backend (Node.js + Fastify + TypeScript)
└── packages/
    ├── domain/             # Lógica de negocio pura, casos de uso, validaciones (Zod)
    ├── database/           # Configuración de PostgreSQL y Prisma ORM
    ├── logger/             # Logger centralizado y estructurado con Pino
    └── config/             # Configuraciones compartidas (TypeScript)
```

---

## 🛠️ Tecnologías Principales

- **Gestor de Paquetes:** `pnpm` con Workspaces.
- **Orquestador de Tareas:** `Turborepo`.
- **Frontend:** Next.js, React, Tailwind CSS.
- **Backend:** Node.js, Fastify.
- **Base de Datos:** PostgreSQL con Prisma ORM.
- **Logging:** Pino (con `pino-pretty` para desarrollo).
- **Validaciones:** Zod.

---

## 🚀 Cómo Empezar

### 1. Requisitos Previos

- Node.js >= 20.x
- pnpm >= 9.x
- PostgreSQL corriendo localmente o mediante Docker.

### 2. Instalación

Instala todas las dependencias del monorepo ejecutando en la raíz:

```bash
pnpm install
```

### 3. Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz (o en `packages/database`) con la URL de tu base de datos PostgreSQL:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db?schema=public"
```

### 4. Generar el Cliente de Base de Datos y Migraciones

```bash
# Generar cliente Prisma
pnpm db:generate

# Ejecutar migraciones (si tienes tu DB configurada)
pnpm db:migrate
```

### 5. Ejecutar en Modo Desarrollo

Para levantar todas las aplicaciones y paquetes en paralelo con recarga en caliente:

```bash
pnpm dev
```

### 6. Compilación de Producción

Para compilar todo el monorepo:

```bash
pnpm build
```

---

## 🧩 Sistema de Librerías Propias y Dominios (`packages/domain`)

Para asegurar que cada función y lógica de negocio pueda pasar de código interno a ser reutilizada por múltiples aplicaciones (API, Web, CLI, Workers):

1. **Agnóstico de Frameworks:** La lógica en `packages/domain` no depende de Fastify ni de Next.js. Utiliza contratos puros en TypeScript y validaciones con Zod.
2. **Inyección de Dependencias y Servicios:** Los servicios como `UserService` encapsulan las reglas de negocio, llaman a la base de datos vía `@repo/database` y registran eventos con el logger estructurado de Pino (`@repo/logger`).
3. **Consumo Cruzado:** Tanto `apps/api` como `apps/web` (o cualquier nuevo dominio que agregues en `packages/`) pueden importar directamente `@repo/domain` manteniendo un tipado estricto y total consistencia de código.
