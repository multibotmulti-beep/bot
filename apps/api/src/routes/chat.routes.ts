import { FastifyInstance } from 'fastify';
import { ChatService } from '@repo/domain';

export async function chatRoutes(server: FastifyInstance) {
  server.get('/api/chats', {
    schema: {
      description: 'Lista todas las conversaciones de chat activas agrupadas por número y bot',
      tags: ['Chat'],
    },
  }, async (request) => {
    const { phoneNumber, botId } = request.query as { phoneNumber?: string; botId?: string };
    const conversations = await ChatService.getConversations(phoneNumber, botId);
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
}
