import Fastify from 'fastify';
import cors from '@fastify/cors';
import { logger } from '@repo/logger';
import { UserService, CredentialService, WebhookService, BotService, BotProfileService, CommandExecutor, AppError, mapPrismaError } from '@repo/domain';

const server = Fastify({
  logger: false, // Usamos nuestro logger centralizado de pino
});

// Registrar CORS para permitir peticiones desde el frontend o clientes externos
server.register(cors, {
  origin: true,
});

// ==========================================
// MANEJADOR GLOBAL DE ERRORES DE LA API
// ==========================================
server.setErrorHandler((error: any, request, reply) => {
  let processedError = error;

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
      },
    });
  } else {
    logger.error({ err: error, url: request.url, method: request.method }, 'Error interno no controlado en la API');
    reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor al procesar su solicitud.',
        technicalMessage: error.message || 'Error desconocido',
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
});

// ==========================================
// MOTOR DE EJECUCIÓN UNIVERSAL VÍA API
// ==========================================
server.post('/api/exec', async (request, reply) => {
  const result = await CommandExecutor.execute(request.body as any);
  return { success: true, data: result };
});

// ==========================================
// 1. SISTEMA Y ESTADO GLOBAL
// ==========================================
server.get('/health', async () => {
  logger.info('Health check endpoint called');
  return { status: 'ok', timestamp: new Date().toISOString() };
});

server.get('/api/system/status', async () => {
  logger.info('System status check requested');
  const status = await UserService.getSystemStatus();
  return { success: true, data: status };
});

// Endpoint centralizado para recibir logs del Frontend / Panel
server.post('/logs', async (request, reply) => {
  const { level = 'info', message, meta = {} } = request.body as any;
  const logFn = (logger as any)[level] || logger.info;
  logFn.call(logger, meta, `[FRONTEND/PANEL] ${message}`);
  return { success: true };
});

// ==========================================
// 2. GESTIÓN DE USUARIOS
// ==========================================
server.get('/users', async () => {
  const users = await UserService.getUsers();
  return { success: true, data: users };
});

server.post('/users', async (request, reply) => {
  const user = await UserService.createUser(request.body as any);
  reply.status(201).send({ success: true, data: user });
});

server.delete('/users/:id', async (request) => {
  const { id } = request.params as { id: string };
  await UserService.deleteUser(id);
  return { success: true, message: 'Usuario eliminado correctamente' };
});

// ==========================================
// 3. GESTIÓN DE CREDENCIALES DE API
// ==========================================
server.get('/credentials', async () => {
  const credentials = await CredentialService.listCredentials();
  return { success: true, data: credentials };
});

server.post('/credentials', async (request, reply) => {
  const credential = await CredentialService.createCredential(request.body as any);
  reply.status(201).send({ success: true, data: credential });
});

server.delete('/credentials/:apiName', async (request) => {
  const { apiName } = request.params as { apiName: string };
  await CredentialService.deleteCredential(apiName);
  return { success: true, message: `Credencial '${apiName}' eliminada correctamente` };
});

// ==========================================
// 4. CONTROL DE WEBHOOKS Y AUDITORÍA
// ==========================================
server.post('/webhooks/dispatch', async (request) => {
  const result = await WebhookService.dispatch(request.body as any);
  return { success: true, data: result };
});

server.get('/webhooks/logs', async (request) => {
  const { credentialId } = request.query as { credentialId?: string };
  const logs = await WebhookService.listLogs(credentialId);
  return { success: true, data: logs };
});

// Endpoint receptor local de webhooks (Mock Receiver / Meta WhatsApp Verification)
server.get('/webhooks/test-receiver', async (request, reply) => {
  const query = request.query as any;
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === 'wa_webhook_secret_hmac_2026') {
    logger.info('Meta WhatsApp Webhook verificado exitosamente mediante GET');
    return reply.status(200).send(challenge);
  } else if (mode) {
    logger.warn({ mode, token }, 'Fallo de verificación de Meta WhatsApp Webhook');
    return reply.status(403).send('Token de verificación inválido');
  }

  return { status: 'test-receiver-active', timestamp: new Date().toISOString() };
});

server.post('/webhooks/test-receiver', async (request) => {
  const signature = request.headers['x-webhook-signature'] as string;
  const apiKey = request.headers['x-api-key'] as string;
  const event = request.headers['x-webhook-event'] as string;
  const body = request.body;

  logger.info({ event, apiKey, hasSignature: !!signature }, 'Webhook recibido en el receptor local de prueba');

  return {
    received: true,
    timestamp: new Date().toISOString(),
    headers: {
      apiKey,
      signature,
      event,
    },
    payload: body,
  };
});

// ==========================================
// 5. SISTEMA DE BOT DINÁMICO Y PERFILES MULTI-TENANT
// ==========================================
server.get('/bot/profiles', async () => {
  const profiles = await BotProfileService.getProfiles();
  return { success: true, data: profiles };
});

server.post('/bot/profiles', async (request, reply) => {
  const profile = await BotProfileService.createProfile(request.body as any);
  reply.status(201).send({ success: true, data: profile });
});

server.get('/bot/profiles/:botId', async (request, reply) => {
  const { botId } = request.params as { botId: string };
  const profile = await BotProfileService.getProfileByBotId(botId);
  if (!profile) {
    return reply.status(404).send({ success: false, error: 'Perfil de bot no encontrado' });
  }
  return { success: true, data: profile };
});

server.delete('/bot/profiles/:id', async (request) => {
  const { id } = request.params as { id: string };
  await BotProfileService.deleteProfile(id);
  return { success: true, message: 'Perfil de bot eliminado correctamente' };
});

server.post('/bot/profiles/seed', async () => {
  const result = await BotProfileService.seedDemoProfiles();
  return { success: true, data: result };
});

server.get('/bot/rules', async (request) => {
  const { botProfileId } = request.query as { botProfileId?: string };
  const rules = await BotService.getRules(botProfileId);
  return { success: true, data: rules };
});

server.post('/bot/rules', async (request, reply) => {
  const rule = await BotService.createRule(request.body as any);
  reply.status(201).send({ success: true, data: rule });
});

server.delete('/bot/rules/:id', async (request) => {
  const { id } = request.params as { id: string };
  await BotService.deleteRule(id);
  return { success: true, message: 'Regla de bot eliminada correctamente' };
});

server.get('/bot/flows', async (request) => {
  const { botProfileId } = request.query as { botProfileId?: string };
  const flows = await BotService.getFlows(botProfileId);
  return { success: true, data: flows };
});

server.post('/bot/flows', async (request, reply) => {
  const flow = await BotService.createFlow(request.body as any);
  reply.status(201).send({ success: true, data: flow });
});

server.delete('/bot/flows/:id', async (request) => {
  const { id } = request.params as { id: string };
  await BotService.deleteFlow(id);
  return { success: true, message: 'Flujo de conversación eliminado correctamente' };
});

// Webhook oficial de WhatsApp para procesar mensajes con perfiles de bot
server.get('/webhooks/whatsapp', async (request, reply) => {
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

server.post('/webhooks/whatsapp', async (request) => {
  const query = request.query as { botId?: string };
  const result = await BotService.handleIncomingWebhook(request.body, query.botId);
  return { success: true, data: result };
});

server.post('/webhooks/whatsapp/:botId', async (request) => {
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
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
