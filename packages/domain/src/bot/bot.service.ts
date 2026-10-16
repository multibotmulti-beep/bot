import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { CredentialService } from '../webhook';
import { ChatService } from '../chat';
import { BotConfig } from '../bot.config';
import { BotFunctionRegistry } from '../bot.functions';
import { getFrontendBaseUrl } from '../command';
import { BotProfileService } from './profile.service';
import { CreateBotRuleDTO, CreateBotRuleSchema, CreateBotFlowDTO, CreateBotFlowSchema } from './types';

export class BotService {
  static async getRules(botProfileId?: string) {
    logger.info({ botProfileId }, 'Obteniendo reglas del bot');
    const where = botProfileId ? { botProfileId } : {};
    return await prisma.botRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  static async createRule(data: CreateBotRuleDTO) {
    const validated = CreateBotRuleSchema.parse(data);
    logger.info({ keyword: validated.keyword, botProfileId: validated.botProfileId }, 'Creando regla de bot');

    return await prisma.botRule.create({
      data: {
        botProfileId: validated.botProfileId,
        keyword: validated.keyword.toLowerCase().trim(),
        matchType: validated.matchType,
        responseMessage: validated.responseMessage,
        isActive: validated.isActive,
      },
    });
  }

  static async deleteRule(id: string) {
    logger.info({ ruleId: id }, 'Eliminando regla de bot');
    return await prisma.botRule.delete({ where: { id } });
  }

  static async updateRule(id: string, data: any) {
    logger.info({ ruleId: id }, 'Actualizando regla de bot');
    return await prisma.botRule.update({
      where: { id },
      data: {
        keyword: data.keyword?.toLowerCase().trim(),
        matchType: data.matchType,
        responseMessage: data.responseMessage,
        isActive: data.isActive,
      },
    });
  }

  static async getFlows(botProfileId?: string) {
    logger.info({ botProfileId }, 'Obteniendo flujos de conversación');
    const where = botProfileId ? { botProfileId } : {};
    return await prisma.botFlow.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  static async createFlow(data: CreateBotFlowDTO) {
    const validated = CreateBotFlowSchema.parse(data);
    logger.info({ name: validated.name, botProfileId: validated.botProfileId }, 'Creando flujo de conversación');

    return await prisma.botFlow.create({
      data: {
        botProfileId: validated.botProfileId,
        name: validated.name.trim(),
        triggerKeyword: validated.triggerKeyword.toLowerCase().trim(),
        flowType: validated.flowType,
        content: validated.content,
        responseMessage: validated.responseMessage,
        isActive: validated.isActive,
      },
    });
  }

  static async deleteFlow(id: string) {
    logger.info({ flowId: id }, 'Eliminando flujo');
    return await prisma.botFlow.delete({ where: { id } });
  }

  static async updateFlow(id: string, data: any) {
    logger.info({ flowId: id }, 'Actualizando flujo');
    return await prisma.botFlow.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        triggerKeyword: data.triggerKeyword?.toLowerCase().trim(),
        flowType: data.flowType,
        content: data.content,
        responseMessage: data.responseMessage,
        isActive: data.isActive,
      },
    });
  }

  static async sendWhatsAppMessage(senderPhone: string, text: string, phoneNumberId?: string) {
    try {
      const credential = await CredentialService.getCredential('whatsapp');
      const dbToken = credential?.apiKey;
      const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN !== 'EAAG_MOCK_WHATSAPP_TOKEN_2026')
        ? process.env.WHATSAPP_ACCESS_TOKEN
        : (dbToken || process.env.WHATSAPP_ACCESS_TOKEN);

      if (!accessToken) {
        logger.error('No se encontraron credenciales de WhatsApp para enviar respuesta');
        return false;
      }

      let targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (!targetPhoneId && credential?.targetUrl) {
        const match = credential.targetUrl.match(/\/v[\d.]+\/(\d+)\/messages/);
        if (match) targetPhoneId = match[1];
      }
      if (!targetPhoneId) targetPhoneId = '880275461842101';

      const graphApiUrl = `https://graph.facebook.com/v17.0/${targetPhoneId}/messages`;

      await ChatService.saveMessage({
        senderPhone,
        botId: 'admin',
        direction: 'outgoing',
        message: text,
      });

      const response = await fetch(graphApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: senderPhone,
          type: 'text',
          text: { body: text },
        }),
      });

      const responseData = await response.json();
      logger.info({ responseStatus: response.status, responseData }, 'Respuesta enviada a WhatsApp exitosamente');
      return response.ok;
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error al enviar mensaje por Graph API de WhatsApp');
      return false;
    }
  }

  static async handleIncomingWebhook(payload: any, botId?: string): Promise<any> {
    logger.info({ payload, botId }, 'Procesando webhook entrante con Motor de Bot 100% Dinámico');
    try {
      const entry = payload?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const phoneNumberId = value?.metadata?.phone_number_id || BotConfig.defaultPhoneNumberId;

      if (!message || !message.text) {
        logger.info('Webhook ignorado: No es un mensaje de texto válido');
        return { processed: false, reason: 'not_text_message' };
      }

      const senderPhone = message.from;
      const incomingText = message.text.body.trim().toLowerCase();
      let matchedResponse: string | null = null;

      // Registrar mensaje entrante en chat
      await ChatService.saveMessage({
        senderPhone,
        botId: botId || BotConfig.defaultBotId,
        direction: 'incoming',
        message: message.text.body,
      });

      // 0. Verificador de sesión propio con código generado y número remitente
      const cleanIncoming = incomingText.replace(/[^a-z0-9_]/g, '');
      const tokenMatch = cleanIncoming.replace(/^(verificar|verify)[_ -]*/, '').trim() || incomingText.trim();
      
      if (cleanIncoming.startsWith('verificar') || cleanIncoming.startsWith('verify') || /^\d{6}$/.test(incomingText) || tokenMatch.length >= 6) {
        const session = await prisma.botSession.findUnique({
          where: { senderPhone },
        });

        if (!session || !session.loginToken || session.loginToken !== tokenMatch || (session.loginTokenExpires && session.loginTokenExpires < new Date())) {
          logger.warn({ senderPhone, tokenMatch, sessionToken: session?.loginToken }, 'Intento de verificación fallido: Token inválido, expirado o de otro número.');
          return {
            processed: true,
            responseMessage: '❌ *Error de autenticación:* El código de verificación es inválido, ha expirado o no corresponde a este número de WhatsApp. Cada código es exclusivo y de un solo uso para el número que solicitó el acceso.',
          };
        }

        // Token válido: limpiar para que sea de un solo uso
        await prisma.botSession.update({
          where: { senderPhone },
          data: { loginToken: null, loginTokenExpires: null, verified: true },
        });

        await prisma.user.upsert({
          where: { phoneNumber: senderPhone },
          update: {},
          create: { phoneNumber: senderPhone, name: `Usuario ${senderPhone}` },
        });

          const userRecord = await prisma.user.findUnique({
            where: { phoneNumber: senderPhone },
          });

          const userBots = await prisma.botProfile.findMany({
            where: {
              OR: [
                { phoneNumber: senderPhone },
                ...(userRecord ? [{ userId: userRecord.id }] : [])
              ]
            }
          });

          const pageUrl = getFrontendBaseUrl();
          const activeBotRecord = userBots[0];

          if (activeBotRecord) {
            await prisma.botSession.upsert({
              where: { senderPhone },
              update: { activeBotId: activeBotRecord.botId },
              create: { senderPhone, activeBotId: activeBotRecord.botId },
            });
          }

          let botsSummary = userBots.length > 0 
            ? userBots.map((b, i) => `   - ${i + 1}. *${b.name}* (ID: \`${b.botId}\`) [${b.isActive ? 'Activo' : 'Inactivo'}]`).join('\n')
            : '   - Ningún bot registrado aún.';

          const fullResponse = [
            `✅ *¡Login realizado con éxito!*`,
            ``,
            `📊 *Resumen de Sesión:*`,
            `🔗 *Página Oficial:* ${pageUrl}`,
            `📱 *Número Detectado:* \`${senderPhone}\``,
            `🤖 *Bots Activos (${userBots.length}):*`,
            botsSummary,
            ``,
            `✨ *Centro de Control Oficial (Admin):*`,
            `Selecciona una opción:`,
            `1. 🚀 Abrir bot activo${activeBotRecord ? ` (${activeBotRecord.name})` : ''}`,
            `2. 👤 Hablar con soporte técnico (+54 9 3765 24-5980)`,
            `0. ↩️ Volver`
          ].join('\n');

          await BotService.sendWhatsAppMessage(senderPhone, fullResponse, phoneNumberId);
          return { processed: true, response: fullResponse };
      }

      // Interceptar opción 1 (Abrir bot activo) y opción 2 (Soporte) en Admin
      const trimmedInput = incomingText.trim();
      if (trimmedInput === '1') {
        const userBots = await prisma.botProfile.findMany({
          where: { OR: [{ phoneNumber: senderPhone }] }
        });
        const activeBot = userBots[0];
        if (activeBot) {
          await prisma.botSession.upsert({
            where: { senderPhone },
            update: { activeBotId: activeBot.botId },
            create: { senderPhone, activeBotId: activeBot.botId }
          });
          return await BotService.handleIncomingWebhook(payload, activeBot.botId);
        } else {
          const msg = '❌ No tienes ningún bot activo creado aún. Crea uno desde la plataforma web.';
          await BotService.sendWhatsAppMessage(senderPhone, msg, phoneNumberId);
          return { processed: true, response: msg };
        }
      }

      if (trimmedInput === '2') {
        const supportMsg = '👤 *Soporte Técnico Oficial*\nPuedes comunicarte directamente con nuestro asesor técnico mediante el número de soporte: *+54 9 3765 24-5980*.';
        await BotService.sendWhatsAppMessage(senderPhone, supportMsg, phoneNumberId);
        return { processed: true, response: supportMsg };
      }

      // 1. Obtener o inicializar sesión del bot
      let session = await prisma.botSession.findUnique({ where: { senderPhone } });
      let activeBotId = botId || session?.activeBotId || BotConfig.defaultBotId;

      if (incomingText === '0' || incomingText === 'volver' || incomingText === 'atras' || incomingText === 'menu') {
        activeBotId = BotConfig.defaultBotId;
        await prisma.botSession.upsert({
          where: { senderPhone },
          update: { activeBotId, currentParentFlowId: null },
          create: { senderPhone, activeBotId },
        });
      }

      session = await prisma.botSession.upsert({
        where: { senderPhone },
        update: { activeBotId },
        create: { senderPhone, activeBotId },
      });

      // 2. Cargar perfil de bot activo desde la base de datos
      let profile = await BotProfileService.getProfileByBotId(activeBotId);
      if (!profile) {
        profile = await prisma.botProfile.findFirst({
          where: { isActive: true },
          include: { rules: true, flows: true },
        });
      }

      if (!profile) {
        logger.warn('No se encontró perfil de bot activo en la base de datos');
        return { processed: false, reason: 'no_active_bot_profile' };
      }
      const botProfileId = profile.id;

      // 3. Buscar coincidencia por Flujo (BotFlow) o Regla (BotRule) en la Base de Datos
      const currentParentId = session.currentParentFlowId || null;
      let matchedFlow: any = null;
      let matchedRule: any = null;

      const flows = await prisma.botFlow.findMany({
        where: { botProfileId, isActive: true, parentId: currentParentId },
      });

      if (incomingText.match(/^[0-9]+$/)) {
        const optIndex = parseInt(incomingText, 10) - 1;
        const parentFlow = currentParentId ? await prisma.botFlow.findUnique({ where: { id: currentParentId } }) : await prisma.botFlow.findFirst({ where: { botProfileId, isActive: true, parentId: null } });

        if (parentFlow) {
          try {
            const contentJson = JSON.parse(parentFlow.content);
            if (Array.isArray(contentJson) && contentJson[optIndex]) {
              const selectedItem = contentJson[optIndex];
              if (selectedItem.actionKey) {
                const result = await BotFunctionRegistry.execute(selectedItem.actionKey, { senderPhone, botId: profile.botId });
                matchedResponse = result.message;
              } else {
                matchedFlow = await prisma.botFlow.findFirst({
                  where: { botProfileId, parentId: parentFlow.id, triggerKeyword: selectedItem.option },
                }) || await prisma.botFlow.findFirst({
                  where: { botProfileId, parentId: parentFlow.id },
                });
              }
            }
          } catch {
            // Error al parsear JSON
          }
        }
      }

      if (!matchedFlow && !matchedResponse) {
        const rules = await prisma.botRule.findMany({ where: { botProfileId, isActive: true } });
        matchedRule = rules.find(r => r.matchType === 'exact' && r.keyword.toLowerCase() === incomingText);

        if (!matchedRule) {
          matchedFlow = flows.find(f => f.triggerKeyword.toLowerCase() === incomingText);
        }
      }

      if (matchedRule) {
        if (matchedRule.actionKey) {
          const result = await BotFunctionRegistry.execute(matchedRule.actionKey, { senderPhone, botId: profile.botId });
          matchedResponse = result.message || matchedRule.responseMessage;
        } else {
          matchedResponse = matchedRule.responseMessage;
        }
      } else if (matchedFlow) {
        await prisma.botSession.update({
          where: { senderPhone },
          data: { currentParentFlowId: matchedFlow.id },
        });

        if (matchedFlow.actionKey) {
          const result = await BotFunctionRegistry.execute(matchedFlow.actionKey, { senderPhone, botId: profile.botId });
          matchedResponse = result.message || matchedFlow.responseMessage;
        } else {
          let menuText = matchedFlow.responseMessage + '\n\n';
          try {
            const parsed = JSON.parse(matchedFlow.content);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any, idx: number) => {
                menuText += `${idx + 1}. ${item.label || item.option}\n`;
              });
            } else {
              menuText += matchedFlow.content;
            }
          } catch {
            menuText += matchedFlow.content;
          }
          matchedResponse = menuText.trim() + '\n\n0. ↩️ Volver';
        }
      } else if (!matchedResponse) {
        const rules = await prisma.botRule.findMany({ where: { botProfileId, isActive: true } });
        const defaultRule = rules.find(r => r.matchType === 'default' || r.keyword.toLowerCase() === 'default');
        
        if (defaultRule) {
          matchedResponse = defaultRule.responseMessage;
        } else {
          const rootFlow = await prisma.botFlow.findFirst({ where: { botProfileId, isActive: true, parentId: null } });
          if (rootFlow) {
            let menuText = rootFlow.responseMessage + '\n\n';
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
            matchedResponse = menuText.trim() + '\n\n0. ↩️ Volver';
          } else {
            matchedResponse = `¡Bienvenido a ${profile.name}! No se encontró respuesta configurada para tu mensaje. Envía "0" o "menu" para ver las opciones disponibles.`;
          }
        }
      }

      // Enviar respuesta vía WhatsApp (Graph API) y registrar log
      const credential = await CredentialService.getCredential('whatsapp');
      if (!credential || !credential.apiKey) {
        logger.error('No se encontraron credenciales de WhatsApp');
        return { processed: false, reason: 'missing_credentials' };
      }

      const accessToken = credential.apiKey;
      const graphApiUrl = `https://graph.facebook.com/${BotConfig.graphApiVersion}/${phoneNumberId}/messages`;

      if (matchedResponse) {
        await ChatService.saveMessage({
          senderPhone,
          botId: profile.botId,
          direction: 'outgoing',
          message: matchedResponse,
        });
      }

      const response = await fetch(graphApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: senderPhone,
          type: 'text',
          text: { body: matchedResponse },
        }),
      });

      const responseData = await response.json();

      await prisma.webhookLog.create({
        data: {
          credentialId: credential.id,
          event: 'whatsapp.bot.profile.reply',
          payload: JSON.stringify(payload),
          responseCode: response.status,
          responseBody: JSON.stringify(responseData),
          status: response.ok ? 'SUCCESS' : 'FAILED',
        },
      });

      return { processed: true, senderPhone, incomingText, matchedResponse, botId: profile.botId };
    } catch (error: any) {
      logger.error({ err: error.message }, 'Error en motor de bot dinámico');
      return { processed: false, error: error.message };
    }
  }
}
