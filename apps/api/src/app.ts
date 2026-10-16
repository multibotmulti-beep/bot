import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { logger, LoggerUtils } from '@repo/logger';
import { AppError, mapPrismaError } from '@repo/domain';

// Import routes
import { systemRoutes } from './routes/system.routes';
import { authRoutes } from './routes/auth.routes';
import { chatRoutes } from './routes/chat.routes';
import { userRoutes } from './routes/user.routes';
import { credentialRoutes } from './routes/credential.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { botRoutes } from './routes/bot.routes';

export async function buildApp() {
  const server = Fastify({
    logger: false, // Usamos nuestro logger centralizado de pino
  });

  // Registrar content-type parser para soportar cuerpos JSON vacíos sin errores
  server.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      if (!body || (body as string).trim() === '') {
        done(null, {});
        return;
      }
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Registrar CORS para permitir peticiones desde cualquier origen (localhost, 127.0.0.1, etc.)
  server.register(cors, {
    origin: (origin, cb) => {
      cb(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*'],
    credentials: false,
  });

  // Configurar Rate Limiting para protección contra abusos y DoS (excluyendo preflight OPTIONS)
  server.register(fastifyRateLimit, {
    global: true,
    max: 300, // Máximo 300 peticiones por minuto por IP
    timeWindow: '1 minute',
    skipOnError: true,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Límite de solicitudes excedido (${context.max} peticiones permitidas por ${context.after}).`,
        statusCode: 429,
      },
    }),
  });

  // ==========================================
  // REGISTRO DE SWAGGER / OPENAPI (Requisito 3)
  // ==========================================
  server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Monorepo Bot & Control Center API',
        description: 'Documentación OpenAPI de la API del monorepo con soporte de Swagger, Trazabilidad y Métricas',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:4000',
          description: 'Servidor de Desarrollo Local',
        },
      ],
      tags: [
        { name: 'System', description: 'Estado y salud del sistema' },
        { name: 'Users', description: 'Gestión de usuarios y perfiles' },
        { name: 'Credentials', description: 'Gestión de credenciales de API' },
        { name: 'Webhooks', description: 'Envío y recepción de webhooks y WhatsApp' },
        { name: 'Bots & AI', description: 'Perfiles, reglas, flujos y ejecución de bots' },
      ],
    },
  });

  server.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });

  // ==========================================
  // MIDDLEWARE DE TRAZABILIDAD Y MÉTRICAS (Requisito 5)
  // ==========================================
  server.addHook('onRequest', async (request, reply) => {
    const traceId = (request.headers['x-trace-id'] as string) || LoggerUtils.generateTraceId();
    (request as any).traceId = traceId;
    (request as any).startTime = performance.now();
    reply.header('x-trace-id', traceId);

    const method = request.method;
    const url = request.url;

    // Permitir API pública para anónimos; requerir API Key solo cuando hay sesión de usuario / base de datos protegida
    const isAnonymous = request.headers['x-anonymous-mode'] === 'true' || request.headers['x-mode'] === 'anonymous';

    if (!isAnonymous && ['POST', 'PUT', 'DELETE'].includes(method) && (url.includes('/bot') || url.includes('/capabilities')) && !url.includes('/bot/profiles') && !url.includes('/bot/flows') && !url.includes('/bot/function-configs') && !url.includes('/bot/rules') && !url.includes('/bot/execute-function') && !url.includes('/bot/assistant')) {
      const apiKey = request.headers['x-api-key'] || (request.headers['authorization'] || '').replace('Bearer ', '');
      const expectedKey = process.env.ADMIN_API_KEY || 'admin_secret_key_2026';

      if (!apiKey || apiKey !== expectedKey) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'Acceso no autorizado: Se requiere una API Key de Administrador válida para utilizar la base de datos en sesión de usuario.',
            statusCode: 401,
          }
        });
      }
    }
  });

  server.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).startTime || performance.now();
    const durationMs = Math.round(performance.now() - startTime);
    const traceId = (request as any).traceId;

    LoggerUtils.logPerformance({
      operation: `${request.method} ${request.url}`,
      durationMs,
      timestamp: new Date().toISOString(),
      success: reply.statusCode < 400,
      meta: {
        traceId,
        statusCode: reply.statusCode,
        method: request.method,
        url: request.url,
      },
    });
  });

  // ==========================================
  // MANEJADOR GLOBAL DE ERRORES DE LA API
  // ==========================================
  server.setErrorHandler((error: any, request, reply) => {
    let processedError = error;
    const traceId = (request as any).traceId;

    // Si es un error conocido de Prisma, mapearlo a AppError
    if (error && typeof error.code === 'string' && error.code.startsWith('P')) {
      processedError = mapPrismaError(error);
    }

    // Si es un error de validación de Zod
    if (error && error.name === 'ZodError') {
      processedError = new AppError(
        `Zod Validation Failed: ${error.message}`,
        `Error de validación: Los datos proporcionados no cumplen con el formato requerido.`,
        'VALIDATION_ERROR' as any,
        400,
        error.errors
      );
    }

    if (processedError instanceof AppError) {
      reply.status(processedError.statusCode).send({
        success: false,
        error: {
          code: processedError.errorCode,
          message: processedError.userMessage,
          technicalMessage: processedError.message,
          details: processedError.details || null,
          timestamp: new Date().toISOString(),
          path: request.url,
          traceId,
        },
      });
    } else {
      logger.error({ err: error, url: request.url, method: request.method, traceId }, 'Error interno no controlado en la API');
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error interno del servidor al procesar su solicitud.',
          technicalMessage: error.message || 'Error desconocido',
          timestamp: new Date().toISOString(),
          path: request.url,
          traceId,
        },
      });
    }
  });

  // Registrar rutas modularizadas
  server.register(systemRoutes);
  server.register(authRoutes);
  server.register(chatRoutes);
  server.register(userRoutes);
  server.register(credentialRoutes);
  server.register(webhookRoutes);
  server.register(botRoutes);

  return server;
}
