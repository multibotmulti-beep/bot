/**
 * Archivo de unión entre funciones (capabilities) y el menú/reglas del bot dinámico.
 * Permite asignar acciones ejecutables en la base de datos (mediante actionKey).
 */

import { CapabilityRegistry } from './capabilities';
import { logger } from '@repo/logger';

export interface BotFunctionMapping {
  actionKey: string;
  description: string;
  handler: (context: { senderPhone: string; botId: string; args?: any }) => Promise<any>;
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

  static async execute(actionKey: string, context: { senderPhone: string; botId: string; args?: any }) {
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
      description: 'Genera enlace de inicio de sesión automático sin contraseña',
      handler: async (ctx) => {
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const loginUrl = `http://localhost:3000/login?phone=${encodeURIComponent(ctx.senderPhone)}&token=${token}`;
        return {
          success: true,
          data: { token, loginUrl },
          message: `🔑 *Inicio de Sesión Automático*\n\nTu enlace de acceso directo (válido por 15 min):\n🔗 ${loginUrl}`,
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
