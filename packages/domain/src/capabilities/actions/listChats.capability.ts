import { prisma } from '@repo/database';
import { CapabilityRegistry } from '../registry';
import { CapabilityContext, CapabilityResult } from '../types';

CapabilityRegistry.register({
  key: 'LIST_CHATS',
  name: 'Listar Mensajes de Chat',
  description: 'Lista los mensajes de chat para un número o bot específico',
  parameters: { senderPhone: 'string (Opcional)', botId: 'string (Opcional)' },
  exampleUsage: 'POST /capabilities/execute con { "capabilityKey": "LIST_CHATS", "args": { "botId": "admin" } }',
  execute: async (context: CapabilityContext): Promise<CapabilityResult> => {
    const { senderPhone, botId } = context.args || {};
    const where: any = {};
    if (senderPhone) where.senderPhone = senderPhone;
    if (botId) where.botId = botId;

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: messages,
      message: `💬 Se encontraron ${messages.length} mensajes de chat.`
    };
  }
});
