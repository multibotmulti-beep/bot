import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { CredentialService } from './webhook';
import { ChatService } from './chat';
import { AuthService } from './auth';
import { CapabilityRegistry } from './capabilities';
import { BotConfig } from './bot.config';
import { BotFunctionRegistry } from './bot.functions';
import { z } from 'zod';

export const CreateBotProfileSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/, { message: 'El número de teléfono debe ser válido (8 a 15 dígitos)' }),
  name: z.string().min(1, { message: 'El nombre del bot es obligatorio' }),
  description: z.string().optional(),
  welcomeMessage: z.string().optional(),
  menuOptions: z.array(z.object({ label: z.string(), option: z.string() })).optional(),
  type: z.enum(['demo', 'custom', 'system']).default('custom'),
  isPublic: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const CreateBotRuleSchema = z.object({
  botProfileId: z.string().min(1, { message: 'El ID del perfil de bot es obligatorio' }),
  keyword: z.string().min(1, { message: 'La palabra clave es obligatoria' }),
  matchType: z.enum(['exact', 'contains', 'default']).default('exact'),
  responseMessage: z.string().min(1, { message: 'El mensaje de respuesta es obligatorio' }),
  isActive: z.boolean().default(true),
});

export const CreateBotFlowSchema = z.object({
  botProfileId: z.string().min(1, { message: 'El ID del perfil de bot es obligatorio' }),
  name: z.string().min(1, { message: 'El nombre del flujo es obligatorio' }),
  triggerKeyword: z.string().min(1, { message: 'La palabra clave de activación es obligatoria' }),
  flowType: z.enum(['menu', 'conversation']).default('menu'),
  content: z.string().min(1, { message: 'El contenido es obligatorio' }),
  responseMessage: z.string().min(1, { message: 'El mensaje de respuesta es obligatorio' }),
  isActive: z.boolean().default(true),
});

export type CreateBotProfileDTO = z.infer<typeof CreateBotProfileSchema>;
export type CreateBotRuleDTO = z.infer<typeof CreateBotRuleSchema>;
export type CreateBotFlowDTO = z.infer<typeof CreateBotFlowSchema>;

export class BotProfileService {
  // Almacén temporal en memoria para códigos OTP por número de teléfono
  private static otpStore = new Map<string, { code: string; expiresAt: number }>();

  // Almacén para autenticación sin contraseña por WhatsApp real
  private static pendingAuthStore = new Map<string, { phoneNumber: string; expiresAt: number; verified: boolean }>();

  static async initiateWhatsAppAuth(phoneNumber: string) {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      throw new Error('Número de teléfono inválido');
    }
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAtDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await prisma.botSession.upsert({
      where: { senderPhone: cleanPhone },
      update: {
        loginToken: token,
        loginTokenExpires: expiresAtDate,
      },
      create: {
        senderPhone: cleanPhone,
        loginToken: token,
        loginTokenExpires: expiresAtDate,
      },
    });

    // Detectar el número oficial del bot
    let botNumber = process.env.WHATSAPP_BOT_NUMBER || process.env.BOT_PHONE_NUMBER || '';
    if (!botNumber) {
      try {
        const adminBot = await prisma.botProfile.findUnique({
          where: { botId: 'admin' },
        });
        if (adminBot && adminBot.phoneNumber) {
          botNumber = adminBot.phoneNumber;
        }
      } catch (err) {
        logger.error({ err }, 'Error al buscar número del bot admin en base de datos');
      }
    }

    if (!botNumber) {
      botNumber = '5493765376985'; // Número por defecto oficial del bot
    }

    const cleanBotNumber = botNumber.replace(/[^0-9]/g, '');
    const whatsappLink = cleanBotNumber 
      ? `https://wa.me/${cleanBotNumber}?text=VERIFICAR_${token}`
      : `https://wa.me/?text=VERIFICAR_${token}`;

