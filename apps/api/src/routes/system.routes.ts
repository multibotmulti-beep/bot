import { FastifyInstance } from 'fastify';
import { logger } from '@repo/logger';
import { UserService } from '@repo/domain';

export async function systemRoutes(server: FastifyInstance) {
  server.get('/health', {
    schema: {
      description: 'Verifica el estado de salud del servidor',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    logger.info('Health check endpoint called');
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  server.get('/api/system/status', {
    schema: {
      description: 'Obtiene el estado general del sistema y estadísticas',
      tags: ['System'],
    },
  }, async () => {
    logger.info('System status check requested');
    const status = await UserService.getSystemStatus();
    return { success: true, data: status };
  });

  server.post('/logs', {
    schema: {
      description: 'Recibe logs del cliente frontend o panel de control',
      tags: ['System'],
    },
  }, async (request) => {
    const { level = 'info', message, meta = {} } = request.body as any;
    const logFn = (logger as any)[level] || logger.info;
    logFn.call(logger, meta, `[FRONTEND/PANEL] ${message}`);
    return { success: true };
  });
}
