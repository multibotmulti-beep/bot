import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { AppError } from './errors';
import { AuthService } from './auth';
import { BotFunctionRegistry } from './bot.functions';
import { BotProfileService } from './bot';

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

  static async getConversations(phoneNumber?: string, botId?: string) {
    let where: any = {};

    if (botId && botId.trim() !== '') {
      where.botId = botId.trim();
    } else if (phoneNumber && phoneNumber.trim()) {
      const isAdmin = AuthService.isAdmin(phoneNumber);
      if (!isAdmin) {
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
            { botId: { in: botIds } }
          ]
        };
      }
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

  static async getMessagesByPhone(senderPhone: string, botId?: string) {
    const cleanPhone = senderPhone.trim();
    logger.info({ senderPhone: cleanPhone, botId }, 'getMessagesByPhone: Consultando historial de mensajes');
    console.log(`[ChatService.getMessagesByPhone] Consultando mensajes para teléfono: ${cleanPhone}, botId: ${botId || 'N/A'}`);

    let messages = await prisma.chatMessage.findMany({
      where: {
        senderPhone: cleanPhone,
        ...(botId ? { botId } : {})
      },
      orderBy: { createdAt: 'asc' },
    });

    logger.info({ senderPhone: cleanPhone, botId, count: messages.length }, 'getMessagesByPhone: Mensajes encontrados en base de datos');
    console.log(`[ChatService.getMessagesByPhone] Mensajes encontrados en DB: ${messages.length}`);

    if (messages.length === 0) {
      logger.info({ senderPhone: cleanPhone, botId }, 'getMessagesByPhone: Historial vacío. Buscando perfil de bot para generar bienvenida automática');
      console.log(`[ChatService.getMessagesByPhone] Historial vacío. Buscando perfil de bot...`);

      let profile = (botId ? await prisma.botProfile.findUnique({ where: { botId }, include: { flows: true, rules: true } }) : null) ||
        await prisma.botProfile.findFirst({
          where: {
            OR: [
              { phoneNumber: cleanPhone },
              { isActive: true }
            ]
          },
          orderBy: { updatedAt: 'desc' },
          include: { flows: true, rules: true }
        }) || await prisma.botProfile.findFirst({ include: { flows: true, rules: true } });

      console.log(`[ChatService.getMessagesByPhone] Perfil encontrado:`, profile ? { id: profile.id, botId: profile.botId, name: profile.name } : 'Ninguno');

      if (!profile) {
        const newBotId = botId || cleanPhone;
        console.log(`[ChatService.getMessagesByPhone] Creando perfil de bot por defecto para ${newBotId}...`);
        await BotProfileService.createProfile({
          botId: newBotId,
          phoneNumber: cleanPhone,
          name: 'Asistente Virtual',
          description: 'Bot generado automáticamente',
          type: 'custom',
          isPublic: true,
          isActive: true,
          welcomeMessage: 'Acá va el título / texto de bienvenida',
          invalidOptionMessage: '⚠️ Opción incorrecta. Por favor, elige una opción válida del menú o escribe "0" para volver.',
          menuOptions: []
        });
        profile = await prisma.botProfile.findUnique({ where: { botId: newBotId }, include: { flows: true, rules: true } });
        console.log(`[ChatService.getMessagesByPhone] Perfil creado y cargado:`, profile?.botId);
      }

      const targetBotId = profile?.botId || botId || cleanPhone;
      let welcomeText = (profile as any)?.welcomeMessage || '¡Hola! Bienvenido al asistente virtual.';
      
      logger.info({ targetBotId, profileFound: !!profile, welcomeText }, 'getMessagesByPhone: Perfil y mensaje de bienvenida base obtenidos');

      const rootFlow = profile?.flows?.find(f => f.isActive && !f.parentId);
      if (rootFlow && rootFlow.responseMessage) {
        welcomeText = rootFlow.responseMessage.trim();
        logger.info({ targetBotId, welcomeTextLength: welcomeText.length }, 'getMessagesByPhone: Usando responseMessage del flujo raíz limpio');
      }

      console.log(`[ChatService.getMessagesByPhone] Mensaje bienvenida final a guardar:`, welcomeText);

      await this.saveMessage({
        senderPhone: cleanPhone,
        botId: targetBotId,
        direction: 'incoming',
        message: welcomeText,
      });

      logger.info({ senderPhone: cleanPhone, targetBotId }, 'getMessagesByPhone: Mensaje de bienvenida inicial guardado exitosamente');

      messages = await prisma.chatMessage.findMany({
        where: {
          senderPhone: cleanPhone,
          botId: targetBotId
        },
        orderBy: { createdAt: 'asc' },
      });
      console.log(`[ChatService.getMessagesByPhone] Mensajes generados y recuperados tras guardar bienvenida:`, messages);
    }

    console.log(`[ChatService.getMessagesByPhone] Retornando un total de ${messages.length} mensajes`, messages);
    return messages;
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
    logger.info({ senderPhone: cleanPhone, message, botId }, 'replyToUser: Procesando mensaje entrante del usuario');

    if (!cleanPhone || !message || !message.trim()) {
      logger.warn({ senderPhone: cleanPhone, message }, 'replyToUser: Parámetros de chat inválidos');
      throw new AppError('Phone number and message are required', 'Se requiere número de teléfono y mensaje válido.', 'INVALID_CHAT_PARAMS' as any, 400);
    }

    // 1. Guardar el mensaje del usuario como 'outgoing' (enviado por el usuario)
    await this.saveMessage({
      senderPhone: cleanPhone,
      botId,
      direction: 'outgoing',
      message: message.trim(),
    });

    // 2. Buscar perfil del bot en la base de datos con sus reglas y flujos reales
    let profile = await prisma.botProfile.findUnique({
      where: { botId },
      include: { rules: true, flows: true }
    });

    if (!profile) {
      profile = await prisma.botProfile.findFirst({
        where: { OR: [{ phoneNumber: cleanPhone }, { isActive: true }] },
        include: { rules: true, flows: true }
      }) || await prisma.botProfile.findFirst({ include: { rules: true, flows: true } });
    }

    logger.info({ botId, foundProfile: !!profile, rulesCount: profile?.rules?.length || 0, flowsCount: profile?.flows?.length || 0 }, 'replyToUser: Perfil de bot consultado');

    let botReplyText = '¡Hola! Bienvenido a nuestro asistente virtual. Escribe "menu" para ver las opciones disponibles.';

    if (profile) {
      const incomingText = message.trim().toLowerCase();
      const flows = profile.flows.filter(f => f.isActive);
      const rootFlow = flows.find(f => !f.parentId);

      // A. Buscar regla exacta en la base de datos
      const matchedRule = profile.rules.find(r => r.isActive && (r.keyword.toLowerCase() === incomingText || r.keyword.toLowerCase() === message.trim()));
      if (matchedRule) {
        logger.info({ ruleId: matchedRule.id, keyword: matchedRule.keyword, actionKey: matchedRule.actionKey }, 'replyToUser: Regla exacta emparejada');
        if (matchedRule.actionKey) {
          try {
            const result = await BotFunctionRegistry.execute(matchedRule.actionKey, { senderPhone: cleanPhone, botId });
            botReplyText = result.message || matchedRule.responseMessage;
            logger.info({ actionKey: matchedRule.actionKey, resultMessage: botReplyText }, 'replyToUser: Función de regla ejecutada con éxito');
          } catch (e: any) {
            botReplyText = matchedRule.responseMessage || `Error ejecutando función: ${e?.message}`;
            logger.error({ err: e?.message }, 'replyToUser: Error ejecutando función de regla');
          }
        } else {
          botReplyText = matchedRule.responseMessage;
        }
      } else {
        // B. Comprobar si es un número de opción numérica (ej. "1", "2") evaluando el flujo raíz
        const optNum = parseInt(message.trim(), 10);
        let optionHandled = false;

        if (!isNaN(optNum) && rootFlow) {
          logger.info({ optNum, rootFlowId: rootFlow.id }, 'replyToUser: Evaluando opción numérica contra flujo raíz');
          try {
            const contentJson = JSON.parse(rootFlow.content);
            if (Array.isArray(contentJson) && contentJson[optNum - 1]) {
              const selectedItem = contentJson[optNum - 1];
              optionHandled = true;
              logger.info({ selectedItem }, 'replyToUser: Opción de menú encontrada en contenido JSON');
              if (selectedItem.actionKey) {
                const result = await BotFunctionRegistry.execute(selectedItem.actionKey, { senderPhone: cleanPhone, botId });
                botReplyText = result.message || `Acción ${selectedItem.actionKey} ejecutada exitosamente.`;
                logger.info({ actionKey: selectedItem.actionKey, botReplyText }, 'replyToUser: Acción de menú ejecutada con éxito');
              } else if (selectedItem.option) {
                const childFlow = flows.find(f => f.parentId === rootFlow.id && (f.triggerKeyword.toLowerCase() === selectedItem.option.toLowerCase() || f.name.toLowerCase().includes(selectedItem.label?.toLowerCase() || '')));
                if (childFlow) {
                  botReplyText = childFlow.responseMessage;
                } else {
                  botReplyText = `Has seleccionado: ${selectedItem.label || selectedItem.option}`;
                }
              }
            }
          } catch (e: any) {
            logger.error({ err: e?.message }, 'replyToUser: Error procesando opción numérica de menú');
          }
        }

        // C. Si pide menú / hola / inicio / 0
        if (!optionHandled && (incomingText === 'menu' || incomingText === 'hola' || incomingText === 'start' || incomingText === '0' || incomingText.includes('menu'))) {
          logger.info('replyToUser: Solicitud de menú principal detectada');
          if (rootFlow) {
            let menuText = (rootFlow.responseMessage || '¡Bienvenido!') + '\n\n';
            try {
              const parsed = JSON.parse(rootFlow.content);
              if (Array.isArray(parsed)) {
                parsed.forEach((item: any, idx: number) => {
                  menuText += `${idx + 1}. ${item.label || item.option}\n`;
                });
              }
            } catch {
              menuText += rootFlow.content;
            }
            botReplyText = menuText.trim();
          } else {
            botReplyText = `¡Bienvenido a ${profile.name}!`;
          }
        } else if (!optionHandled) {
          logger.info('replyToUser: Opción no manejada, aplicando regla por defecto o mensaje de error de opción inválida');
          // D. Buscar regla por defecto (default rule) o mensaje de opción inválida sin re-adjuntar el menú completo
          const defaultRule = profile.rules.find(r => r.isActive && (r.matchType === 'default' || r.keyword.toLowerCase() === 'default'));
          if (defaultRule) {
            botReplyText = defaultRule.responseMessage;
          } else {
            botReplyText = profile.invalidOptionMessage || '⚠️ Opción incorrecta. Por favor, elige una opción válida del menú o escribe "0" para volver.';
          }
        }
      }
    }

    // 3. Guardar la respuesta del bot como 'incoming' (recibida del bot)
    const savedIncoming = await this.saveMessage({
      senderPhone: cleanPhone,
      botId,
      direction: 'incoming',
      message: botReplyText,
    });

    logger.info({ senderPhone: cleanPhone, botId, botReplyText }, 'replyToUser: Respuesta del bot generada y guardada exitosamente');
    return {
      success: true,
      data: savedIncoming,
      replyText: botReplyText
    };
  }
}
