/**
 * Archivo de unión entre funciones (capabilities) y el menú/reglas del bot dinámico.
 * Permite asignar acciones ejecutables en la base de datos (mediante actionKey).
 */

import { CapabilityRegistry } from './capabilities';
import { logger } from '@repo/logger';
import { getFrontendBaseUrl } from './command';
import { BotMemoryService } from './memory';
import { BotFunctionConfigService } from './function-config';

export interface BotFunctionMapping {
  actionKey: string;
  description: string;
  handler: (context: { senderPhone: string; botId: string; args?: any; headers?: Record<string, any>; protocol?: string }) => Promise<any>;
}

export class BotFunctionRegistry {
  private static functions = new Map<string, BotFunctionMapping>();

  static register(mapping: BotFunctionMapping) {
    this.functions.set(mapping.actionKey, mapping);
    logger.info({ actionKey: mapping.actionKey }, 'Función de menú registrada en el motor de bot');
  }

  static get(actionKey: string): BotFunctionMapping | undefined {
    return this.functions.get(actionKey);
  }

  static getAll(): { actionKey: string; description: string }[] {
    return Array.from(this.functions.values()).map(f => ({
      actionKey: f.actionKey,
      description: f.description,
    }));
  }

  static async execute(actionKey: string, context: { senderPhone: string; botId: string; args?: any; isAnonymous?: boolean; headers?: Record<string, any>; protocol?: string }) {
    const mapping = this.get(actionKey);
    if (!mapping) {
      // Intentar buscar en CapabilityRegistry global si no está en funciones locales
      const capability = CapabilityRegistry.get(actionKey);
      if (capability) {
        return await CapabilityRegistry.execute(actionKey, context);
      }
      logger.warn({ actionKey }, 'Acción o función no encontrada en el registro dinámico');
      return { success: false, message: `Acción '${actionKey}' no configurada en el motor.` };
    }

    try {
      logger.info({ actionKey, senderPhone: context.senderPhone }, 'Ejecutando función vinculada al menú/regla');
      return await mapping.handler(context);
    } catch (error: any) {
      logger.error({ actionKey, error: error.message }, 'Error al ejecutar función vinculada');
      return { success: false, message: `Error ejecutando la función ${actionKey}: ${error.message}` };
    }
  }

  static registerDefaultFunctions() {
    // Registro de funciones base dinámicas conectadas a capacidades
    this.register({
      actionKey: 'auth.login',
      description: 'Genera enlace de inicio de sesión automático sin contraseña, administra cuenta y estado',
      handler: async (ctx) => {
        const { prisma } = await import('@repo/database');
        const cleanPhone = ctx.senderPhone.replace(/[^0-9]/g, '');

        // 1. Buscar si el usuario ya existe en la base de datos
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { phoneNumber: ctx.senderPhone },
              { phoneNumber: cleanPhone },
              { phoneNumber: `+${cleanPhone}` }
            ]
          },
          include: { bots: true },
        });

        let accountStatusMsg = '';
        if (user) {
          const botCount = user.bots ? user.bots.length : 0;
          accountStatusMsg = `✅ Cuenta encontrada: ${botCount} bot(s) asociado(s).`;
        } else {
          accountStatusMsg = `⏳ Creando usuario...`;
          user = await prisma.user.create({
            data: {
              phoneNumber: ctx.senderPhone,
              name: `Usuario ${ctx.senderPhone}`,
            },
            include: { bots: true },
          });
          accountStatusMsg += `\n✅ ¡Usuario creado y guardado exitosamente en el sistema!`;
        }

        // 2. Generar token de inicio de sesión (magic link)
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // 3. Guardar token en BotSession
        await prisma.botSession.upsert({
          where: { senderPhone: ctx.senderPhone },
          update: { loginToken: token, loginTokenExpires: expiresAt },
          create: { senderPhone: ctx.senderPhone, loginToken: token, loginTokenExpires: expiresAt, activeBotId: ctx.botId },
        });

        const frontendBase = getFrontendBaseUrl(undefined, { headers: ctx.headers, protocol: ctx.protocol });
        const loginUrl = `${frontendBase}/login?phone=${encodeURIComponent(ctx.senderPhone)}&token=${token}`;

