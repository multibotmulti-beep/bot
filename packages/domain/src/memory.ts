/**
 * Servicio global de memoria y metadatos estructurados para funciones (turnos, compras, alarmas, etc.)
 */

import { prisma } from '@repo/database';
import { logger } from '@repo/logger';

export interface RecordMemoryParams {
  botId: string;
  senderPhone: string;
  category: 'turno' | 'compra' | 'alarma' | 'nota' | 'stock' | 'business_profile' | 'custom';
  title: string;
  payload: Record<string, any>;
  tags?: string[];
  scheduledAt?: Date | string;
  status?: 'active' | 'pending' | 'completed' | 'cancelled';
}

export class BotMemoryService {
  /**
   * Registra un evento, turno, compra o alarma en el espacio de memoria estructurada JSON
   */
  static async record(params: RecordMemoryParams) {
    try {
      const memory = await prisma.botMemory.create({
        data: {
          botId: params.botId,
          senderPhone: params.senderPhone,
          category: params.category,
          title: params.title,
          payload: JSON.stringify(params.payload),
          tags: params.tags ? params.tags.join(',') : '',
          scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : null,
          status: params.status || 'active',
        },
      });

      logger.info({ memoryId: memory.id, botId: params.botId, category: params.category }, 'Memoria estructurada registrada exitosamente');
      return { success: true, memory };
    } catch (error: any) {
      logger.error({ error: error.message, params }, 'Error al registrar memoria estructurada');
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista memorias filtradas por bot, remitente, categoría o etiqueta
   */
  static async list(filters: { botId?: string; senderPhone?: string; category?: string; tag?: string; status?: string }) {
    try {
      const where: any = {};
      if (filters.botId) where.botId = filters.botId;
      if (filters.senderPhone) where.senderPhone = filters.senderPhone;
      if (filters.category) where.category = filters.category;
      if (filters.status) where.status = filters.status;
      if (filters.tag) {
        where.tags = { contains: filters.tag };
      }

      const memories = await prisma.botMemory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      // Parse payload back to JSON object
      const parsed = memories.map(m => ({
        ...m,
        payload: JSON.parse(m.payload || '{}'),
        tagsArray: m.tags ? m.tags.split(',').map(t => t.trim()) : [],
      }));

      return { success: true, memories: parsed };
    } catch (error: any) {
      logger.error({ error: error.message, filters }, 'Error al listar memorias estructuradas');
      return { success: false, error: error.message, memories: [] };
    }
  }

  /**
   * Actualiza el estado de un registro (ej. completar un turno o marcar alarma como atendida)
   */
  static async updateStatus(id: string, status: 'active' | 'pending' | 'completed' | 'cancelled') {
    try {
      const updated = await prisma.botMemory.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      });
      logger.info({ memoryId: id, status }, 'Estado de memoria actualizado');
      return { success: true, updated };
    } catch (error: any) {
      logger.error({ error: error.message, id, status }, 'Error al actualizar estado de memoria');
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene alarmas o turnos pendientes basados en el tiempo programado
   */
  static async getPendingAlarms() {
    try {
      const now = new Date();
      const memories = await prisma.botMemory.findMany({
        where: {
          scheduledAt: { lte: now },
          status: { in: ['active', 'pending'] },
        },
      });

      return {
        success: true,
        alarms: memories.map(m => ({
          ...m,
          payload: JSON.parse(m.payload || '{}'),
        })),
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error al obtener alarmas pendientes');
      return { success: false, alarms: [] };
    }
  }
}
