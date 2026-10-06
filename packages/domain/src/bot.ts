import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { CredentialService } from './webhook';
import { ChatService } from './chat';
import { AuthService } from './auth';
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
            { label: '1. 🔑 Iniciar sesión / Mi cuenta', option: '1' },
            { label: '2. 📋 Listar mis bots', option: '2' },
            { label: '3. 🤖 Ver todos los bots', option: '3' },
            { label: '4. 👤 Hablar con un asesor', option: '4' }
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
    logger.info({ payload, botId }, 'Procesando webhook entrante de WhatsApp para perfil de bot');
    try {
      const entry = payload?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const phoneNumberId = value?.metadata?.phone_number_id;

      if (!message || !message.text) {
        logger.info('Webhook ignorado: No es un mensaje de texto válido');
        return { processed: false, reason: 'not_text_message' };
      }

      const senderPhone = message.from;
      const incomingText = message.text.body.trim().toLowerCase();
      let matchedResponse: string | null = null;

      // Registrar mensaje entrante en el sistema de chat en tiempo real
      await ChatService.saveMessage({
        senderPhone,
        botId: botId || 'admin',
        direction: 'incoming',
        message: message.text.body,
      });

      // Detección automática y robusta por defecto de tokens de verificación (Magic Link / OTP / Verificar)
      const cleanIncoming = incomingText.replace(/[^a-z0-9_]/g, '');
      let foundVerificationSession = null;

      if (cleanIncoming.startsWith('verificar') || cleanIncoming.startsWith('verify')) {
        const tokenMatch = cleanIncoming.replace(/^(verificar|verify)[_ -]*/, '').trim();
        if (tokenMatch) {
          foundVerificationSession = await prisma.botSession.findFirst({
            where: { loginToken: tokenMatch },
          });
        }
      }

      if (!foundVerificationSession && /^\d{6}$/.test(incomingText)) {
        foundVerificationSession = await prisma.botSession.findFirst({
          where: { loginToken: incomingText },
        });
      }

      if (foundVerificationSession) {
        const session = foundVerificationSession;
        if (session.loginTokenExpires && session.loginTokenExpires < new Date()) {
          const errReply = '⏳ El código de verificación ha expirado. Por favor solicita uno nuevo desde la web.';
          await this.sendWhatsAppMessage(senderPhone, errReply, phoneNumberId);
          return { processed: true, response: errReply };
        }

        const cleanSender = senderPhone.replace(/[^0-9]/g, '');
        const cleanTarget = session.senderPhone.replace(/[^0-9]/g, '');

        if (cleanSender !== cleanTarget) {
          logger.warn({ senderPhone, targetPhone: session.senderPhone }, 'Intento de suplantación detectado en webhook de WhatsApp');
          const spoofReply = `❌ Error de Autenticación: El número de WhatsApp (${senderPhone}) no coincide con el número vinculado al token.`;
          await this.sendWhatsAppMessage(senderPhone, spoofReply, phoneNumberId);
          return { processed: true, response: spoofReply };
        }

        await prisma.botSession.update({
          where: { senderPhone: session.senderPhone },
          data: { loginToken: null, loginTokenExpires: null },
        });

        await prisma.user.upsert({
          where: { phoneNumber: cleanSender },
          update: {},
          create: { phoneNumber: cleanSender, name: `Usuario ${cleanSender}` },
        });

        logger.info({ phoneNumber: senderPhone }, 'Autenticación por WhatsApp verificada en BD y sesión autorizada');
        const successReply = `✅ ¡Verificación exitosa en WhatsApp! Tu número ${senderPhone} ha sido autenticado correctamente. Ya puedes regresar a la web.`;
        await this.sendWhatsAppMessage(senderPhone, successReply, phoneNumberId);
        return { processed: true, response: successReply };
      }

      // Gestión de sesión persistente por número de teléfono (senderPhone)
      let activeBotId = botId;

      // Si el usuario envía 0, volver, atras, regresar o menu, regresar instantáneamente al Bot Admin maestro ('admin')
      if (incomingText === '0' || incomingText === '0.' || incomingText === 'volver' || incomingText === 'atras' || incomingText === 'regresar' || incomingText === 'menu' || incomingText === 'admin') {
        await prisma.botSession.upsert({
          where: { senderPhone },
          update: { activeBotId: 'admin' },
          create: { senderPhone, activeBotId: 'admin' },
        });
        activeBotId = 'admin';
      } else if (!activeBotId) {
        // Verificar si el usuario mencionó algún botId registrado (ej. "bot98098")
        const allProfiles = await prisma.botProfile.findMany({ where: { isActive: true } });
        let foundProfileId: string | null = null;
        for (const p of allProfiles) {
          if (incomingText === p.botId.toLowerCase() || incomingText.includes(`id ${p.botId.toLowerCase()}`)) {
            foundProfileId = p.botId;
            break;
          }
        }

        if (foundProfileId) {
          await prisma.botSession.upsert({
            where: { senderPhone },
            update: { activeBotId: foundProfileId },
            create: { senderPhone, activeBotId: foundProfileId },
          });
          activeBotId = foundProfileId;
        } else {
          // Consultar sesión activa actual
          const existingSession = await prisma.botSession.findUnique({ where: { senderPhone } });
          activeBotId = existingSession?.activeBotId || 'admin';
        }
      } else {
        // Si vino en la URL, guardar la sesión
        await prisma.botSession.upsert({
          where: { senderPhone },
          update: { activeBotId },
          create: { senderPhone, activeBotId },
        });
      }

      // Cargar sesión actual del usuario para el asistente guiado (Wizard)
      let session = await prisma.botSession.findUnique({ where: { senderPhone } });
      if (!session) {
        session = await prisma.botSession.create({
          data: { senderPhone, activeBotId: activeBotId || 'admin', wizardStep: 0 },
        });
      }

      // Cargar perfil del bot activo
      let profile = await BotProfileService.getProfileByBotId(activeBotId);
      if (!profile) {
        profile = await prisma.botProfile.findFirst({
          where: { isActive: true },
          include: { rules: true, flows: true },
        });
      }

      const botProfileId = profile?.id;
      logger.info({ senderPhone, incomingText, botId: profile?.botId, wizardStep: session.wizardStep }, 'Mensaje recibido para perfil de bot');

      if (botProfileId) {
        // Manejador específico de opciones del Bot Admin Maestro y Asistente Guiado Wizard
        if (profile?.botId === 'admin') {
          // Si el usuario presiona 0 o volver, cancelar el wizard actual y volver al menú principal
          if (incomingText === '0' || incomingText === '0.' || incomingText === 'volver' || incomingText === 'atras' || incomingText === 'regresar') {
            await prisma.botSession.update({
              where: { senderPhone },
              data: { wizardStep: 0, draftName: null, draftStyle: null, draftOptions: null },
            });
            matchedResponse = '¡Bienvenido al Bot Oficial! Por favor selecciona una opción:\n\n' +
              '1. 🔑 Iniciar sesión / Mi cuenta\n' +
              '2. 📋 Listar mis bots\n' +
              '3. 🤖 Ver todos los bots\n' +
              '4. 👤 Hablar con un asesor\n\n' +
              '0. ↩️ Volver';
          } else if (session.wizardStep === 0) {
            if (incomingText === '1' || incomingText === 'iniciar sesion' || incomingText === 'sesion') {
              // 1. Detectar número que lo solicita y asegurar que el usuario existe (crea cuenta nueva si no tiene, o carga perfil guardado si ya existe)
              const _user = await prisma.user.upsert({
                where: { phoneNumber: senderPhone },
                update: {},
                create: { phoneNumber: senderPhone, name: `Usuario ${senderPhone}` },
              });
              logger.info({ userId: _user.id }, 'Usuario registrado o verificado para inicio de sesión');

              // 2. Generar token y link de acceso directo sin contraseña (magic link)
              const token = Math.floor(100000 + Math.random() * 900000).toString();
              BotProfileService['pendingAuthStore'].set(token, { phoneNumber: senderPhone, expiresAt: Date.now() + 15 * 60 * 1000, verified: true });

              const loginUrl = `http://localhost:3000/login?phone=${encodeURIComponent(senderPhone)}&token=${token}`;
              
              matchedResponse = `🔑 *Inicio de Sesión / Registro Automático*\n\n` +
                `Hola, hemos detectado tu número *${senderPhone}*.\n` +
                `• Estado: Cuenta cargada y lista con tus datos guardados.\n\n` +
                `Haz clic en el siguiente enlace para ingresar a tu panel de control sin contraseña:\n\n` +
                `🔗 ${loginUrl}\n\n` +
                `(Este enlace es válido por 15 minutos).`;
            } else if (incomingText === '2' || incomingText.includes('mis bots') || incomingText.includes('listar')) {
              const cleanSender = senderPhone.replace(/[^0-9]/g, '');
              const user = await prisma.user.findFirst({
                where: {
                  OR: [
                    { phoneNumber: senderPhone },
                    { phoneNumber: cleanSender },
                    { phoneNumber: `+${cleanSender}` }
                  ]
                },
                include: { bots: true }
              });

              if (!user || user.bots.length === 0) {
                matchedResponse = `📋 *Listar Mis Bots*\n\nHola, tu número *${senderPhone}* no tiene bots asociados actualmente.\n\nEnvía *1* para iniciar sesión o registrar tu configuración.\n\n0. ↩️ Volver`;
              } else {
                const botList = user.bots.map((b, idx) => `${idx + 1}. *${b.name}* (ID: \`${b.botId}\`) - ${b.isActive ? '🟢 Activo' : '🔴 Inactivo'}`).join('\n');
                matchedResponse = `📋 *Tus Bots Registrados (*${user.name || senderPhone}*):*\n\n${botList}\n\nEnvía el ID de tu bot para interactuar con él.\n\n0. ↩️ Volver`;
              }
            } else if (incomingText === '3' || incomingText === 'ver un bot' || incomingText === 'bot' || incomingText.includes('bots')) {
              const profiles = await prisma.botProfile.findMany({ where: { isActive: true, isPublic: true }, take: 5 });
              const list = profiles.map(p => `• *${p.name}* (ID / Tel: \`${p.botId}\`)`).join('\n');
              matchedResponse = `🤖 *Bots Disponibles en la Plataforma:*\n\n${list}\n\nEnvía el número o ID del bot que deseas consultar.`;
            } else if (incomingText === '4' || incomingText === 'hablar con un admin' || incomingText === 'admin' || incomingText.includes('asesor')) {
              matchedResponse = '👤 *Soporte y Asistencia:* Un asesor humano ha sido notificado y se pondrá en contacto contigo a la brevedad.';
            } else {
              matchedResponse = '¡Bienvenido al Bot Oficial! Por favor selecciona una opción:\n\n' +
                '1. 🔑 Iniciar sesión / Mi cuenta\n' +
                '2. 📋 Listar mis bots\n' +
                '3. 🤖 Ver todos los bots\n' +
                '4. 👤 Hablar con un asesor\n\n' +
                '0. ↩️ Volver';
            }
          } else if (session.wizardStep > 0) {
            // Máquina de estados del Asistente Guiado Iterativo con Sub-menús Infinitos
            if (session.wizardStep === 1) {
              // Paso 1: Recibió el nombre de la empresa
              await prisma.botSession.update({
                where: { senderPhone },
                data: { wizardStep: 2, draftName: incomingText },
              });
              matchedResponse = `🛠️ *Paso 2:* Hola *${incomingText}*. Selecciona el estilo para los números de tu menú:\n\n` +
                '1. Números simples (1, 2, 3...)\n' +
                '2. Números con Emojis numéricos tipo teclado (1️⃣, 2️⃣, 3️⃣...)\n\n' +
                '0. ↩️ Volver';
            } else if (session.wizardStep === 2) {
              // Paso 2: Recibió el estilo del menú, inicializar lista de opciones vacía
              await prisma.botSession.update({
                where: { senderPhone },
                data: { wizardStep: 3, draftStyle: incomingText, draftOptions: JSON.stringify([]) },
              });
              matchedResponse = '🛠️ *Paso 3:* Escribe el nombre de la **primera opción principal** para tu menú (ej. Ropa, Catálogo, Servicios):\n\n' +
                '0. ↩️ Volver';
            } else if (session.wizardStep === 3) {
              // Paso 3: Agregar opción en la ruta actual (draftPath)
              const tree = session.draftOptions ? JSON.parse(session.draftOptions) : [];
              const path = session.draftPath ? JSON.parse(session.draftPath) : [];

              let curr = tree;
              for (const idx of path) {
                if (!curr[idx].subOptions) curr[idx].subOptions = [];
                curr = curr[idx].subOptions;
              }

              const keycapEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
              const optIndex = curr.length;
              const emojiPrefix = session.draftStyle === '2' ? (keycapEmojis[optIndex] || `${optIndex + 1}️⃣`) + ' ' : '';
              
              const newOption = {
                label: `${emojiPrefix}${incomingText.trim()}`,
                option: path.length > 0 ? `${path.map((p: number) => p + 1).join('.')}.${optIndex + 1}` : String(optIndex + 1),
                subOptions: []
              };
              curr.push(newOption);

              await prisma.botSession.update({
                where: { senderPhone },
                data: { wizardStep: 4, draftOptions: JSON.stringify(tree) },
              });

              matchedResponse = `✅ Opción *"${newOption.label}"* agregada con éxito.\n\n` +
                `¿Qué deseas hacer ahora?\n` +
                `1. Agregar sub-menú (sub-opción) dentro de esta opción\n` +
                `2. Agregar otra opción al mismo nivel\n` +
                `3. Finalizar y generar mi bot\n\n` +
                `0. ↩️ Volver`;
            } else if (session.wizardStep === 4) {
              // Paso 4: Decidir si profundiza (1), crea al mismo nivel (2), o finaliza (3)
              const tree = session.draftOptions ? JSON.parse(session.draftOptions) : [];
              const path = session.draftPath ? JSON.parse(session.draftPath) : [];

              if (incomingText === '1') {
                // Profundizar: agregar el índice del último elemento al path
                let curr = tree;
                for (const idx of path) {
                  curr = curr[idx].subOptions;
                }
                const lastIdx = curr.length - 1;
                path.push(lastIdx);

                await prisma.botSession.update({
                  where: { senderPhone },
                  data: { wizardStep: 3, draftPath: JSON.stringify(path) },
                });
                matchedResponse = `🛠️ Escribe el nombre de la **sub-opción** para este sub-menú:\n\n0. ↩️ Volver`;
              } else if (incomingText === '2') {
                // Siguiente opción al mismo nivel (mantener path, ir a paso 3)
                await prisma.botSession.update({
                  where: { senderPhone },
                  data: { wizardStep: 3 },
                });
                matchedResponse = '🛠️ Escribe el nombre de la **siguiente opción** a este nivel:\n\n0. ↩️ Volver';
              } else if (incomingText === '3') {
                // Finalizar y generar recursivamente el árbol de flujos multi-nivel
                const companyName = session.draftName || 'Mi Bot';
                const cleanId = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(100 + Math.random() * 900);

                const newProfile = await prisma.botProfile.create({
                  data: {
                    botId: cleanId,
                    name: companyName,
                    description: `Bot personalizado con menús jerárquicos infinitos para ${companyName}`,
                    type: 'custom',
                    isPublic: true,
                    isActive: true,
                  },
                });

                const createRecursiveFlows = async (profileId: string, parentFlowId: string | null, nodes: any[]) => {
                  for (const node of nodes) {
                    if (node.subOptions && node.subOptions.length > 0) {
                      const flow = await prisma.botFlow.create({
                        data: {
                          botProfile: { connect: { id: profileId } },
                          parent: parentFlowId ? { connect: { id: parentFlowId } } : undefined,
                          name: `Submenú de ${node.label}`,
                          triggerKeyword: node.option,
                          flowType: 'menu',
                          content: JSON.stringify(node.subOptions.map((n: any) => ({ label: n.label, option: n.option }))),
                          responseMessage: `Sub-opciones para *${node.label}*:`,
                          isActive: true,
                        },
                      });
                      await createRecursiveFlows(profileId, flow.id, node.subOptions);
                    }
                  }
                };

                const rootFlow = await prisma.botFlow.create({
                  data: {
                    botProfile: { connect: { id: newProfile.id } },
                    name: `Menú Principal de ${companyName}`,
                    triggerKeyword: 'menu',
                    flowType: 'menu',
                    content: JSON.stringify(tree.map((n: any) => ({ label: n.label, option: n.option }))),
                    responseMessage: `¡Hola! Bienvenido a ${companyName}. Selecciona una opción:`,
                    isActive: true,
                  },
                });

                for (const node of tree) {
                  if (node.subOptions && node.subOptions.length > 0) {
                    await createRecursiveFlows(newProfile.id, rootFlow.id, node.subOptions);
                  }
                }

                await prisma.botSession.update({
                  where: { senderPhone },
                  data: { activeBotId: cleanId, wizardStep: 0, draftName: null, draftStyle: null, draftOptions: null, draftPath: null },
                });

                matchedResponse = `🎉 *¡BOT JERÁRQUICO DE MENÚS INFINITOS CREADO Y ACTIVADO!*\n\n` +
                  `🤖 *Empresa:* ${companyName}\n` +
                  `🔑 *ID Único:* \`${cleanId}\`\n\n` +
                  `Tu bot cuenta con menús y sub-menús anidados ilimitados. Envía un mensaje para probarlo o compártelo con tus amigos.\n\n` +
                  `0. ↩️ Volver al Menú Principal Admin`;
              } else {
                matchedResponse = `⚠️ Opción inválida. Responde:\n1. Agregar sub-menú\n2. Agregar otra opción al mismo nivel\n3. Finalizar y generar mi bot\n\n0. ↩️ Volver`;
              }
            }
          } else {
            // Menú principal del Bot Admin
            if (incomingText === '3' || incomingText === 'menu secreto' || incomingText === 'secreto') {
              matchedResponse = 'ADMIN_SECRET_PROFILES_LIST';
            } else if (incomingText === '1') {
              matchedResponse = '🤖 *BOTS DEMO PRE-CARGADOS DISPONIBLES:*\n\n' +
                '1. *Soporte Técnico:* ID `demo-soporte` (Atención y FAQs)\n' +
                '2. *Ventas y E-commerce:* ID `demo-ventas` (Catálogo y pedidos)\n' +
                '3. *Citas y Turnos:* ID `demo-citas` (Reservas)\n\n' +
                'Para probar cualquiera, envía su ID o el número correspondiente (ej. 1).\n\n' +
                '0. ↩️ Volver';
            } else if (incomingText === '2') {
              // Iniciar Wizard Paso 1
              await prisma.botSession.update({
                where: { senderPhone },
                data: { wizardStep: 1 },
              });
              matchedResponse = '✨ *ASISTENTE DE CREACIÓN DE BOTS JERÁRQUICOS*\n\n' +
                'Paso 1: ¿Cómo se llama tu empresa o negocio?\n\n' +
                '0. ↩️ Volver';
            } else if (incomingText.match(/^[0-9]+$/)) {
              // Selección numérica directa desde el menú principal del Bot Admin para interactuar con demos o perfiles listados
              const allProfiles = await prisma.botProfile.findMany({ orderBy: { createdAt: 'desc' } });
              const optNum = parseInt(incomingText, 10);
              if (optNum >= 1 && optNum <= allProfiles.length) {
                const selected = allProfiles[optNum - 1];
                await prisma.botSession.update({
                  where: { senderPhone },
                  data: { activeBotId: selected.botId },
                });
                matchedResponse = `✅ *¡Conectado al bot ${selected.name}!* (ID: \`${selected.botId}\`)\n\nEnvía cualquier mensaje o "menu" para comenzar.\n\n0. ↩️ Volver al Menú Principal`;
              } else {
                matchedResponse = '¡Bienvenido al Bot Admin Central! Elige una opción:\n\n' +
                  '1. Ver Demos Disponibles\n' +
                  '2. Crear mi Bot Personalizado\n' +
                  '3. Menú Secreto (Admin & IDs)\n\n' +
                  '0. ↩️ Volver';
              }
            } else if (incomingText === '0' || incomingText === 'volver' || incomingText === 'atras' || incomingText === 'regresar' || incomingText === 'menu' || incomingText === 'admin') {
              matchedResponse = '¡Bienvenido al Bot Admin Central! Elige una opción:\n\n' +
                '1. Ver Demos Disponibles\n' +
                '2. Crear mi Bot Personalizado\n' +
                '3. Menú Secreto (Admin & IDs)\n\n' +
                '0. ↩️ Volver';
            }
          }
        }

        if (!matchedResponse) {
          // 1. Obtener flujos del perfil (raíz o hijos del nivel actual)
          const currentParentId = session.currentParentFlowId || null;
          const rootFlow = await prisma.botFlow.findFirst({ where: { botProfileId, isActive: true, parentId: null } });
          const flows = await prisma.botFlow.findMany({ 
            where: { 
              botProfileId, 
              isActive: true, 
              parentId: currentParentId 
            } 
          });

          // Si el usuario envía '0', volver un nivel o regresar al admin
          if (incomingText === '0' || incomingText === '0.' || incomingText === 'volver' || incomingText === 'atras' || incomingText === 'regresar') {
            if (session.currentParentFlowId) {
              // Subir al flujo raíz o padre
              const parentFlow = await prisma.botFlow.findUnique({ where: { id: session.currentParentFlowId } });
              await prisma.botSession.update({
                where: { senderPhone },
                data: { currentParentFlowId: parentFlow?.parentId || null },
              });
              if (rootFlow) {
                let formattedMenu = rootFlow.responseMessage + '\n\n';
                const parsedContent = JSON.parse(rootFlow.content);
                parsedContent.forEach((item: any, index: number) => {
                  formattedMenu += `${index + 1}. ${item.label || item.option}\n`;
                });
                matchedResponse = formattedMenu.trim() + '\n\n0. ↩️ Volver';
              }
            } else {
              await prisma.botSession.update({
                where: { senderPhone },
                data: { activeBotId: 'admin' },
              });
              matchedResponse = '¡Bienvenido al Bot Admin Central! Elige una opción:\n\n' +
                '1. Ver Demos Disponibles\n' +
                '2. Crear mi Bot Personalizado\n' +
                '3. Menú Secreto (Admin & IDs)\n\n' +
                '0. ↩️ Volver';
            }
          } else {
            let matchedFlow: any = null;

            // Búsqueda jerárquica recursiva basada en el nivel actual (currentParentId)
            if (incomingText.match(/^[0-9]+$/)) {
              // 1. Buscar flujo hijo directo cuyo parentId sea currentParentId y triggerKeyword coincida con incomingText
              let childFlow = await prisma.botFlow.findFirst({
                where: { botProfileId, parentId: currentParentId, triggerKeyword: incomingText }
              });

              // 2. Si no se encontró por triggerKeyword exacto, buscar por índice numérico en el contenido del flujo padre actual
              if (!childFlow && flows.length > 0) {
                const optNum = parseInt(incomingText, 10) - 1;
                try {
                  // Si estamos en la raíz (currentParentId === null), usar rootFlow
                  // Si estamos en un submenú, usar el flujo correspondiente a currentParentId
                  const targetParentFlow = currentParentId 
                    ? await prisma.botFlow.findUnique({ where: { id: currentParentId } })
                    : rootFlow;

                  if (targetParentFlow) {
                    const parsed = JSON.parse(targetParentFlow.content);
                    if (Array.isArray(parsed) && parsed[optNum]) {
                      const selectedOpt = parsed[optNum];
                      childFlow = await prisma.botFlow.findFirst({
                        where: { botProfileId, parentId: targetParentFlow.id, triggerKeyword: selectedOpt.option }
                      }) || await prisma.botFlow.findFirst({
                        where: { botProfileId, parentId: targetParentFlow.id }
                      });
                    }
                  }
                } catch {
                  // Ignorar error de parseo JSON
                }
              }

              if (childFlow) {
                matchedFlow = childFlow;
                await prisma.botSession.update({
                  where: { senderPhone },
                  data: { currentParentFlowId: childFlow.id },
                });
              } else {
                matchedResponse = `Has seleccionado la opción *${incomingText}*.\n\nNo hay más submenús en este nivel. ¿En qué más podemos ayudarte?\n\n0. ↩️ Volver`;
              }
            }

            if (!matchedFlow && flows.length > 0 && !matchedResponse) {
              matchedFlow = flows[0];
            }

            if (matchedFlow && !matchedResponse) {
              if (matchedFlow.flowType === 'menu') {
                let formattedMenu = matchedFlow.responseMessage + '\n\n';
                try {
                  const parsedContent = JSON.parse(matchedFlow.content);
                  if (Array.isArray(parsedContent)) {
                    parsedContent.forEach((item: any, index: number) => {
                      formattedMenu += `${index + 1}. ${item.label || item.option}\n`;
                    });
                  } else {
                    formattedMenu += matchedFlow.content;
                  }
                } catch {
                  formattedMenu += matchedFlow.content;
                }
                matchedResponse = formattedMenu.trim() + '\n\n0. ↩️ Volver';
              } else {
                matchedResponse = matchedFlow.responseMessage + '\n\n' + matchedFlow.content + '\n\n0. ↩️ Volver';
              }
            } else if (!matchedResponse) {
              const rules = await prisma.botRule.findMany({ where: { botProfileId, isActive: true } });
              let matchedRule = rules.find(r => r.matchType === 'exact' && r.keyword.toLowerCase() === incomingText);
              if (!matchedRule) {
                matchedRule = rules.find(r => r.matchType === 'default' || r.keyword.toLowerCase() === 'default');
              }
              if (matchedRule) {
                matchedResponse = matchedRule.responseMessage + '\n\n0. ↩️ Volver';
              }
            }
          }
        }
      }
      // Si aún no hay respuesta asignada
      if (!matchedResponse) {
        matchedResponse = profile 
          ? `¡Hola! Estás conectado al bot perfil [${profile.botId.toUpperCase()}] - ${profile.name}. ${profile.description || 'Sistema de bot activo.'}\n\n0. ↩️ Volver al Menú Principal`
          : 'Hola, gracias por comunicarte. En breve un asesor te atenderá.\n\n0. ↩️ Volver al Menú Principal';
      }

      // Si la respuesta es el marcador de menú secreto, listar dinámicamente todos los perfiles de bots
      if (matchedResponse === 'ADMIN_SECRET_PROFILES_LIST') {
        const allProfiles = await prisma.botProfile.findMany({ orderBy: { createdAt: 'desc' } });
        let listText = '🔐 *MENÚ SECRETO - PANEL ADMIN*\nListado de perfiles activos:\n\n';
        allProfiles.forEach((p, idx) => {
          listText += `${idx + 1}. *ID:* \`${p.botId}\` - ${p.name} (${p.type})\n`;
        });
        listText += '\nEnvía el ID de cualquier bot para conectarte a él.\n\n0. ↩️ Volver al Menú Principal';
        matchedResponse = listText;
      }

      const credential = await CredentialService.getCredential('whatsapp');
      if (!credential) {
        logger.error('No se encontraron credenciales de WhatsApp');
        return { processed: false, reason: 'missing_credentials' };
      }

      const accessToken = credential.apiKey;
      let targetPhoneId = phoneNumberId;
      if (!targetPhoneId && credential.targetUrl) {
        const match = credential.targetUrl.match(/\/v[\d.]+\/(\d+)\/messages/);
        if (match) targetPhoneId = match[1];
      }
      if (!targetPhoneId) targetPhoneId = '880275461842101';

      const graphApiUrl = `https://graph.facebook.com/v17.0/${targetPhoneId}/messages`;

      if (matchedResponse) {
        await ChatService.saveMessage({
          senderPhone,
          botId: profile?.botId || 'admin',
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

      return { processed: true, senderPhone, incomingText, matchedResponse, botId: profile?.botId };
    } catch (error: any) {
      logger.error({ err: error.message }, 'Error procesando webhook de bot profile');
      return { processed: false, error: error.message };
    }
  }
}
