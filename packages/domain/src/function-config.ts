/**
 * Servicio para gestionar la configuración personalizada de las funciones por cada perfil de bot en la base de datos.
 */

import { prisma } from '@repo/database';
import { logger } from '@repo/logger';

export class BotFunctionConfigService {
  /**
   * Guarda o actualiza la configuración de una función para un bot específico
   */
  static async saveConfig(botId: string, actionKey: string, config: Record<string, any>) {
    try {
      const record = await prisma.botFunctionConfig.upsert({
        where: { botId_actionKey: { botId, actionKey } },
        update: { configJson: JSON.stringify(config), updatedAt: new Date() },
        create: { botId, actionKey, configJson: JSON.stringify(config), isActive: true },
      });
      logger.info({ botId, actionKey }, 'Configuración de función guardada exitosamente');
      return { success: true, record };
    } catch (error: any) {
      logger.error({ error: error.message, botId, actionKey }, 'Error al guardar configuración de función');
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene la configuración de una función para un bot específico
   */
  static async getConfig(botId: string, actionKey: string, localConfig?: Record<string, any>) {
    if (localConfig && Object.keys(localConfig).length > 0) {
      return { success: true, config: localConfig };
    }
    try {
      const record = await prisma.botFunctionConfig.findUnique({
        where: { botId_actionKey: { botId, actionKey } },
      });
      if (!record || !record.isActive) return { success: true, config: null };
      return { success: true, config: JSON.parse(record.configJson || '{}') };
    } catch (error: any) {
      logger.error({ error: error.message, botId, actionKey }, 'Error al obtener configuración de función');
      return { success: false, config: null };
    }
  }

  /**
   * Lista todas las configuraciones de funciones para un bot
   */
  static async listConfigs(botId: string) {
    try {
      const records = await prisma.botFunctionConfig.findMany({
        where: { botId },
      });
      return {
        success: true,
        configs: records.map(r => ({
          ...r,
          config: JSON.parse(r.configJson || '{}'),
        })),
      };
    } catch (error: any) {
      logger.error({ error: error.message, botId }, 'Error al listar configuraciones de funciones');
      return { success: false, configs: [] };
    }
  }
}
