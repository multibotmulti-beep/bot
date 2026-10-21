import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { AuthService } from '../auth';
import { CreateBotProfileDTO, CreateBotProfileSchema } from './types';

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
        verified: false,
      },
      create: {
        senderPhone: cleanPhone,
        loginToken: token,
        loginTokenExpires: expiresAtDate,
        verified: false,
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

    const session = await prisma.botSession.findFirst({
      where: {
        OR: [
          { senderPhone: phoneNumber },
          { senderPhone: cleanPhone }
        ]
      },
    });

    if (session && session.verified) {
      return { success: true, verified: true, message: 'Autenticación exitosa por WhatsApp' };
    }

    return { success: true, verified: false, message: 'Pendiente de verificación por WhatsApp' };
  }

  static async getBotsForUser(phoneNumber: string, userId?: string) {
    const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
    const suffix = cleanPhone.slice(-8);

    const matchingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { phoneNumber },
          { phoneNumber: cleanPhone },
          ...(cleanPhone.length >= 8 ? [{ phoneNumber: { endsWith: suffix } }] : [])
        ]
      }
    });
    const userIds = matchingUsers.map(u => u.id);
    if (userId && !userIds.includes(userId)) {
      userIds.push(userId);
    }

    return await prisma.botProfile.findMany({
      where: {
        OR: [
          { phoneNumber },
          { phoneNumber: cleanPhone },
          ...(cleanPhone.length >= 8 ? [{ phoneNumber: { endsWith: suffix } }] : []),
          ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : [])
        ]
      }
    });
  }

  static async getProfiles(phoneNumber?: string) {
    logger.info({ phoneNumber }, 'Obteniendo perfiles de bots');
    const isAdmin = AuthService.isAdmin(phoneNumber);
    if (!isAdmin && phoneNumber) {
      const userBots = await this.getBotsForUser(phoneNumber);
      const publicBots = await prisma.botProfile.findMany({
        where: {
          OR: [
            { isPublic: true },
            { isActive: true }
          ]
        },
        include: {
          rules: true,
          flows: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const map = new Map<string, any>();
      for (const b of [...userBots, ...publicBots]) {
        if (b.id !== 'admin' && b.botId !== 'admin' && b.type !== 'system') {
          map.set(b.id || b.botId, b);
        }
      }
      return Array.from(map.values());
    }
    return await prisma.botProfile.findMany({
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

  static async getProfileByPhoneNumber(phoneNumber: string) {
    const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
    const suffix = cleanPhone.slice(-8);
    logger.info({ phoneNumber, cleanPhone }, 'Obteniendo perfil de bot por número de teléfono con estado real');

    const session = await prisma.botSession.findFirst({
      where: {
        OR: [
          { senderPhone: phoneNumber },
          { senderPhone: cleanPhone },
          ...(suffix.length >= 8 ? [{ senderPhone: { endsWith: suffix } }] : [])
        ]
      }
    });

    const profile = await prisma.botProfile.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { phoneNumber: cleanPhone },
          ...(suffix.length >= 8 ? [{ phoneNumber: { endsWith: suffix } }] : []),
          ...(session?.activeBotId ? [{ botId: session.activeBotId }] : [])
        ]
      },
      include: {
        rules: true,
        flows: true,
      }
    });

    return {
      success: !!profile,
      profile: profile || null,
      session: session || null,
      isActive: profile ? profile.isActive : false,
      activeBotId: session?.activeBotId || profile?.botId || null
    };
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

    const botId = validated.botId || validated.phoneNumber.trim().replace(/[^0-9+]/g, '');
    const cleanPhone = validated.phoneNumber.trim();

    // Buscar o crear usuario asociado a este número de teléfono de forma segura
    let user = null;
    if (cleanPhone) {
      try {
        user = await prisma.user.findUnique({ where: { phoneNumber: cleanPhone } });
        if (!user) {
          user = await prisma.user.create({
            data: { phoneNumber: cleanPhone, name: `Usuario ${cleanPhone}` },
          });
        }
      } catch {
        user = await prisma.user.findUnique({ where: { phoneNumber: cleanPhone } }).catch(() => null);
      }
    }

    let profile = await prisma.botProfile.findUnique({ where: { botId } });
    if (!profile) {
      try {
        profile = await prisma.botProfile.create({
          data: {
            botId,
            phoneNumber: cleanPhone,
            name: validated.name.trim(),
            description: validated.description,
            type: validated.type,
            isPublic: validated.isPublic,
            isActive: validated.isActive,
            userId: user?.id,
            invalidOptionMessage: validated.invalidOptionMessage?.trim() || "⚠️ Opción incorrecta. Por favor, elige una de las opciones presentes en el menú o escribe '0' para volver.",
          },
        });
      } catch (err: any) {
        profile = await prisma.botProfile.findUnique({ where: { botId } }) || await prisma.botProfile.findFirst({ where: { phoneNumber: cleanPhone } });
        if (!profile) throw err;
      }
    } else {
      profile = await prisma.botProfile.update({
        where: { botId },
        data: {
          name: validated.name.trim(),
          description: validated.description,
          type: validated.type,
          isPublic: validated.isPublic,
          isActive: validated.isActive,
          ...(user ? { userId: user.id } : {}),
          ...(validated.invalidOptionMessage ? { invalidOptionMessage: validated.invalidOptionMessage.trim() } : {}),
        },
      });
    }

    // Si vienen menuOptions, crear flujo de menú raíz
    if (validated.menuOptions && validated.menuOptions.length > 0) {
      const welcomeMsg = validated.welcomeMessage || '¡Hola! Bienvenido a nuestro asistente.';
      const existingFlow = await prisma.botFlow.findFirst({
        where: { botProfileId: profile.id, triggerKeyword: 'menu' }
      });

      if (!existingFlow) {
        await prisma.botFlow.create({
          data: {
            botProfileId: profile.id,
            name: `Menú Principal ${profile.name}`,
            triggerKeyword: 'menu',
            flowType: 'menu',
            content: JSON.stringify(validated.menuOptions),
            responseMessage: welcomeMsg,
            isActive: true,
          }
        });
      } else {
        await prisma.botFlow.update({
          where: { id: existingFlow.id },
          data: {
            content: JSON.stringify(validated.menuOptions),
            responseMessage: welcomeMsg,
          }
        });
      }
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
        ...(data.invalidOptionMessage !== undefined ? { invalidOptionMessage: data.invalidOptionMessage } : {}),
      },
    });
  }

  static async activateProfile(id: string) {
    logger.info({ profileId: id }, 'Activando perfil de bot exclusivo para el usuario');
    const target = await prisma.botProfile.findUnique({ where: { id } });
    if (!target) {
      throw new Error('Perfil de bot no encontrado');
    }

    const userCriteria: any[] = [];
    if (target.userId) userCriteria.push({ userId: target.userId });
    if (target.phoneNumber) userCriteria.push({ phoneNumber: target.phoneNumber });

    if (userCriteria.length > 0) {
      // Desactivar todos los demás bots de este usuario/cuenta
      await prisma.botProfile.updateMany({
        where: {
          AND: [
            { id: { not: id } },
            { OR: userCriteria }
          ]
        },
        data: { isActive: false, isPublic: false }
      });
    }

    // Activar este bot
    const updated = await prisma.botProfile.update({
      where: { id },
      data: { isActive: true, isPublic: true }
    });

    // Actualizar la sesión activa del usuario en BotSession
    if (target.phoneNumber) {
      let cleanTargetPhone = target.phoneNumber.replace(/[^0-9]/g, '');
      if (cleanTargetPhone.startsWith('549') && cleanTargetPhone.length === 13) {
        cleanTargetPhone = '54' + cleanTargetPhone.slice(3);
      }
      await prisma.botSession.upsert({
        where: { senderPhone: cleanTargetPhone },
        update: { activeBotId: target.botId, verified: true },
        create: { senderPhone: cleanTargetPhone, activeBotId: target.botId, verified: true }
      });

      await prisma.botSession.updateMany({
        where: {
          activeBotId: { not: 'admin' }
        },
        data: { activeBotId: target.botId }
      });
    }

    logger.info({ botId: target.botId, phoneNumber: target.phoneNumber }, 'Bot activado exitosamente y sesión actualizada');
    return updated;
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
              { label: 'Consultar información general', option: '1', actionKey: 'stock.check' },
              { label: 'Hablar con un asesor humano', option: '2', actionKey: 'support.human' },
              { label: 'Horarios y ubicación', option: '3', actionKey: 'faq.query' }
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
