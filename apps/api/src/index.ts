import { buildApp } from './app';
import { logger } from '@repo/logger';

const start = async () => {
  try {
    const server = await buildApp();
    const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`API Server (Control Center) corriendo en http://localhost:${port}`);
    logger.info(`Swagger OpenAPI UI disponible en http://localhost:${port}/docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
