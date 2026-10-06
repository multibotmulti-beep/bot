import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { AppError } from './errors';
import { AuthService } from './auth';

export interface SaveMessageDTO {
  senderPhone: string;
  botId?: string;
  direction: 'incoming' | 'outgoing';
  message: string;
}

export class ChatService {
  static async saveMessage(data: SaveMessageDTO) {
    const { senderPhone, botId = 'admin', direction, message } = data;
    if (!senderPhone || !message) return null;

    logger.info({ senderPhone, direction, botId }, 'Guardando mensaje de chat en base de datos');
    return await prisma.chatMessage.create({
      data: {
        senderPhone: senderPhone.trim(),
        botId,
        direction,
        message: message.trim(),
      },
    });
  }

  static async getConversations(phoneNumber?: string) {
    const isAdmin = AuthService.isAdmin(phoneNumber);
    let where: any = {};

    if (!isAdmin && phoneNumber) {
      const cleanPhone = phoneNumber.trim();
      const userBots = await prisma.botProfile.findMany({
        where: {
          OR: [
            { phoneNumber: cleanPhone },
            { user: { phoneNumber: cleanPhone } }
          ]
        },
        select: { botId: true },
      });
      const botIds = userBots.map(b => b.botId);
      where = {
        AND: [
          { botId: { not: 'admin' } },
          {
            OR: [
              { botId: { in: botIds } },
              { senderPhone: cleanPhone }
            ]
          }
        ]
      };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const map = new Map<string, { senderPhone: string; lastMessage: string; lastAt: Date; totalMessages: number; botId: string }>();
    for (const m of messages) {
      if (!map.has(m.senderPhone)) {
        map.set(m.senderPhone, {
          senderPhone: m.senderPhone,
          lastMessage: m.message,
          lastAt: m.createdAt,
          totalMessages: 0,
          botId: m.botId,
        });
      }
      const entry = map.get(m.senderPhone)!;
      entry.totalMessages++;
    }
    return Array.from(map.values());
  }

  static async getMessagesByPhone(senderPhone: string) {
    const cleanPhone = senderPhone.trim();
    return await prisma.chatMessage.findMany({
      where: { senderPhone: cleanPhone },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async deleteChat(senderPhone: string) {
    const cleanPhone = senderPhone.trim();
    logger.info({ senderPhone: cleanPhone }, 'Eliminando historial de chat para el número');
    await prisma.chatMessage.deleteMany({
      where: { senderPhone: cleanPhone },
    });
    return { success: true, message: `Historial de chat para ${cleanPhone} eliminado correctamente` };
  }

  static async replyToUser(senderPhone: string, message: string, botId: string = 'admin') {
    const cleanPhone = senderPhone.trim();
    if (!cleanPhone || !message || !message.trim()) {
      throw new AppError('Phone number and message are required', 'Se requiere número de teléfono y mensaje válido.', 'INVALID_CHAT_PARAMS' as any, 400);
    }

    // 1. Guardar mensaje saliente en base de datos
    const saved = await this.saveMessage({
      senderPhone: cleanPhone,
      botId,
      direction: 'outgoing',
      message: message.trim(),
    });

    logger.info({ senderPhone: cleanPhone, message }, 'Respuesta a usuario registrada y enviada vía API de chat');
    return {
      success: true,
      data: saved,
    };
  }
}
