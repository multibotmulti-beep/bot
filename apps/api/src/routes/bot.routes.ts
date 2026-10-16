import { FastifyInstance } from 'fastify';
import { logger } from '@repo/logger';
import { 
  CommandExecutor, 
  BotProfileService, 
  BotService, 
  BotFunctionRegistry, 
  CapabilityRegistry, 
  BotFunctionConfigService, 
  AIAgent, 
  MasterBotEngine 
} from '@repo/domain';

// Estado en memoria para el asistente guiado paso a paso por API
const assistantSessions = new Map<string, {
  step: 'name_phone' | 'welcome' | 'functions' | 'ready';
  botId?: string;
  name?: string;
  phoneNumber?: string;
  welcomeMessage?: string;
  enabledFunctions?: string[];
}>();

export async function botRoutes(server: FastifyInstance) {
  // Motor de ejecución universal
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
  }, async (request) => {
    const result = await CommandExecutor.execute(request.body as any);
    return { success: true, data: result };
  });

  // Perfiles de Bots
  server.get('/bot/profiles', {
    schema: { description: 'Lista los perfiles de bots configurados', tags: ['Bots & AI'] },
  }, async (request) => {
    const { phoneNumber } = request.query as { phoneNumber?: string };
    const profiles = await BotProfileService.getProfiles(phoneNumber);
    return { success: true, data: profiles };
  });

  server.post('/bot/profiles', {
    schema: { description: 'Crea un nuevo perfil de bot', tags: ['Bots & AI'] },
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
    schema: { description: 'Actualiza un perfil de bot por ID', tags: ['Bots & AI'] },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const profile = await BotProfileService.updateProfile(id, request.body);
    return { success: true, data: profile };
  });

  server.put('/bot/profiles/:id/activate', {
    schema: { description: 'Activa un perfil de bot', tags: ['Bots & AI'] },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const profile = await BotProfileService.activateProfile(id);
    return { success: true, data: profile };
  });

  // Reglas de Bots
  server.get('/bot/rules', {
    schema: { description: 'Lista las reglas de respuesta automática', tags: ['Bots & AI'] },
  }, async (request) => {
    const { botProfileId } = request.query as { botProfileId?: string };
    const rules = await BotService.getRules(botProfileId);
    return { success: true, data: rules };
  });

  server.post('/bot/rules', {
    schema: { description: 'Crea una regla de respuesta', tags: ['Bots & AI'] },
  }, async (request, reply) => {
    const rule = await BotService.createRule(request.body as any);
    reply.status(201).send({ success: true, data: rule });
  });

  server.put('/bot/rules/:id', {
    schema: { description: 'Actualiza una regla de bot por ID', tags: ['Bots & AI'] },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const rule = await BotService.updateRule(id, request.body);
    return { success: true, data: rule };
  });

  server.delete('/bot/rules/:id', {
    schema: { description: 'Elimina una regla de bot por ID', tags: ['Bots & AI'] },
  }, async (request) => {
    const { id } = request.params as { id: string };
    await BotService.deleteRule(id);
    return { success: true, message: 'Regla de bot eliminada correctamente' };
  });

  // Flujos de Bots
  server.get('/bot/flows', {
    schema: { description: 'Lista los flujos conversacionales', tags: ['Bots & AI'] },
  }, async (request) => {
    const { botProfileId } = request.query as { botProfileId?: string };
    const flows = await BotService.getFlows(botProfileId);
    return { success: true, data: flows };
  });

  server.post('/bot/flows', {
    schema: { description: 'Crea un flujo conversacional', tags: ['Bots & AI'] },
  }, async (request, reply) => {
    const flow = await BotService.createFlow(request.body as any);
    reply.status(201).send({ success: true, data: flow });
  });

  server.put('/bot/flows/:id', {
    schema: { description: 'Actualiza un flujo por ID', tags: ['Bots & AI'] },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const flow = await BotService.updateFlow(id, request.body);
    return { success: true, data: flow };
  });

  server.delete('/bot/flows/:id', {
    schema: { description: 'Elimina un flujo por ID', tags: ['Bots & AI'] },
  }, async (request) => {
    const { id } = request.params as { id: string };
    await BotService.deleteFlow(id);
    return { success: true, message: 'Flujo de conversación eliminado correctamente' };
  });

  // Funciones y Capacidades
  server.post('/bot/execute-function', {
    schema: { description: 'Ejecuta una función de negocio dinámicamente', tags: ['Bots & AI'] },
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
    schema: { description: 'Lista todas las funciones disponibles', tags: ['Bots & AI'] },
  }, async () => {
    const functions = BotFunctionRegistry.getAll();
    const capabilities = CapabilityRegistry.getAll();
    return { success: true, functions, capabilities };
  });

  server.get('/bot/function-configs/:botId', {
    schema: { description: 'Lista configuración de funciones para un bot', tags: ['Bots & AI'] },
  }, async (request) => {
    const { botId } = request.params as { botId: string };
    return await BotFunctionConfigService.listConfigs(botId);
  });

  server.post('/bot/function-configs', {
    schema: { description: 'Guarda configuración de función para un bot', tags: ['Bots & AI'] },
  }, async (request) => {
    const { botId, actionKey, config } = request.body as { botId: string; actionKey: string; config: Record<string, any> };
    if (!botId || !actionKey) {
      return { success: false, message: 'botId y actionKey son requeridos' };
    }
    return await BotFunctionConfigService.saveConfig(botId, actionKey, config || {});
  });

  // Perfil completo y edición de menú/bienvenida
  server.get('/bot/profiles/:id/full', {
    schema: { description: 'Obtiene el perfil completo de un bot', tags: ['Bots & AI'] },
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
    schema: { description: 'Modifica el menú principal de un bot', tags: ['Bots & AI'] },
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
    schema: { description: 'Modifica el mensaje de bienvenida de un bot', tags: ['Bots & AI'] },
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
    schema: { description: 'Gestiona la sesión anónima por cookie', tags: ['Bots & AI'] },
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
    schema: { description: 'Chat inteligente en tiempo real impulsado por IA', tags: ['Bots & AI'] },
  }, async (request) => {
    const { botId, senderPhone, message } = request.body as { botId: string; senderPhone: string; message: string };
    if (!botId || !senderPhone || !message) {
      return { success: false, message: 'botId, senderPhone y message son obligatorios' };
    }

    const reply = await AIAgent.handleMessage(botId, senderPhone, message);
    return { success: true, botId, senderPhone, reply };
  });

  // Asistente Guiado Wizard
  server.post('/bot/assistant', {
    schema: { description: 'Asistente interactivo guiado paso a paso por API', tags: ['Bots & AI'] },
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

  // Capacidades
  server.get('/capabilities', {
    schema: { description: 'Lista todas las capacidades de dominio registradas', tags: ['Bots & AI'] },
  }, async () => {
    const capabilities = CapabilityRegistry.getAll();
    return { success: true, data: capabilities };
  });

  server.post('/capabilities/execute', {
    schema: { description: 'Ejecuta una capacidad de dominio específica', tags: ['Bots & AI'] },
  }, async (request) => {
    const { capabilityKey, senderPhone, userId, botId, args } = request.body as any;
    return await CapabilityRegistry.execute(capabilityKey, { senderPhone, userId, botId, args, headers: request.headers, protocol: request.protocol });
  });
}
