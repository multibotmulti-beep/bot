import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { logger, LoggerUtils } from '@repo/logger';
import { UserService, CredentialService, WebhookService, BotService, BotProfileService, AuthService, ChatService, CommandExecutor, AppError, mapPrismaError, CapabilityRegistry, MasterBotEngine } from '@repo/domain';

const server = Fastify({
  logger: false, // Usamos nuestro logger centralizado de pino
});

// Registrar CORS para permitir peticiones desde el frontend o clientes externos
server.register(cors, {
  origin: true,
});

// Configurar Rate Limiting para protección contra abusos y DoS
server.register(fastifyRateLimit, {
  global: true,
  max: 120, // Máximo 120 peticiones por minuto por IP
  timeWindow: '1 minute',
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

  // Proteger rutas de mutación (POST, PUT, DELETE) en bots, flujos, reglas y capacidades
  if (['POST', 'PUT', 'DELETE'].includes(method) && (url.includes('/bot') || url.includes('/capabilities'))) {
    const apiKey = request.headers['x-api-key'] || (request.headers['authorization'] || '').replace('Bearer ', '');
    const expectedKey = process.env.ADMIN_API_KEY || 'admin_secret_key_2026';

    if (!apiKey || apiKey !== expectedKey) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED_ACCESS',
          message: 'Acceso no autorizado: Se requiere una API Key de Administrador válida (header x-api-key o Authorization: Bearer <API_KEY>) para modificar perfiles, flujos, reglas o ejecutar capacidades protegidas.',
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
}, async (request, _reply) => {
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
}, async (request, _reply) => {
  const { level = 'info', message, meta = {} } = request.body as any;
  const logFn = (logger as any)[level] || logger.info;
  logFn.call(logger, meta, `[FRONTEND/PANEL] ${message}`);
  return { success: true };
});

// ==========================================
// 1.5 AUTENTICACIÓN POR MAGIC LINK Y WHATSAPP
// ==========================================
server.post('/api/auth/request-link', {
  schema: {
    description: 'Genera un enlace mágico de inicio de sesión vinculado al número de teléfono de WhatsApp',
    tags: ['Users'],
  },
}, async (request) => {
  const { phoneNumber } = request.body as { phoneNumber: string };
  const result = await AuthService.generateLoginLink(phoneNumber);
  return { success: true, data: result };
});

server.post('/api/auth/verify-token', {
  schema: {
    description: 'Verifica el token de inicio de sesión para el número de teléfono especificado',
    tags: ['Users'],
  },
}, async (request) => {
  const { phoneNumber, token } = request.body as { phoneNumber: string, token: string };
  const result = await AuthService.verifyLoginToken(phoneNumber, token);
  return { success: true, data: result };
});

server.post('/api/auth/initiate-whatsapp', {
  schema: {
    description: 'Inicia el proceso de autenticación real por WhatsApp',
    tags: ['Users'],
  },
}, async (request) => {
  const { phoneNumber } = request.body as { phoneNumber: string };
  const result = await BotProfileService.initiateWhatsAppAuth(phoneNumber);
  return { success: true, data: result };
});

server.post('/api/auth/check-whatsapp-status', {
  schema: {
    description: 'Verifica el estado de autenticación real por WhatsApp',
    tags: ['Users'],
  },
}, async (request) => {
  const { phoneNumber } = request.body as { phoneNumber: string };
  const result = await BotProfileService.checkWhatsAppAuthStatus(phoneNumber);
  return { success: true, data: result };
});

// ==========================================
// 1.6 SISTEMA DE CHAT EN TIEMPO REAL
// ==========================================
server.get('/api/chats', {
  schema: {
    description: 'Lista todas las conversaciones de chat activas agrupadas por número',
    tags: ['Chat'],
  },
}, async (request) => {
  const { phoneNumber } = request.query as { phoneNumber?: string };
  const conversations = await ChatService.getConversations(phoneNumber);
  return { success: true, data: conversations };
});

server.get('/api/chats/:senderPhone', {
  schema: {
    description: 'Obtiene el historial de mensajes de un número de teléfono específico',
    tags: ['Chat'],
  },
}, async (request) => {
  const { senderPhone } = request.params as { senderPhone: string };
  const messages = await ChatService.getMessagesByPhone(senderPhone);
  return { success: true, data: messages };
});

server.post('/api/chats/send', {
  schema: {
    description: 'Envía y registra un mensaje de respuesta a un número vía API de chat',
    tags: ['Chat'],
  },
}, async (request) => {
  const { senderPhone, message, botId } = request.body as { senderPhone: string; message: string; botId?: string };
  const result = await ChatService.replyToUser(senderPhone, message, botId);
  return { success: true, data: result };
});

server.delete('/api/chats/:senderPhone', {
  schema: {
    description: 'Elimina el historial de chat para un número de teléfono',
    tags: ['Chat'],
  },
}, async (request) => {
  const { senderPhone } = request.params as { senderPhone: string };
  const result = await ChatService.deleteChat(senderPhone);
  return { success: true, data: result };
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

server.put('/bot/profiles/:id', {
  schema: {
    description: 'Actualiza un perfil de bot por ID',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { id } = request.params as { id: string };
  const profile = await BotProfileService.updateProfile(id, request.body);
  return { success: true, data: profile };
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

server.put('/bot/rules/:id', {
  schema: {
    description: 'Actualiza una regla de bot por ID',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { id } = request.params as { id: string };
  const rule = await BotService.updateRule(id, request.body);
  return { success: true, data: rule };
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

server.put('/bot/flows/:id', {
  schema: {
    description: 'Actualiza un flujo conversacional por ID',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { id } = request.params as { id: string };
  const flow = await BotService.updateFlow(id, request.body);
  return { success: true, data: flow };
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

// Webhook oficial de WhatsApp para procesar mensajes con MasterBotEngine
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
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'wa_webhook_secret_hmac_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info('WhatsApp Webhook verificado correctamente por Meta');
    return reply.status(200).send(challenge);
  }
  logger.warn({ mode, token, expectedToken }, 'Fallo en la verificación del webhook de WhatsApp');
  return reply.status(403).send('Verificación fallida');
});

server.get('/webhooks/whatsapp/:botId', {
  schema: {
    description: 'Verificación de webhook de WhatsApp para bot específico (Meta)',
    tags: ['Webhooks'],
  },
}, async (request, reply) => {
  const query = request.query as any;
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'wa_webhook_secret_hmac_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info({ botId: (request.params as any).botId }, 'WhatsApp Webhook específico verificado correctamente por Meta');
    return reply.status(200).send(challenge);
  }
  logger.warn({ mode, token, expectedToken }, 'Fallo en la verificación del webhook de WhatsApp específico');
  return reply.status(403).send('Verificación fallida');
});

server.post('/webhooks/whatsapp', {
  schema: {
    description: 'Recepción de mensajes de WhatsApp usando MasterBotEngine',
    tags: ['Webhooks'],
  },
}, async (request) => {
  const payload = request.body as any;
  const entry = payload?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (!message || !message.text) {
    return { processed: false, reason: 'not_text_message' };
  }

  const engine = new MasterBotEngine();
  const result = await engine.processMessage({
    senderPhone: message.from,
    incomingText: message.text.body,
    phoneNumberId: value?.metadata?.phone_number_id,
    rawPayload: payload,
  });
  return { success: true, data: result };
});

server.post('/webhooks/whatsapp/:botId', {
  schema: {
    description: 'Recepción de mensajes de WhatsApp para un bot específico usando MasterBotEngine',
    tags: ['Webhooks'],
  },
}, async (request) => {
  const { botId } = request.params as { botId: string };
  const payload = request.body as any;
  const entry = payload?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (!message || !message.text) {
    return { processed: false, reason: 'not_text_message' };
  }

  const { prisma } = await import('@repo/database');
  await prisma.botSession.upsert({
    where: { senderPhone: message.from },
    update: { activeBotId: botId },
    create: { senderPhone: message.from, activeBotId: botId },
  });

  const engine = new MasterBotEngine();
  const result = await engine.processMessage({
    senderPhone: message.from,
    incomingText: message.text.body,
    phoneNumberId: value?.metadata?.phone_number_id,
    rawPayload: payload,
  });
  return { success: true, data: result };
});

// ==========================================
// 5.1 ENDPOINTS DE MANIPULACIÓN DE CONFIGURACIÓN DEL BOT VÍA API (Menú, Bienvenida)
// ==========================================
server.get('/bot/profiles/:id/full', {
  schema: { description: 'Obtiene el perfil completo de un bot con reglas, flujos y configuración', tags: ['Bots & AI'] },
}, async (request) => {
  const { id } = request.params as { id: string };
  const { prisma } = await import('@repo/database');
  const profile = await prisma.botProfile.findUnique({
    where: { id },
    include: { rules: true, flows: true },
  }) || await prisma.botProfile.findUnique({
    where: { botId: id },
    include: { rules: true, flows: true },
  });
  return { success: true, data: profile };
});

server.put('/bot/profiles/:id/menu', {
  schema: { description: 'Modifica el menú principal y opciones de un bot vía API', tags: ['Bots & AI'] },
}, async (request) => {
  const { id } = request.params as { id: string };
  const { menuOptions, responseMessage } = request.body as { menuOptions: any[]; responseMessage?: string };
  const { prisma } = await import('@repo/database');
  
  const profile = await prisma.botProfile.findUnique({ where: { id } }) || await prisma.botProfile.findUnique({ where: { botId: id } });
  if (!profile) throw new Error('Bot profile not found');
  const profileUuid = profile.id;

  const rootFlow = await prisma.botFlow.findFirst({
    where: { botProfileId: profileUuid, parentId: null },
  });

  if (rootFlow) {
    const updated = await prisma.botFlow.update({
      where: { id: rootFlow.id },
      data: {
        content: JSON.stringify(menuOptions),
        responseMessage: responseMessage || rootFlow.responseMessage,
      },
    });
    return { success: true, data: updated };
  } else {
    const created = await prisma.botFlow.create({
      data: {
        botProfileId: profileUuid,
        name: `Menú Principal de ${profile.name}`,
        triggerKeyword: 'menu',
        flowType: 'menu',
        content: JSON.stringify(menuOptions),
        responseMessage: responseMessage || 'Selecciona una opción:',
        isActive: true,
      },
    });
    return { success: true, data: created };
  }
});

server.put('/bot/profiles/:id/welcome', {
  schema: { description: 'Modifica el mensaje de bienvenida o respuesta del flujo raíz de un bot vía API', tags: ['Bots & AI'] },
}, async (request) => {
  const { id } = request.params as { id: string };
  const { responseMessage } = request.body as { responseMessage: string };
  const { prisma } = await import('@repo/database');

  const profile = await prisma.botProfile.findUnique({ where: { id } }) || await prisma.botProfile.findUnique({ where: { botId: id } });
  if (!profile) throw new Error('Bot profile not found');
  const profileUuid = profile.id;

  const rootFlow = await prisma.botFlow.findFirst({
    where: { botProfileId: profileUuid, parentId: null },
  });

  if (rootFlow) {
    const updated = await prisma.botFlow.update({
      where: { id: rootFlow.id },
      data: { responseMessage },
    });
    return { success: true, data: updated };
  } else {
    return { success: false, message: 'No se encontró un flujo raíz para este bot.' };
  }
});
});

// ==========================================
// 6. CAPACIDADES DE DOMINIO REUTILIZABLES (API, Frontend, Bot)
// ==========================================
server.get('/capabilities', {
  schema: {
    description: 'Lista todas las capacidades de dominio registradas en el sistema',
    tags: ['Bots & AI'],
  },
}, async () => {
  const capabilities = CapabilityRegistry.getAll();
  return { success: true, data: capabilities };
});

server.post('/capabilities/execute', {
  schema: {
    description: 'Ejecuta una capacidad de dominio específica de forma unificada',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { capabilityKey, senderPhone, userId, botId, args } = request.body as any;
  return await CapabilityRegistry.execute(capabilityKey, { senderPhone, userId, botId, args });
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
