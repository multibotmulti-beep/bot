import { PrismaClient } from '@prisma/client';
import { logger } from '@repo/logger';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Registrar eventos de Prisma con Pino
prisma.$on('query' as never, (e: any) => {
  logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma DB Query');
});

prisma.$on('error' as never, (e: any) => {
  logger.error({ err: e }, 'Prisma DB Error');
});

prisma.$on('info' as never, (e: any) => {
  logger.info({ message: e.message }, 'Prisma DB Info');
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn({ message: e.message }, 'Prisma DB Warning');
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export * from '@prisma/client';
