import { logger } from '@repo/logger';
import { prisma } from '@repo/database';

export async function bootstrapSystem(): Promise<boolean> {
  logger.info('==================================================');
  logger.info('Iniciando verificación de integridad del sistema...');
  logger.info('==================================================');

  // 1. Verificar variables de entorno críticas
  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    logger.error(
      { missingEnvVars },
      `[FATAL] Faltan variables de entorno críticas: ${missingEnvVars.join(', ')}. Configure su archivo .env antes de iniciar el sistema.`
    );
    console.error(`\n[FATAL ERROR] Faltan variables de entorno críticas: ${missingEnvVars.join(', ')}\n`);
    return false;
  }
  logger.info('✔ Variables de entorno validadas correctamente.');

  // 2. Verificar conectividad real con PostgreSQL mediante Prisma
  try {
    logger.info('Estableciendo conexión y ping a la base de datos PostgreSQL...');
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✔ Conexión con PostgreSQL establecida y verificada exitosamente.');
  } catch (error: any) {
    logger.error(
      { err: error.message },
      `[FATAL] No se pudo establecer conexión con la base de datos PostgreSQL. Verifique que el servicio esté activo y que DATABASE_URL sea correcta.`
    );
    console.error(`\n[FATAL ERROR] Fallo de conexión con PostgreSQL: ${error.message}\n`);
    return false;
  }

  logger.info('==================================================');
  logger.info('✔ Todas las verificaciones pasaron. Sistema listo.');
  logger.info('==================================================');
  return true;
}
