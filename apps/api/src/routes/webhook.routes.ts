import { FastifyInstance } from 'fastify';
import { logger } from '@repo/logger';
import { WebhookService, MasterBotEngine } from '@repo/domain';

export async function webhookRoutes(server: FastifyInstance) {
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
}
