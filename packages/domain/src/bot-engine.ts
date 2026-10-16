/**
 * Arquitectura del Motor de Bot (Bot Engine Structure)
 * Divide el motor en MasterBotEngine (Admin Central y Administrador de Bots Hijos)
 * y UserBotEngine (Bots Hijos/Usuarios operando de manera jerárquica por debajo).
 * 100% basado en Base de Datos (Credenciales, Mensajes, Menús, Reglas, Funciones).
 */

import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { BotConfig } from './bot.config';
import { BotFunctionRegistry } from './bot.functions';
import { CredentialService } from './webhook';
import { ChatService } from './chat';
import { getFrontendBaseUrl } from './command';
import { BotProfileService } from './bot';

export interface IncomingMessageContext {
  senderPhone: string;
  incomingText: string;
  phoneNumberId?: string;
  rawPayload?: any;
  headers?: Record<string, any>;
  protocol?: string;
}

export function normalizeSenderPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('549') && digits.length === 13) {
    return '54' + digits.slice(3);
  }
  return digits;
}

/**
 * Clase Base del Motor de Bot (Base Bot Engine)
 * Maneja la lógica común de persistencia, sesiones y despacho dinámico desde la BD.
 */
export abstract class BaseBotEngine {
  protected async getOrCreateSession(senderPhone: string, defaultBotId: string) {
    const cleanPhone = normalizeSenderPhone(senderPhone);
    let session = await prisma.botSession.findUnique({ where: { senderPhone: cleanPhone } });
    if (!session) {
      session = await prisma.botSession.findFirst({
        where: {
          OR: [
            { senderPhone },
            { senderPhone: cleanPhone },
            { senderPhone: { endsWith: cleanPhone.slice(-10) } }
          ]
        }
      });
    }

    if (!session) {
      // Verificar estrictamente si este número tiene un perfil de bot registrado y activo para él
      const userProfile = await prisma.botProfile.findFirst({
        where: {
          OR: [
            { phoneNumber: senderPhone },
            { phoneNumber: cleanPhone },
            { phoneNumber: { endsWith: cleanPhone.slice(-10) } }
          ],
          isActive: true
        },
        orderBy: { updatedAt: 'desc' }
      });

      const initialBotId = userProfile ? userProfile.botId : defaultBotId;

      session = await prisma.botSession.create({
        data: { senderPhone: cleanPhone, activeBotId: initialBotId, wizardStep: 0 },
      });
    }
    return session;
  }

  protected async getCredentialFromDb(credentialName = 'whatsapp') {
    return await CredentialService.getCredential(credentialName);
  }

  public async sendResponseToWhatsApp(senderPhone: string, text: string, phoneNumberId?: string, botId: string = BotConfig.defaultBotId) {
    const credential = await this.getCredentialFromDb('whatsapp');
    const dbToken = credential?.apiKey;
    const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN !== 'EAAG_MOCK_WHATSAPP_TOKEN_2026')
      ? process.env.WHATSAPP_ACCESS_TOKEN
      : (dbToken || process.env.WHATSAPP_ACCESS_TOKEN);

    if (!accessToken) {
      logger.error('No se encontraron credenciales de WhatsApp (ni en BD ni en variables de entorno)');
      return false;
    }

    let targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || BotConfig.defaultPhoneNumberId;
    if (!targetPhoneId && credential?.targetUrl) {
      const match = credential.targetUrl.match(/\/v[\d.]+\/(\d+)\/messages/);
      if (match) targetPhoneId = match[1];
    }

    const graphApiUrl = `https://graph.facebook.com/${BotConfig.graphApiVersion}/${targetPhoneId}/messages`;

    await ChatService.saveMessage({
      senderPhone,
      botId: botId || BotConfig.defaultBotId,
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
    logger.info({ status: response.status, responseData }, 'Respuesta de bot enviada a WhatsApp');
    return response.ok;
  }

  abstract processMessage(context: IncomingMessageContext): Promise<any>;
}

/**
 * MasterBotEngine (Bot Admin Central)
 * Administra el sistema maestro, credenciales desde base de datos, verificador de sesión propio,
 * y tiene la capacidad de crear y cargar bots hijos (UserBots) por debajo.
 */
export class MasterBotEngine extends BaseBotEngine {
  protected createUserBotEngine(botId: string): UserBotEngine {
    return new UserBotEngine(botId);
  }

