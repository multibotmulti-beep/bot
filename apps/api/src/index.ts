import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { logger, LoggerUtils } from '@repo/logger';
import { UserService, CredentialService, WebhookService, BotService, BotProfileService, CommandExecutor, AppError, mapPrismaError } from '@repo/domain';

const server = Fastify({
  logger: false, // Usamos nuestro logger centralizado de pino
});

// Registrar CORS para permitir peticiones desde el frontend o clientes externos
server.register(cors, {
  origin: true,
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

// ==========================================
// MOTOR DE EJECUCIÓN UNIVERSAL VÍA API
// ==========================================
server.post('/api/exec', {
  schema: {
    description: 'Ejecuta comandos universales del bot',
    tags: ['Bots & AI'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
}, async (request, reply) => {
  const result = await CommandExecutor.execute(request.body as any);
  return { success: true, data: result };
});

// ==========================================
// 1. SISTEMA Y ESTADO GLOBAL
// ==========================================
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

// Endpoint centralizado para recibir logs del Frontend / Panel
server.post('/logs', {
  schema: {
    description: 'Recibe logs del cliente frontend o panel de control',
    tags: ['System'],
  },
}, async (request, reply) => {
  const { level = 'info', message, meta = {} } = request.body as any;
  const logFn = (logger as any)[level] || logger.info;
  logFn.call(logger, meta, `[FRONTEND/PANEL] ${message}`);
  return { success: true };
});

// ==========================================
// 2. GESTIÓN DE USUARIOS
// ==========================================
server.get('/users', {
  schema: {
    description: 'Lista todos los usuarios registrados',
    tags: ['Users'],
  },
}, async () => {
  const users = await UserService.getUsers();
  return { success: true, data: users };
});

server.post('/users', {
  schema: {
    description: 'Crea un nuevo usuario',
    tags: ['Users'],
  },
}, async (request, reply) => {
  const user = await UserService.createUser(request.body as any);
  reply.status(201).send({ success: true, data: user });
});

server.delete('/users/:id', {
  schema: {
    description: 'Elimina un usuario por su ID',
    tags: ['Users'],
  },
}, async (request) => {
  const { id } = request.params as { id: string };
  await UserService.deleteUser(id);
  return { success: true, message: 'Usuario eliminado correctamente' };
});

// ==========================================
// 3. GESTIÓN DE CREDENCIALES DE API
// ==========================================
server.get('/credentials', {
  schema: {
    description: 'Lista las credenciales de API configuradas',
    tags: ['Credentials'],
  },
}, async () => {
  const credentials = await CredentialService.listCredentials();
  return { success: true, data: credentials };
});

server.post('/credentials', {
  schema: {
    description: 'Crea una nueva credencial de API',
    tags: ['Credentials'],
  },
}, async (request, reply) => {
  const credential = await CredentialService.createCredential(request.body as any);
  reply.status(201).send({ success: true, data: credential });
});

server.delete('/credentials/:apiName', {
  schema: {
    description: 'Elimina una credencial de API por su nombre',
    tags: ['Credentials'],
  },
}, async (request) => {
  const { apiName } = request.params as { apiName: string };
  await CredentialService.deleteCredential(apiName);
  return { success: true, message: `Credencial '${apiName}' eliminada correctamente` };
});

// ==========================================
// 4. CONTROL DE WEBHOOKS Y AUDITORÍA
// ==========================================
server.post('/webhooks/dispatch', {
  schema: {
    description: 'Dispara un webhook hacia servicios externos',
    tags: ['Webhooks'],
  },
}, async (request) => {
  const result = await WebhookService.dispatch(request.body as any);
  return { success: true, data: result };
});

server.get('/webhooks/logs', {
  schema: {
    description: 'Lista el historial de logs de webhooks',
    tags: ['Webhooks'],
  },
}, async (request) => {
  const { credentialId } = request.query as { credentialId?: string };
  const logs = await WebhookService.listLogs(credentialId);
  return { success: true, data: logs };
});

// Endpoint receptor local de webhooks (Mock Receiver / Meta WhatsApp Verification)
server.get('/webhooks/test-receiver', {
  schema: {
    description: 'Endpoint receptor de prueba para webhooks',
    tags: ['Webhooks'],
  },
}, async (request, reply) => {
  const query = request.query as any;
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === 'wa_webhook_secret_hmac_2026') {
    return reply.status(200).send(challenge);
  }
  return reply.status(403).send('Verificación fallida');
});

server.post('/webhooks/test-receiver', {
  schema: {
    description: 'Recibe eventos de prueba en el receptor de webhooks',
    tags: ['Webhooks'],
  },
}, async (request) => {
  logger.info({ body: request.body }, 'Webhook de prueba recibido');
  return { success: true, received: request.body };
});

// ==========================================
// 5. GESTIÓN DE PERFILES DE BOTS Y REGLAS
// ==========================================
server.get('/bot/profiles', {
  schema: {
    description: 'Lista los perfiles de bots configurados',
    tags: ['Bots & AI'],
  },
}, async () => {
  const profiles = await BotProfileService.getProfiles();
  return { success: true, data: profiles };
});

server.post('/bot/profiles', {
  schema: {
    description: 'Crea un nuevo perfil de bot',
    tags: ['Bots & AI'],
  },
}, async (request, reply) => {
  const profile = await BotProfileService.createProfile(request.body as any);
  reply.status(201).send({ success: true, data: profile });
});

server.get('/bot/rules', {
  schema: {
    description: 'Lista las reglas de respuesta automática de los bots',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { botProfileId } = request.query as { botProfileId?: string };
  const rules = await BotService.getRules(botProfileId);
  return { success: true, data: rules };
});

server.post('/bot/rules', {
  schema: {
    description: 'Crea una regla de respuesta para el bot',
    tags: ['Bots & AI'],
  },
}, async (request, reply) => {
  const rule = await BotService.createRule(request.body as any);
  reply.status(201).send({ success: true, data: rule });
});

server.delete('/bot/rules/:id', {
  schema: {
    description: 'Elimina una regla de bot por ID',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { id } = request.params as { id: string };
  await BotService.deleteRule(id);
  return { success: true, message: 'Regla de bot eliminada correctamente' };
});

server.get('/bot/flows', {
  schema: {
    description: 'Lista los flujos conversacionales del bot',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { botProfileId } = request.query as { botProfileId?: string };
  const flows = await BotService.getFlows(botProfileId);
  return { success: true, data: flows };
});

server.post('/bot/flows', {
  schema: {
    description: 'Crea un flujo conversacional para el bot',
    tags: ['Bots & AI'],
  },
}, async (request, reply) => {
  const flow = await BotService.createFlow(request.body as any);
  reply.status(201).send({ success: true, data: flow });
});

server.delete('/bot/flows/:id', {
  schema: {
    description: 'Elimina un flujo conversacional por ID',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { id } = request.params as { id: string };
  await BotService.deleteFlow(id);
  return { success: true, message: 'Flujo de conversación eliminado correctamente' };
});

// Webhook oficial de WhatsApp para procesar mensajes con perfiles de bot
server.get('/webhooks/whatsapp', {
  schema: {
    description: 'Verificación de webhook de WhatsApp (Meta)',
    tags: ['Webhooks'],
  },
}, async (request, reply) => {
  const query = request.query as any;
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === 'wa_webhook_secret_hmac_2026') {
    logger.info('WhatsApp Webhook verificado correctamente por Meta');
    return reply.status(200).send(challenge);
  }
  return reply.status(403).send('Verificación fallida');
});

server.post('/webhooks/whatsapp', {
  schema: {
    description: 'Recepción de mensajes de WhatsApp',
    tags: ['Webhooks'],
  },
}, async (request) => {
  const query = request.query as { botId?: string };
  const result = await BotService.handleIncomingWebhook(request.body, query.botId);
  return { success: true, data: result };
});

server.post('/webhooks/whatsapp/:botId', {
  schema: {
    description: 'Recepción de mensajes de WhatsApp para un bot específico',
    tags: ['Webhooks'],
  },
}, async (request) => {
  const { botId } = request.params as { botId: string };
  const result = await BotService.handleIncomingWebhook(request.body, botId);
  return { success: true, data: result };
});

// ==========================================
// ARRANQUE DEL SERVIDOR
// ==========================================
const start = async () => {
  try {
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
