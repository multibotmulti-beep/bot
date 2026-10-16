import { FastifyInstance } from 'fastify';
import { AuthService, BotProfileService } from '@repo/domain';

export async function authRoutes(server: FastifyInstance) {
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

  server.post('/api/auth/whatsapp/initiate', {
    schema: {
      description: 'Inicia el proceso de autenticación real por WhatsApp (Alias)',
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
}