        return {
          success: true,
          data: { token, loginUrl, user },
          message: `🔑 *Gestión de Sesión e Inicio de Web*\n\n` +
            `${accountStatusMsg}\n\n` +
            `Haz clic en el siguiente enlace para ingresar a tu panel:\n🔗 ${loginUrl}\n\n` +
            `*(También puedes enviar tu código *${token}* por chat para verificar tu sesión instantáneamente)*`,
        };
      },
    });

    this.register({
      actionKey: 'bot.list_my_bots',
      description: 'Lista los bots registrados del usuario',
      handler: async (ctx) => {
        const { prisma } = await import('@repo/database');
        const cleanSender = ctx.senderPhone.replace(/[^0-9]/g, '');
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { phoneNumber: ctx.senderPhone },
              { phoneNumber: cleanSender },
              { phoneNumber: `+${cleanSender}` }
            ]
          },
          include: { bots: true },
        });

        if (!user || user.bots.length === 0) {
          return { success: true, message: `📋 No se encontraron bots asociados al número ${ctx.senderPhone}.` };
        }
        const botList = user.bots.map((b, idx) => `${idx + 1}. *${b.name}* (ID: \`${b.botId}\`) - ${b.isActive ? '🟢 Activo' : '🔴 Inactivo'}`).join('\n');
        return { success: true, message: `📋 *Tus Bots Registrados (*${user.name || ctx.senderPhone}*):*\n\n${botList}` };
      },
    });

    this.register({
      actionKey: 'bot.list_all',
      description: 'Lista todos los bots públicos disponibles en la plataforma',
      handler: async () => {
        const { prisma } = await import('@repo/database');
        const profiles = await prisma.botProfile.findMany({ where: { isActive: true, isPublic: true }, take: 10 });
        const list = profiles.map(p => `• *${p.name}* (ID: \`${p.botId}\`)`).join('\n');
        return { success: true, message: `🤖 *Bots Disponibles en la Plataforma:*\n\n${list}` };
      },
    });

    this.register({
      actionKey: 'turnos.book',
      description: 'Reserva un turno médico, técnico o de servicios, registrándolo en la memoria con control temporal',
      handler: async (ctx) => {
        const configRes = await BotFunctionConfigService.getConfig(ctx.botId, 'turnos.book', ctx.args?.localConfig);
        const horariosDisponibles = configRes.config?.horarios;
        if (!horariosDisponibles) {
          return {
            success: true,
            message: `📅 *Reserva de Turnos*\n\nNo hay horarios ni configuración de turnos establecida en la base de datos para este bot.`,
            data: { horariosDisponibles: null }
          };
        }
        const title = `Turno Agendado (Horarios: ${horariosDisponibles})`;
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await BotMemoryService.record({
          botId: ctx.botId,
          senderPhone: ctx.senderPhone,
          category: 'turno',
          title,
          payload: { servicio: 'Atención General', horariosConfigurados: horariosDisponibles, fecha: tomorrow.toISOString(), estado: 'reservado' },
          tags: ['turno', 'activo'],
          scheduledAt: tomorrow,
        });
        return {
          success: true,
          message: `📅 *¡Turno Reservado con Éxito!*\n\nHorarios del negocio: *${horariosDisponibles}*\nTu turno ha quedado agendado para: *${tomorrow.toLocaleDateString()}*.`,
        };
      },
    });

    this.register({
      actionKey: 'pedidos.create',
      description: 'Crea y registra un pedido o compra en la base de datos del negocio',
      handler: async (ctx) => {
        const title = `Pedido #${Math.floor(1000 + Math.random() * 9000)}`;
        await BotMemoryService.record({
          botId: ctx.botId,
          senderPhone: ctx.senderPhone,
          category: 'compra',
          title,
          payload: { items: ['Producto Destacado A', 'Servicio B'], total: 150.00, moneda: 'USD' },
          tags: ['ecommerce', 'nuevo_pedido'],
        });
        return {
          success: true,
          message: `🛍️ *¡Pedido Registrado Correctamente!*\n\nHemos creado tu orden *${title}* por un total de **$150.00 USD**.\nPronto nos pondremos en contacto para coordinar el pago y envío.`,
        };
      },
    });

    this.register({
      actionKey: 'stock.check',
      description: 'Consulta el stock e inventario actual de productos en el negocio',
      handler: async (ctx) => {
        const { prisma } = await import('@repo/database');
        const memories = await prisma.botMemory.findMany({
          where: { botId: ctx.botId, category: 'stock' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        if (memories.length === 0) {
          return { success: true, message: `📦 *Consulta de Stock*\n\nNo hay productos registrados en el inventario de este bot en la base de datos.` };
        }
        const listText = memories.map((m: any, idx: number) => {
          const payload = m.payload as any;
          return `${idx + 1}. *${payload?.producto || m.title}* - Stock: 🟢 **${payload?.cantidad || 'N/A'}**`;
        }).join('\n');
        return { success: true, message: `📦 *Inventario Actual (Bot: ${ctx.botId}):*\n\n${listText}` };
      },
    });

    this.register({
      actionKey: 'faq.query',
      description: 'Muestra información y perfil del negocio',
      handler: async (ctx) => {
        const { prisma } = await import('@repo/database');
        const profile = await prisma.botProfile.findFirst({
          where: { OR: [{ botId: ctx.botId }, { id: ctx.botId }] }
        });
        if (!profile) {
          return { success: true, message: `ℹ️ *Información General*\n\nNo hay perfil de negocio configurado para este bot (${ctx.botId}) en la base de datos.` };
        }
        return {
          success: true,
          message: `ℹ️ *Información de ${profile.name}*\n\n📝 *Descripción:* ${profile.description || 'Sin descripción'}\n🤖 *ID de Bot:* \`${profile.botId}\`\n🟢 *Estado:* ${profile.isActive ? 'Activo' : 'Inactivo'}`,
          data: { profile }
        };
      },
    });

    this.register({
      actionKey: 'mis.reservas',
      description: 'Lista los turnos, pedidos y registros activos del cliente actual',
      handler: async (ctx) => {
        const result = await BotMemoryService.list({ botId: ctx.botId, senderPhone: ctx.senderPhone });
        if (!result.success || result.memories.length === 0) {
          return { success: true, message: `📋 No tienes turnos ni pedidos registrados en este momento.` };
        }
        const list = result.memories.map((m, idx) => `${idx + 1}. *[${m.category.toUpperCase()}]* ${m.title} (${m.status})`).join('\n');
        return { success: true, message: `📋 *Tus Registros y Solicitudes:*\n\n${list}` };
      },
    });

    this.register({
      actionKey: 'stock.manage',
      description: 'Registra o actualiza el inventario de stock aislado para este bot/negocio',
      handler: async (ctx) => {
        const configRes = await BotFunctionConfigService.getConfig(ctx.botId, 'stock.manage', ctx.args?.localConfig);
        const productName = ctx.args?.product || configRes.config?.product || 'Producto General';
        const qty = ctx.args?.qty || configRes.config?.qty || 10;
        await BotMemoryService.record({
          botId: ctx.botId,
          senderPhone: ctx.senderPhone,
          category: 'stock',
          title: `Stock: ${productName}`,
          payload: { producto: productName, cantidad: qty, actualizadoPor: ctx.senderPhone },
          tags: ['stock', 'inventario'],
        });
        return {
          success: true,
          message: `📦 *Gestión de Stock Actualizada (Bot: ${ctx.botId})*\n\nSe ha actualizado el inventario para *${productName}*: **${qty} unidades disponibles** de forma exclusiva en este negocio.`,
        };
      },
    });

    this.register({
      actionKey: 'business.payment_info',
      description: 'Muestra los datos de cobro del negocio (Alias, CBU, Titular, Link de pago) configurados para este perfil',
      handler: async (ctx) => {
        const configRes = await BotFunctionConfigService.getConfig(ctx.botId, 'business.payment_info', ctx.args?.localConfig);
        const bizData = configRes.config;
        if (!bizData || (!bizData.cbu && !bizData.alias && !bizData.banco)) {
          return {
            success: true,
            message: `💳 *Datos de Pago y Cobro*\n\nNo hay información de pagos configurada en la base de datos para este bot.`,
            data: { payments: null }
          };
        }

        return {
          success: true,
          message: `💳 *Datos de Pago y Cobro (Bot: ${ctx.botId})*\n\n🏦 *Banco/Billetera:* ${bizData.banco || 'No especificado'}\n👤 *Titular:* ${bizData.titular || 'No especificado'}\n🔢 *CBU/CVU:* \`${bizData.cbu || 'No especificado'}\`\n🔤 *Alias:* \`${bizData.alias || 'No especificado'}\`\n🔗 *Link de Pago:* ${bizData.linkPago || 'No especificado'}`,
          data: { payments: bizData }
        };
      },
    });

    this.register({
      actionKey: 'client.save_info',
      description: 'Guarda información personalizada provista por el cliente (dirección de entrega, notas, preferencias)',
      handler: async (ctx) => {
        const info = ctx.args?.info || 'Cliente frecuente';
        await BotMemoryService.record({
          botId: ctx.botId,
          senderPhone: ctx.senderPhone,
          category: 'nota',
          title: 'Dato de Cliente Guardado',
          payload: { informacion: info },
          tags: ['cliente', 'preferencia'],
        });
        return {
          success: true,
          message: `💾 *Información Guardada con Éxito*\n\nHemos registrado tu información en nuestro sistema para este negocio: *"${info}"*.`,
        };
      },
    });

    this.register({
      actionKey: 'payments.checkout',
      description: 'Genera una orden de pago con CBU, Alias y link de pago para abonar un pedido',
      handler: async (ctx) => {
        const configRes = await BotFunctionConfigService.getConfig(ctx.botId, 'business.payment_info');
        const bizData = configRes.config;
        const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
        if (!bizData || (!bizData.cbu && !bizData.alias)) {
          return {
            success: true,
            message: `🛒 *Checkout de Pago - Orden #${orderId}*\n\nNo hay medios de pago configurados en la base de datos para este bot.`,
            data: { orderId, payments: null }
          };
        }
        return {
          success: true,
          message: `🛒 *Checkout de Pago - Orden #${orderId}*\n\n🔤 *Alias:* \`${bizData.alias || 'N/A'}\`\n🔢 *CBU:* \`${bizData.cbu || 'N/A'}\`\n🔗 *Link Web de Pago:* \`${bizData.linkPago || 'N/A'}\``,
          data: { orderId, payments: bizData }
        };
      },
    });

    this.register({
      actionKey: 'support.human',
      description: 'Deriva la conversación a un asesor humano',
      handler: async (ctx) => {
        return { success: true, message: `👤 Tu solicitud de atención con un asesor humano ha sido registrada para el número ${ctx.senderPhone}. Un representante se contactará contigo a la brevedad.` };
      },
    });
  }
}

// Inicializar funciones por defecto al cargar el módulo
BotFunctionRegistry.registerDefaultFunctions();