    logger.info({ cleanPhone, token, cleanBotNumber, whatsappLink }, 'Iniciando autenticación sin contraseña por WhatsApp con enlace directo al bot');
    return {
      success: true,
      message: 'Token de inicio de sesión generado. Envía este código por WhatsApp al bot para verificar tu número.',
      token,
      whatsappLink,
    };
  }

  static async checkWhatsAppAuthStatus(phoneNumber: string) {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const user = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
    });
    if (user) {
      return { success: true, verified: true, message: 'Autenticación exitosa por WhatsApp' };
    }
    const session = await prisma.botSession.findUnique({
      where: { senderPhone: cleanPhone },
    });
    if (session && session.loginToken === null) {
      return { success: true, verified: true, message: 'Autenticación exitosa por WhatsApp' };
    }
    return { success: true, verified: false, message: 'Pendiente de verificación por WhatsApp' };
  }

  static async getProfiles(phoneNumber?: string) {
    logger.info({ phoneNumber }, 'Obteniendo perfiles de bots');
    const isAdmin = AuthService.isAdmin(phoneNumber);
    const where: any = {};
    if (!isAdmin && phoneNumber) {
      where.phoneNumber = phoneNumber.trim();
    }
    return await prisma.botProfile.findMany({
      where,
      include: {
        rules: true,
        flows: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getProfileByBotId(botId: string) {
    logger.info({ botId }, 'Obteniendo perfil de bot por botId');
    return await prisma.botProfile.findUnique({
      where: { botId },
      include: {
        rules: true,
        flows: true,
      },
    });
  }

  static async generateOtp(phoneNumber: string) {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      throw new Error('Número de teléfono inválido para generar OTP');
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos
    this.otpStore.set(cleanPhone, { code, expiresAt });
    logger.info({ phoneNumber: cleanPhone, code }, 'OTP generado para validación de bot por teléfono');
    return { success: true, message: 'Código OTP generado con éxito', code };
  }

  static async verifyOtp(phoneNumber: string, code: string) {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const entry = this.otpStore.get(cleanPhone);
    if (!entry) {
      throw new Error('No hay OTP pendiente para este número de teléfono');
    }
    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(cleanPhone);
      throw new Error('El código OTP ha expirado');
    }
    if (entry.code !== code.trim()) {
      throw new Error('Código OTP incorrecto');
    }
    this.otpStore.delete(cleanPhone);
    logger.info({ phoneNumber: cleanPhone }, 'OTP verificado exitosamente para el número');
    return { success: true, message: 'OTP verificado correctamente' };
  }

  static async createProfile(data: CreateBotProfileDTO) {
    const validated = CreateBotProfileSchema.parse(data);
    logger.info({ phoneNumber: validated.phoneNumber, name: validated.name }, 'Creando o actualizando perfil de bot asociado a usuario');

    const botId = validated.phoneNumber.trim().replace(/[^0-9+]/g, '');
    const cleanPhone = validated.phoneNumber.trim();

    // Buscar o crear usuario asociado a este número de teléfono
    const user = await prisma.user.upsert({
      where: { phoneNumber: cleanPhone },
      update: {},
      create: { phoneNumber: cleanPhone, name: `Usuario ${cleanPhone}` },
    });

    const profile = await prisma.botProfile.upsert({
      where: { botId },
      update: {
        name: validated.name.trim(),
        description: validated.description,
        type: validated.type,
        isPublic: validated.isPublic,
        isActive: validated.isActive,
        userId: user.id,
      },
      create: {
        botId,
        phoneNumber: cleanPhone,
        name: validated.name.trim(),
        description: validated.description,
        type: validated.type,
        isPublic: validated.isPublic,
        isActive: validated.isActive,
        userId: user.id,
      },
    });

    // Guardar el flujo de menú personalizado proporcionado por el usuario en la BD (sin hardcoding)
    if (validated.welcomeMessage || (validated.menuOptions && validated.menuOptions.length > 0)) {
      await prisma.botFlow.create({
        data: {
          botProfileId: profile.id,
          name: `Menú de ${profile.name}`,
          triggerKeyword: 'menu',
          flowType: 'menu',
          content: JSON.stringify(validated.menuOptions || []),
          responseMessage: validated.welcomeMessage || `Bienvenido a ${profile.name}. Selecciona una opción:`,
          isActive: true,
        },
      });
    }

    return profile;
  }

  static async deleteProfile(id: string) {
    logger.info({ profileId: id }, 'Eliminando perfil de bot');
    return await prisma.botProfile.delete({ where: { id } });
  }

  static async updateProfile(id: string, data: any) {
    logger.info({ profileId: id }, 'Actualizando perfil de bot');
    return await prisma.botProfile.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        isPublic: data.isPublic,
        isActive: data.isActive,
        phoneNumber: data.phoneNumber,
      },
    });
  }

  static async seedDemoProfiles() {
    logger.info('Sembrando perfiles de bots demo pre-cargados y Bot Admin Central');

    // Sembrar Bot Admin Central (Aislado y maestro)
    const adminExists = await prisma.botProfile.findUnique({ where: { botId: 'admin' } });
    if (!adminExists) {
      const adminProfile = await prisma.botProfile.create({
        data: {
          botId: 'admin',
          name: 'Bot Admin Central',
          description: 'Panel maestro de gestión, menú público y acceso a perfiles de bots.',
          type: 'system',
          isPublic: true,
          isActive: true,
        },
      });

      // Menú público del Bot Admin
      await prisma.botFlow.create({
        data: {
          botProfileId: adminProfile.id,
          name: 'Menú Público Bot Admin',
          triggerKeyword: 'menu',
          flowType: 'menu',
          content: JSON.stringify([
            { label: '1. 🔑 Iniciar sesión / Mi cuenta', option: '1', actionKey: 'auth.login' },
            { label: '2. 📋 Listar mis bots', option: '2', actionKey: 'bot.list_my_bots' },
            { label: '3. 🤖 Ver todos los bots', option: '3', actionKey: 'bot.list_all' },
            { label: '4. 👤 Hablar con un asesor', option: '4', actionKey: 'support.human' }
          ]),
          responseMessage: '¡Bienvenido al Bot Oficial! Por favor selecciona una opción:',
          isActive: true,
        },
      });

      // Regla para menú secreto (listar IDs)
      await prisma.botRule.create({
        data: {
          botProfileId: adminProfile.id,
          keyword: 'menu secreto',
          matchType: 'contains',
          responseMessage: 'ADMIN_SECRET_PROFILES_LIST',
          isActive: true,
        },
      });
    }

    const demos = [
      {
        botId: 'demo-soporte',
        name: 'Bot de Soporte Técnico',
        description: 'Bot pre-cargado para atención al cliente y preguntas frecuentes (FAQs).',
        type: 'demo',
      },
      {
        botId: 'demo-ventas',
        name: 'Bot de E-commerce y Ventas',
        description: 'Bot pre-cargado con catálogo de productos y carrito de compras.',
        type: 'demo',
      },
      {
        botId: 'demo-citas',
        name: 'Bot de Agendamiento de Citas',
        description: 'Bot pre-cargado para reserva de turnos y recordatorios.',
        type: 'demo',
      },
    ];

    for (const demo of demos) {
      const existing = await prisma.botProfile.findUnique({ where: { botId: demo.botId } });
      if (!existing) {
        const profile = await prisma.botProfile.create({
          data: {
            botId: demo.botId,
            name: demo.name,
            description: demo.description,
            type: demo.type,
            isPublic: true,
            isActive: true,
          },
        });

        // Crear flujo de menú de bienvenida para el demo
        await prisma.botFlow.create({
          data: {
            botProfileId: profile.id,
            name: `Menú Principal ${demo.name}`,
            triggerKeyword: 'menu',
            flowType: 'menu',
            content: JSON.stringify([
              { label: 'Consultar información general', option: '1' },
              { label: 'Hablar con un asesor humano', option: '2' },
              { label: 'Horarios y ubicación', option: '3' }
            ]),
            responseMessage: `¡Hola! Bienvenido a ${demo.name}. Selecciona una opción del menú:`,
            isActive: true,
          },
        });

        // Crear regla por defecto
        await prisma.botRule.create({
          data: {
            botProfileId: profile.id,
            keyword: 'default',
            matchType: 'default',
            responseMessage: `Gracias por comunicarte con ${demo.name}. Escribe "menu" para ver las opciones disponibles.`,
            isActive: true,
          },
        });
      }
    }
    return { seeded: true, count: demos.length };
  }
}

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
      if (!credential || !credential.apiKey) {
        logger.error('No se encontraron credenciales de WhatsApp para enviar respuesta');
        return false;
      }

      const accessToken = credential.apiKey;
      let targetPhoneId = phoneNumberId;
      if (!targetPhoneId && credential.targetUrl) {
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

  static async handleIncomingWebhook(payload: any, botId?: string) {
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
            await BotService.sendWhatsAppMessage(senderPhone, expiredMsg, phoneNumberId);
            return { processed: true, response: expiredMsg };
          }

          const cleanSender = senderPhone.replace(/[^0-9]/g, '');
          const cleanTarget = sessionToken.senderPhone.replace(/[^0-9]/g, '');

          if (cleanSender !== cleanTarget) {
            const spoofMsg = `❌ Error de Autenticación: El número de WhatsApp (${senderPhone}) no coincide con el número vinculado al token (${sessionToken.senderPhone}).`;
            await BotService.sendWhatsAppMessage(senderPhone, spoofMsg, phoneNumberId);
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
          await BotService.sendWhatsAppMessage(senderPhone, fullResponse, phoneNumberId);
          return { processed: true, response: fullResponse };
        }
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