  async processMessage(context: IncomingMessageContext): Promise<any> {
    const { senderPhone, incomingText, phoneNumberId, rawPayload } = context;
    logger.info({ senderPhone, incomingText }, 'MasterBotEngine procesando mensaje');

    // 0. Gestionar sesión activa y delegación jerárquica prioritaria
    let session = await this.getOrCreateSession(senderPhone, BotConfig.defaultBotId);
    let activeBotId = session.activeBotId;

    const trimmedInput = incomingText.trim();
    const lowerInput = trimmedInput.toLowerCase();

    // Si el usuario envía comandos explícitos de salida, regresar al Bot Admin
    if (lowerInput === '0' || lowerInput === 'volver' || lowerInput === 'admin' || lowerInput === 'salir') {
      activeBotId = BotConfig.defaultBotId;
      await prisma.botSession.update({
        where: { senderPhone },
        data: { activeBotId: BotConfig.defaultBotId, currentParentFlowId: null, wizardStep: 0 },
      });
    }

    // Si el usuario está conectado a un bot hijo (UserBotEngine) y no pidió salir, delegar inmediatamente
    if (activeBotId !== 'admin') {
      const childBot = await prisma.botProfile.findUnique({ where: { botId: activeBotId } });
      if (childBot && childBot.isActive) {
        await ChatService.saveMessage({
          senderPhone,
          botId: activeBotId,
          direction: 'incoming',
          message: incomingText,
        });
        const userBotEngine = this.createUserBotEngine(childBot.botId);
        return await userBotEngine.processMessage(context);
      }
    }

    // Guardar mensaje entrante como admin
    await ChatService.saveMessage({
      senderPhone,
      botId: 'admin',
      direction: 'incoming',
      message: incomingText,
    });

    // 1. Verificador de sesión propio con código generado y número remitente
    const cleanIncoming = incomingText.trim().toLowerCase();
    const tokenMatch = cleanIncoming.replace(/^(verificar|verify)[_ -]*/, '').trim() || incomingText.trim();
    const isVerificationCommand = cleanIncoming.startsWith('verificar') || cleanIncoming.startsWith('verify') || /^\d{6}$/.test(incomingText) || tokenMatch.length >= 6;
    
    if (isVerificationCommand) {
      const cleanSender = senderPhone.replace(/[^0-9]/g, '');
      const session = await prisma.botSession.findFirst({
        where: {
          OR: [
            { senderPhone },
            { senderPhone: cleanSender }
          ]
        }
      });

      if (!session || !session.loginToken || session.loginToken !== tokenMatch || (session.loginTokenExpires && session.loginTokenExpires < new Date())) {
        return {
          processed: true,
          responseMessage: '❌ *Error de autenticación:* El código de verificación es inválido, ha expirado o no corresponde a este número de WhatsApp. Cada código es exclusivo y de un solo uso.',
        };
      }

      // Token válido: limpiar y marcar como verificado
      await prisma.botSession.update({
        where: { senderPhone: session.senderPhone },
        data: { loginToken: null, loginTokenExpires: null, verified: true },
      });

      await prisma.user.upsert({
        where: { phoneNumber: session.senderPhone },
        update: {},
        create: { phoneNumber: session.senderPhone, name: `Usuario ${session.senderPhone}` },
      });

      const userRecord = await prisma.user.findUnique({
        where: { phoneNumber: session.senderPhone },
      });

      const userBots = await BotProfileService.getBotsForUser(session.senderPhone, userRecord?.id);

        const pageUrl = getFrontendBaseUrl(undefined, { headers: context.headers, protocol: context.protocol });
        const activeBotRecord = userBots[0];

        if (activeBotRecord) {
          await prisma.botSession.update({
            where: { senderPhone },
            data: { activeBotId: activeBotRecord.botId },
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

        await this.sendResponseToWhatsApp(senderPhone, fullResponse, phoneNumberId);
        return { processed: true, response: fullResponse };
    }

    const cleanText = incomingText.trim().toLowerCase();

    // Interceptar opción 1 (Abrir bot activo) y opción 2 (Soporte) en Admin
    if (trimmedInput === '1') {
      const userRecord = await prisma.user.findUnique({ where: { phoneNumber: senderPhone } });
      const userBots = await BotProfileService.getBotsForUser(senderPhone, userRecord?.id);
      const activeBot = userBots[0];
      if (activeBot) {
        await prisma.botSession.update({
          where: { senderPhone },
          data: { activeBotId: activeBot.botId },
        });
        const userBotEngine = this.createUserBotEngine(activeBot.botId);
        return await userBotEngine.processMessage({ ...context, incomingText: 'hola' });
      } else {
        const msg = '❌ No tienes ningún bot activo creado aún. Crea uno desde la plataforma web.';
        await this.sendResponseToWhatsApp(senderPhone, msg, phoneNumberId);
        return { processed: true, response: msg };
      }
    }

    if (trimmedInput === '2') {
      const supportMsg = '👤 *Soporte Técnico Oficial*\nPuedes comunicarte directamente con nuestro asesor técnico mediante el número de soporte: *+54 9 3765 24-5980*.';
      await this.sendResponseToWhatsApp(senderPhone, supportMsg, phoneNumberId);
      return { processed: true, response: supportMsg };
    }

    // Interceptar comando "activar [botId]" o "usar [botId]"
    if (cleanText.startsWith('activar ') || cleanText.startsWith('usar ')) {
      const targetBotId = incomingText.trim().replace(/^(activar|usar)\s*/i, '').trim();
      const targetProfile = await prisma.botProfile.findFirst({
        where: {
          OR: [
            { botId: targetBotId },
            { name: { contains: targetBotId, mode: 'insensitive' } }
          ],
          phoneNumber: senderPhone
        }
      });

      if (targetProfile) {
        await BotProfileService.activateProfile(targetProfile.id);
        await prisma.botSession.update({
          where: { senderPhone },
          data: { activeBotId: targetProfile.botId, currentParentFlowId: null },
        });
        const userBotEngine = this.createUserBotEngine(targetProfile.botId);
        return await userBotEngine.processMessage({ ...context, incomingText: 'menu' });
      } else {
        const errText = `❌ No se encontró ningún bot tuyo con el identificador o nombre "${targetBotId}". Envía "mis bots" para ver tu lista.`;
        await this.sendResponseToWhatsApp(senderPhone, errText, phoneNumberId);
        return { processed: true, response: errText };
      }
    }

    // Interceptar comando "mis bots" o "bots"
    if (cleanText === 'mis bots' || cleanText === 'bots') {
      const userRecord = await prisma.user.findUnique({ where: { phoneNumber: senderPhone } });
      const userBots = await BotProfileService.getBotsForUser(senderPhone, userRecord?.id);

      const listText = userBots.length > 0
        ? `🤖 *Tus Bots Registrados:*\n\n` + userBots.map((b, i) => `${i + 1}. *${b.name}* (ID: \`${b.botId}\`) [${b.isActive ? '🟢 Activo' : '⚪ Inactivo'}]`).join('\n') + `\n\n💡 Para activar uno, envía:\n*activar [ID del bot]*`
        : `🤖 No tienes ningún bot registrado aún.`;

      await this.sendResponseToWhatsApp(senderPhone, listText, phoneNumberId);
      return { processed: true, response: listText };
    }

    // Interceptar comando "bot [id_o_numero]" para activar, cambiar sesión e interactuar con el bot
    if (cleanText === 'bot' || cleanText.startsWith('bot ')) {
      const targetQuery = incomingText.trim().replace(/^bot\s*/i, '').trim();
      if (!targetQuery) {
        const userRecord = await prisma.user.findUnique({ where: { phoneNumber: senderPhone } });
        const userBots = await BotProfileService.getBotsForUser(senderPhone, userRecord?.id);
        const listText = userBots.length > 0
          ? `🤖 *Tus Bots Disponibles:*\n\n` + userBots.map((b, i) => `${i + 1}. *${b.name}* (ID: \`${b.botId}\`) [${b.isActive ? '🟢 Activo' : '⚪ Inactivo'}]`).join('\n') + `\n\n💡 Envía \`bot [ID o número]\` para interactuar con él.`
          : `🤖 No tienes ningún bot registrado aún.`;
        await this.sendResponseToWhatsApp(senderPhone, listText, phoneNumberId);
        return { processed: true, response: listText };
      }

      const targetProfile = await prisma.botProfile.findFirst({
        where: {
          OR: [
            { botId: targetQuery },
            { phoneNumber: { contains: targetQuery } },
            { name: { contains: targetQuery, mode: 'insensitive' } }
          ]
        }
      });

      if (targetProfile) {
        await BotProfileService.activateProfile(targetProfile.id);
        await prisma.botSession.update({
          where: { senderPhone },
          data: { activeBotId: targetProfile.botId, currentParentFlowId: null },
        });
        const userBotEngine = this.createUserBotEngine(targetProfile.botId);
        return await userBotEngine.processMessage({ ...context, incomingText: 'menu' });
      } else {
        const errText = `❌ No hay ningún bot con ese número o identificador "${targetQuery}".`;
        await this.sendResponseToWhatsApp(senderPhone, errText, phoneNumberId);
        return { processed: true, response: errText };
      }
    }

    // 3. Cargar perfil Admin desde Base de Datos
    const profile = await prisma.botProfile.findUnique({
      where: { botId: 'admin' },
      include: { rules: true, flows: true },
    });

    if (!profile) {
      logger.error('Perfil de Bot Admin no encontrado en la base de datos');
      return { processed: false, reason: 'admin_profile_missing' };
    }

    // 4. Evaluar flujos y reglas del Admin desde Base de Datos con unión a funciones
    let matchedResponse: string | null = null;
    const currentParentId = session.currentParentFlowId || null;
    const flows = await prisma.botFlow.findMany({
      where: { botProfileId: profile.id, isActive: true, parentId: currentParentId },
    });

    if (incomingText.match(/^[0-9]+$/)) {
      const optIndex = parseInt(incomingText, 10) - 1;
      const parentFlow = currentParentId ? await prisma.botFlow.findUnique({ where: { id: currentParentId } }) : await prisma.botFlow.findFirst({ where: { botProfileId: profile.id, isActive: true, parentId: null } });

      if (parentFlow) {
        try {
          const contentJson = JSON.parse(parentFlow.content);
          if (Array.isArray(contentJson) && contentJson[optIndex]) {
            const selectedItem = contentJson[optIndex];
            if (selectedItem.actionKey) {
              const result = await BotFunctionRegistry.execute(selectedItem.actionKey, { senderPhone, botId: profile.botId });
              matchedResponse = result.message;
            } else if (selectedItem.option) {
              const childFlow = await prisma.botFlow.findFirst({
                where: { botProfileId: profile.id, parentId: parentFlow.id, triggerKeyword: selectedItem.option },
              });
              if (childFlow) {
                await prisma.botSession.update({
                  where: { senderPhone },
                  data: { currentParentFlowId: childFlow.id },
                });
                matchedResponse = childFlow.responseMessage;
              }
            }
          }
        } catch {
          // JSON parse error
        }
      }
    }

    if (!matchedResponse) {
      const rules = await prisma.botRule.findMany({ where: { botProfileId: profile.id, isActive: true } });
      const matchedRule = rules.find(r => r.matchType === 'exact' && r.keyword.toLowerCase() === incomingText);
      if (matchedRule) {
        if (matchedRule.actionKey) {
          const res = await BotFunctionRegistry.execute(matchedRule.actionKey, { senderPhone, botId: profile.botId });
          matchedResponse = res.message || matchedRule.responseMessage;
        } else {
          matchedResponse = matchedRule.responseMessage;
        }
      } else {
        // Mostrar menú raíz por defecto desde BD
        const rootFlow = await prisma.botFlow.findFirst({ where: { botProfileId: profile.id, isActive: true, parentId: null } });
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
          matchedResponse = 'Bienvenido al Bot Admin Central. Envía "menu" para ver las opciones.';
        }
      }
    }

    await this.sendResponseToWhatsApp(senderPhone, matchedResponse || 'Operación completada', phoneNumberId);
    return { processed: true, senderPhone, incomingText, matchedResponse, botId: 'admin' };
  }
}

/**
 * UserBotEngine (Bot Hijo / Usuario)
 * Motor especializado para bots hijos creados y cargados por el MasterBotEngine.
 * Funciona de manera jerárquica por debajo, consumiendo sus propias reglas, menús y funciones desde la BD.
 */
export class UserBotEngine extends BaseBotEngine {
  constructor(private botId: string) {
    super();
  }

  async processMessage(context: IncomingMessageContext): Promise<any> {
    const { senderPhone, incomingText, phoneNumberId } = context;
    logger.info({ senderPhone, incomingText, botId: this.botId }, 'UserBotEngine procesando mensaje de bot hijo');

    const profile = await prisma.botProfile.findUnique({
      where: { botId: this.botId },
      include: { rules: true, flows: true },
    });

    if (!profile || !profile.isActive) {
      const err = `El bot hijo [${this.botId}] no está activo o no existe. Regresando al menú principal.`;
      await prisma.botSession.update({
        where: { senderPhone },
        data: { activeBotId: BotConfig.defaultBotId, currentParentFlowId: null },
      });
      await this.sendResponseToWhatsApp(senderPhone, err, phoneNumberId);
      return { processed: true, response: err };
    }

    let matchedResponse: string | null = null;
    let session = await this.getOrCreateSession(senderPhone, this.botId);
    const currentParentId = session.currentParentFlowId || null;

    const flows = await prisma.botFlow.findMany({
      where: { botProfileId: profile.id, isActive: true, parentId: currentParentId },
    });

    if (incomingText.match(/^[0-9]+$/)) {
      const optIndex = parseInt(incomingText, 10) - 1;
      logger.info({ incomingText, profileId: profile.id, currentParentId, optIndex }, 'UserBotEngine evaluando texto numérico');
      const parentFlow = currentParentId ? await prisma.botFlow.findUnique({ where: { id: currentParentId } }) : await prisma.botFlow.findFirst({ where: { botProfileId: profile.id, isActive: true, parentId: null }, orderBy: { updatedAt: 'desc' } });
      logger.info({ parentFlowFound: !!parentFlow, parentFlowId: parentFlow?.id }, 'Resultado de búsqueda de parentFlow');

      if (parentFlow) {
        try {
          logger.info({ parentFlowContent: parentFlow.content }, 'Contenido de parentFlow');
          const contentJson = JSON.parse(parentFlow.content);
          logger.info({ contentJson }, 'ContentJson parseado');
          if (Array.isArray(contentJson) && contentJson[optIndex]) {
            const selectedItem = contentJson[optIndex];
            logger.info({ selectedItem }, 'Item seleccionado del menú');
            if (selectedItem.actionKey) {
              const result = await BotFunctionRegistry.execute(selectedItem.actionKey, { senderPhone, botId: profile.botId });
              matchedResponse = result.message;
            } else if (selectedItem.response) {
              matchedResponse = selectedItem.response;
            } else {
              const childFlow = await prisma.botFlow.findFirst({
                where: { botProfileId: profile.id, parentId: parentFlow.id, triggerKeyword: selectedItem.option },
              }) || await prisma.botFlow.findFirst({
                where: { botProfileId: profile.id, parentId: parentFlow.id },
              });
              if (childFlow) {
                await prisma.botSession.update({
                  where: { senderPhone },
                  data: { currentParentFlowId: childFlow.id },
                });
                matchedResponse = childFlow.responseMessage;
              } else {
                matchedResponse = `Has seleccionado: *${selectedItem.label}*. (Opción sin función ni submenú configurado).`;
              }
            }
            logger.info({ matchedResponse }, 'Respuesta emparejada por selección numérica');
          }
        } catch (err) {
          logger.error({ err }, 'Error parseando content de botFlow o procesando selección');
        }
      }
    }

    if (!matchedResponse) {
      const rules = await prisma.botRule.findMany({ where: { botProfileId: profile.id, isActive: true } });
      const matchedRule = rules.find(r => r.matchType === 'exact' && r.keyword.toLowerCase() === incomingText);
      if (matchedRule) {
        if (matchedRule.actionKey) {
          const res = await BotFunctionRegistry.execute(matchedRule.actionKey, { senderPhone, botId: profile.botId });
          matchedResponse = res.message || matchedRule.responseMessage;
        } else {
          matchedResponse = matchedRule.responseMessage;
        }
      } else {
        const invalidMsg = profile.invalidOptionMessage || "⚠️ Opción incorrecta. Por favor, elige una de las opciones presentes en el menú o escribe '0' para volver.";
        const rootFlow = await prisma.botFlow.findFirst({ where: { botProfileId: profile.id, isActive: true, parentId: null }, orderBy: { updatedAt: 'desc' } });
        if (rootFlow) {
          let menuText = invalidMsg + '\n\n' + rootFlow.responseMessage + '\n\n';
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
          matchedResponse = `${invalidMsg}\n\nEnvía "0" para regresar al menú principal.`;
        }
      }
    }

    await this.sendResponseToWhatsApp(senderPhone, matchedResponse || 'Respuesta por defecto', phoneNumberId, this.botId);
    return { processed: true, senderPhone, incomingText, matchedResponse, botId: profile.botId };
  }
}
