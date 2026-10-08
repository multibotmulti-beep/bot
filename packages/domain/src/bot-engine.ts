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

export interface IncomingMessageContext {
  senderPhone: string;
  incomingText: string;
  phoneNumberId?: string;
  rawPayload?: any;
}

/**
 * Clase Base del Motor de Bot (Base Bot Engine)
 * Maneja la lógica común de persistencia, sesiones y despacho dinámico desde la BD.
 */
export abstract class BaseBotEngine {
  protected async getOrCreateSession(senderPhone: string, defaultBotId: string) {
    let session = await prisma.botSession.findUnique({ where: { senderPhone } });
    if (!session) {
      session = await prisma.botSession.create({
        data: { senderPhone, activeBotId: defaultBotId, wizardStep: 0 },
      });
    }
    return session;
  }

  protected async getCredentialFromDb(credentialName = 'whatsapp') {
    return await CredentialService.getCredential(credentialName);
  }

  public async sendResponseToWhatsApp(senderPhone: string, text: string, phoneNumberId?: string) {
    const credential = await this.getCredentialFromDb('whatsapp');
    if (!credential || !credential.apiKey) {
      logger.error('No se encontraron credenciales de WhatsApp en la base de datos');
      return false;
    }

    const accessToken = credential.apiKey;
    let targetPhoneId = phoneNumberId || BotConfig.defaultPhoneNumberId;
    if (!targetPhoneId && credential.targetUrl) {
      const match = credential.targetUrl.match(/\/v[\d.]+\/(\d+)\/messages/);
      if (match) targetPhoneId = match[1];
    }

    const graphApiUrl = `https://graph.facebook.com/${BotConfig.graphApiVersion}/${targetPhoneId}/messages`;

    await ChatService.saveMessage({
      senderPhone,
      botId: BotConfig.defaultBotId,
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

    // 1. Verificador de sesión propio con código generado y número remitente
    const cleanIncoming = incomingText.replace(/[^a-z0-9_]/g, '');
    const tokenMatch = cleanIncoming.replace(/^(verificar|verify)[_ -]*/, '').trim() || incomingText.trim();
    
    if (cleanIncoming.startsWith('verificar') || cleanIncoming.startsWith('verify') || /^\d{6}$/.test(incomingText) || tokenMatch.length >= 6) {
      const sessionToken = await prisma.botSession.findFirst({
        where: {
          OR: [
            { loginToken: tokenMatch },
            { loginToken: incomingText.trim() },
            { loginToken: cleanIncoming }
          ]
        }
      });

      if (sessionToken) {
        if (sessionToken.loginTokenExpires && sessionToken.loginTokenExpires < new Date()) {
          const expiredMsg = '⏳ El código de verificación ha expirado. Solicita uno nuevo desde la web o el menú.';
          await this.sendResponseToWhatsApp(senderPhone, expiredMsg, phoneNumberId);
          return { processed: true, response: expiredMsg };
        }

        const cleanSender = senderPhone.replace(/[^0-9]/g, '');
        const cleanTarget = sessionToken.senderPhone.replace(/[^0-9]/g, '');

        if (cleanSender !== cleanTarget) {
          logger.warn({ senderPhone, targetPhone: sessionToken.senderPhone }, 'Intento de suplantación de identidad detectado en verificación de token de WhatsApp');
          const spoofMsg = `❌ Error de Autenticación: El número de WhatsApp (${senderPhone}) no coincide con el número vinculado al token (${sessionToken.senderPhone}). No puedes verificar ni registrar un número que no posees.`;
          await this.sendResponseToWhatsApp(senderPhone, spoofMsg, phoneNumberId);
          return { processed: true, response: spoofMsg };
        }

        await prisma.botSession.update({
          where: { senderPhone: sessionToken.senderPhone },
          data: { loginToken: null, loginTokenExpires: null },
        });

        await prisma.user.upsert({
          where: { phoneNumber: senderPhone },
          update: {},
          create: { phoneNumber: senderPhone, name: `Usuario ${senderPhone}` },
        });

        const successMsg = `✅ ¡Verificación de sesión exitosa para el número ${senderPhone}! Tu cuenta ha sido autenticada correctamente.`;

        // Cargar perfil admin y menú raíz para responder automáticamente con el menú
        const adminProfile = await prisma.botProfile.findUnique({
          where: { botId: 'admin' },
          include: { flows: true },
        });

        let menuText = '';
        if (adminProfile) {
          const rootFlow = await prisma.botFlow.findFirst({ where: { botProfileId: adminProfile.id, isActive: true, parentId: null } });
          if (rootFlow) {
            menuText = '\n\n' + rootFlow.responseMessage + '\n\n';
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
            menuText = menuText.trim() + '\n\n0. ↩️ Volver';
          }
        }

        const fullResponse = `${successMsg}${menuText}`;
        await this.sendResponseToWhatsApp(senderPhone, fullResponse, phoneNumberId);
        return { processed: true, response: fullResponse };
      }
    }

    // 2. Gestionar sesión activa y delegación jerárquica
    let session = await this.getOrCreateSession(senderPhone, BotConfig.defaultBotId);
    let activeBotId = session.activeBotId;

    // Si el usuario envía comandos explícitos de salida, regresar al Bot Admin
    if (incomingText === '0' || incomingText === 'volver' || incomingText === 'admin' || incomingText === 'salir') {
      activeBotId = BotConfig.defaultBotId;
      await prisma.botSession.update({
        where: { senderPhone },
        data: { activeBotId: BotConfig.defaultBotId, currentParentFlowId: null, wizardStep: 0 },
      });
    }

    // Si el usuario está conectado a un bot hijo (UserBotEngine), delegar
    if (activeBotId !== 'admin') {
      const childBot = await prisma.botProfile.findUnique({ where: { botId: activeBotId } });
      if (childBot && childBot.isActive) {
        const userBotEngine = this.createUserBotEngine(childBot.botId);
        return await userBotEngine.processMessage(context);
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
      const parentFlow = currentParentId ? await prisma.botFlow.findUnique({ where: { id: currentParentId } }) : await prisma.botFlow.findFirst({ where: { botProfileId: profile.id, isActive: true, parentId: null } });

      if (parentFlow) {
        try {
          const contentJson = JSON.parse(parentFlow.content);
          if (Array.isArray(contentJson) && contentJson[optIndex]) {
            const selectedItem = contentJson[optIndex];
            if (selectedItem.actionKey) {
              const result = await BotFunctionRegistry.execute(selectedItem.actionKey, { senderPhone, botId: profile.botId });
              matchedResponse = result.message;
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
          matchedResponse = `¡Bienvenido a ${profile.name}! Envía "0" para regresar al menú principal.`;
        }
      }
    }

    await this.sendResponseToWhatsApp(senderPhone, matchedResponse || 'Respuesta por defecto', phoneNumberId);
    return { processed: true, senderPhone, incomingText, matchedResponse, botId: profile.botId };
  }
}
