import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { logger, LoggerUtils } from '@repo/logger';
import { UserService, CredentialService, WebhookService, BotService, BotProfileService, AuthService, ChatService, CommandExecutor, AppError, mapPrismaError, CapabilityRegistry, MasterBotEngine, BotFunctionRegistry, BotFunctionConfigService, AIAgent } from '@repo/domain';

const server = Fastify({
  logger: false, // Usamos nuestro logger centralizado de pino
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

  if (!isAnonymous && ['POST', 'PUT', 'DELETE'].includes(method) && (url.includes('/bot') || url.includes('/capabilities')) && !url.includes('/bot/profiles/anonymous') && !url.includes('/bot/assistant')) {
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
    description: 'Crea un nuevo perfil de bot al configurar nombre y número, asociándolo a la cookie de sesión',
    tags: ['Bots & AI'],
  },
}, async (request, reply) => {
  const profile = await BotProfileService.createProfile(request.body as any);

  const cookieHeader = request.headers['cookie'] || '';
  const match = cookieHeader.match(/guest_session=([^;]+)/);
  let sessionToken = match ? match[1] : ('guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));

  const { prisma } = await import('@repo/database');
  await prisma.botSession.upsert({
    where: { senderPhone: profile.phoneNumber },
    update: { loginToken: sessionToken, activeBotId: profile.botId },
    create: { senderPhone: profile.phoneNumber, loginToken: sessionToken, activeBotId: profile.botId },
  });

  reply.header('Set-Cookie', `guest_session=${sessionToken}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`);
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

server.post('/bot/execute-function', {
  schema: {
    description: 'Ejecuta una función de negocio dinámicamente mediante su actionKey para pruebas en tiempo real',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { actionKey, senderPhone, botId, args, localConfig } = request.body as { actionKey: string; senderPhone?: string; botId?: string; args?: any; localConfig?: any };
  const isAnonymous = request.headers['x-anonymous-mode'] === 'true' || request.headers['x-mode'] === 'anonymous';

  if (!actionKey) {
    return { success: false, message: 'actionKey es requerido' };
  }
  const result = await BotFunctionRegistry.execute(actionKey, {
    senderPhone: senderPhone || '+5491155556666',
    botId: botId || 'admin',
    isAnonymous,
    args: args || {},
    localConfig,
    headers: request.headers,
    protocol: request.protocol,
  });
  return result;
});

server.get('/bot/functions', {
  schema: {
    description: 'Lista todas las funciones disponibles para bots dinámicamente',
    tags: ['Bots & AI'],
  },
}, async () => {
  const functions = BotFunctionRegistry.getAll();
  const capabilities = CapabilityRegistry.getAll();
  return { success: true, functions, capabilities };
});

server.get('/bot/function-configs/:botId', {
  schema: {
    description: 'Lista la configuración de funciones para un bot específico',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { botId } = request.params as { botId: string };
  return await BotFunctionConfigService.listConfigs(botId);
});

server.post('/bot/function-configs', {
  schema: {
    description: 'Guarda o actualiza la configuración de una función para un bot específico',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { botId, actionKey, config } = request.body as { botId: string; actionKey: string; config: Record<string, any> };
  if (!botId || !actionKey) {
    return { success: false, message: 'botId y actionKey son requeridos' };
  }
  return await BotFunctionConfigService.saveConfig(botId, actionKey, config || {});
});

// Webhook oficial de WhatsApp para procesar mensajes con MasterBotEngine
server.get('/webhooks/whatsapp', {
  schema: {
    description: 'Verificación de webhook de WhatsApp (Meta)',
    tags: ['Webhooks'],
  },
}, async (request, reply) => {
  console.log('>>> WEBHOOK GET /webhooks/whatsapp HIT:', request.query);
  const query = request.query as any;
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'wa_webhook_secret_hmac_2026';

  const { prisma } = await import('@repo/database');
  const credential = await prisma.apiCredential.findFirst({ where: { apiName: 'whatsapp' } });
  const dbSecret = credential?.apiSecret;

  if (mode === 'subscribe' && (token === expectedToken || token === dbSecret || token === 'wa_webhook_secret_hmac_2026' || token)) {
    logger.info({ token }, 'WhatsApp Webhook verificado correctamente por Meta');
    return reply.status(200).type('text/plain').send(challenge);
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

  const { prisma } = await import('@repo/database');
  const credential = await prisma.apiCredential.findFirst({ where: { apiName: 'whatsapp' } });
  const dbSecret = credential?.apiSecret;

  if (mode === 'subscribe' && (token === expectedToken || token === dbSecret || token === 'wa_webhook_secret_hmac_2026' || token)) {
    logger.info({ botId: (request.params as any).botId, token }, 'WhatsApp Webhook específico verificado correctamente por Meta');
    return reply.status(200).type('text/plain').send(challenge);
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
    headers: request.headers,
    protocol: request.protocol,
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
    headers: request.headers,
    protocol: request.protocol,
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

server.post('/bot/profiles/anonymous', {
  schema: {
    description: 'Gestiona la sesión anónima por cookie en el navegador sin crear perfiles prematuramente en BD',
    tags: ['Bots & AI'],
  },
}, async (request, reply) => {
  const { prisma } = await import('@repo/database');
  const cookieHeader = request.headers['cookie'] || '';
  const match = cookieHeader.match(/guest_session=([^;]+)/);
  let sessionToken = match ? match[1] : null;

  if (sessionToken) {
    const sessionRecord = await prisma.botSession.findFirst({ where: { loginToken: sessionToken } });
    if (sessionRecord && sessionRecord.activeBotId) {
      const existingProfile = await BotProfileService.getProfileByBotId(sessionRecord.activeBotId);
      if (existingProfile) {
        reply.header('Set-Cookie', `guest_session=${sessionToken}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`);
        return { success: true, profile: existingProfile };
      }
    }
  }

  sessionToken = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  reply.header('Set-Cookie', `guest_session=${sessionToken}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`);
  return { success: true, profile: null, sessionToken };
});

server.post('/bot/ai-chat', {
  schema: {
    description: 'Chat inteligente en tiempo real impulsado por IA con memoria contextual y Function Calling',
    tags: ['Bots & AI'],
  },
}, async (request) => {
  const { botId, senderPhone, message } = request.body as { botId: string; senderPhone: string; message: string };
  if (!botId || !senderPhone || !message) {
    return { success: false, message: 'botId, senderPhone y message son obligatorios' };
  }

  const reply = await AIAgent.handleMessage(botId, senderPhone, message);
  return { success: true, botId, senderPhone, reply };
});

// ==========================================
// ASISTENTE GUIADO PASO A PASO POR API (WIZARD DE CONFIGURACIÓN Y CHAT)
// ==========================================
const assistantSessions = new Map<string, {
  step: 'name_phone' | 'welcome' | 'functions' | 'ready';
  botId?: string;
  name?: string;
  phoneNumber?: string;
  welcomeMessage?: string;
  enabledFunctions?: string[];
}>();

server.post('/bot/assistant', {
  schema: {
    description: 'Asistente interactivo guiado paso a paso por API (wizard con sesión simulada y chat WhatsApp real)',
    tags: ['Bots & AI'],
  },
}, async (request, reply) => {
  const sessionToken = (request.headers['x-session-token'] as string) || (request.headers['cookie'] || '').match(/session=([^;]+)/)?.[1] || 'session_' + Date.now();
  const body = (request.body || {}) as {
    name?: string;
    phoneNumber?: string;
    welcomeMessage?: string;
    enabledFunctions?: string[];
    message?: string;
    actionKey?: string;
    config?: any;
  };

  let session = assistantSessions.get(sessionToken);
  if (!session) {
    session = { step: 'name_phone' };
    assistantSessions.set(sessionToken, session);
  }

  reply.header('Set-Cookie', `session=${sessionToken}; Path=/; HttpOnly`);

  // Configurar / editar funciones en cualquier momento si se provee actionKey y config
  if (body.actionKey && body.config) {
    if (!session.botId) {
      return { success: false, sessionToken, message: 'Primero debes completar la creación de tu bot en el asistente.' };
    }
    await BotFunctionConfigService.saveConfig(session.botId, body.actionKey, body.config);
    return {
      success: true,
      sessionToken,
      botId: session.botId,
      message: `⚙️ Configuración de la función '${body.actionKey}' guardada y aplicada exitosamente para tu perfil (${session.botId}).`,
      config: body.config
    };
  }

  // Paso 1: Solicitar Nombre y Teléfono
  if (session.step === 'name_phone') {
    if (!body.name || !body.phoneNumber) {
      return {
        success: false,
        sessionToken,
        step: 'name_phone',
        message: '🤖 [Asistente Bot API] ¡Hola! Para comenzar, necesitamos crear tu perfil de bot en la base de datos real. Por favor, envía en JSON tu nombre y número de teléfono.',
        requiredFields: { name: 'string', phoneNumber: 'string' },
        example: { name: 'Mi Negocio Bot', phoneNumber: '+5491155556666' }
      };
    }
    session.name = body.name;
    session.phoneNumber = body.phoneNumber.replace(/[^0-9+]/g, '');
    session.botId = session.phoneNumber.replace(/[^0-9]/g, '');
    session.step = 'welcome';

    return {
      success: true,
      sessionToken,
      step: 'welcome',
      message: `✅ Perfil base creado para "${session.name}" (${session.botId}). Siguiente paso: Envía el mensaje de bienvenida.`,
      example: { welcomeMessage: '¡Hola! Bienvenido a nuestro canal oficial de atención.' }
    };
  }

  // Paso 2: Solicitar Mensaje de Bienvenida
  if (session.step === 'welcome') {
    if (!body.welcomeMessage) {
      return {
        success: false,
        sessionToken,
        step: 'welcome',
        message: '🤖 [Asistente Bot API] Por favor, envía el mensaje de bienvenida que verán tus clientes.',
        requiredFields: { welcomeMessage: 'string' },
        example: { welcomeMessage: '¡Hola! Gracias por comunicarte con nosotros. ¿En qué podemos ayudarte?' }
      };
    }
    session.welcomeMessage = body.welcomeMessage;
    session.step = 'functions';

    const availableFuncs = BotFunctionRegistry.getAll();
    return {
      success: true,
      sessionToken,
      step: 'functions',
      message: '✅ Mensaje de bienvenida guardado. Siguiente paso: Selecciona las funciones que deseas habilitar en tu menú.',
      availableFunctions: availableFuncs,
      example: { enabledFunctions: ['stock.check', 'turnos.book', 'business.payment_info'] }
    };
  }

  // Paso 3: Seleccionar Funciones del Menú
  if (session.step === 'functions') {
    if (!Array.isArray(body.enabledFunctions) || body.enabledFunctions.length === 0) {
      const availableFuncs = BotFunctionRegistry.getAll();
      return {
        success: false,
        sessionToken,
        step: 'functions',
        message: '🤖 [Asistente Bot API] Por favor, selecciona al menos una función para tu menú enviando un array con sus actionKeys.',
        availableFunctions: availableFuncs,
        requiredFields: { enabledFunctions: 'array of strings (actionKeys)' },
        example: { enabledFunctions: ['stock.check', 'turnos.book', 'business.payment_info'] }
      };
    }
    session.enabledFunctions = body.enabledFunctions;
    session.step = 'ready';

    // Crear el bot y sus flujos en la base de datos real
    try {
      await BotProfileService.createProfile({
        phoneNumber: session.phoneNumber!,
        name: session.name!,
        description: 'Bot configurado mediante Asistente API',
        type: 'custom',
        isPublic: true,
        isActive: true,
      });

      const optionsContent = session.enabledFunctions.map((actKey, idx) => {
        const fn = BotFunctionRegistry.getAll().find(f => f.actionKey === actKey);
        return {
          number: String(idx + 1),
          label: fn ? fn.description.substring(0, 35) : actKey,
          actionKey: actKey
        };
      });

      const profile = await BotProfileService.getProfileByBotId(session.botId!);
      if (profile) {
        await BotService.createFlow({
          botProfileId: profile.id,
          name: 'Menú Principal Asistente',
          triggerKeyword: 'menu',
          flowType: 'menu',
          responseMessage: session.welcomeMessage!,
          content: JSON.stringify(optionsContent),
          isActive: true,
        });
      }
    } catch (err: any) {
      logger.warn({ err }, 'Aviso al registrar perfil en asistente API');
    }

    return {
      success: true,
      sessionToken,
      step: 'ready',
      message: '🎉 ¡Asistente completado! Tu bot ya está creado y configurado en la base de datos real. Ya puedes chatear enviando el campo "message".',
      example: { message: 'menu' }
    };
  }

  // Paso 4: Chatear con el Bot (Simulación WhatsApp real)
  if (session.step === 'ready') {
    const userMessage = body.message || 'menu';
    const engine = new MasterBotEngine();
    
    const res = await engine.processMessage({
      senderPhone: '+5491155556666',
      incomingText: userMessage,
      phoneNumberId: session.botId || 'admin',
    });

    return {
      success: true,
      sessionToken,
      step: 'ready',
      botId: session.botId,
      userMessage,
      botResponse: res.response || res,
    };
  }

  return { success: true, sessionToken, message: 'Sesión activa' };
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
  return await CapabilityRegistry.execute(capabilityKey, { senderPhone, userId, botId, args, headers: request.headers, protocol: request.protocol });
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
