import { logger } from '@repo/logger';
import { DomainCapability, CapabilityContext, CapabilityResult } from './types';

export class CapabilityRegistry {
  private static capabilities = new Map<string, DomainCapability>();

  static register(capability: DomainCapability) {
    this.capabilities.set(capability.key, capability);
    logger.info({ capabilityKey: capability.key }, 'Capacidad de dominio registrada exitosamente');
  }

  static get(key: string): DomainCapability | undefined {
    return this.capabilities.get(key);
  }

  static getAll() {
    return Array.from(this.capabilities.values()).map(c => ({
      key: c.key,
      name: c.name,
      description: c.description,
      parameters: c.parameters || {},
      exampleUsage: c.exampleUsage || `POST /capabilities/execute con { "capabilityKey": "${c.key}" }`,
    }));
  }

  static async execute(key: string, context: CapabilityContext): Promise<CapabilityResult> {
    const cap = this.get(key);
    if (!cap) {
      logger.warn({ key }, 'Intento de ejecutar capacidad no registrada');
      return { success: false, message: `Capacidad de dominio '${key}' no encontrada.` };
    }
    try {
      logger.info({ key, context }, 'Ejecutando capacidad de dominio');
      return await cap.execute(context);
    } catch (error: any) {
      logger.error({ key, error: error.message }, 'Error al ejecutar capacidad de dominio');
      return { success: false, message: `Error ejecutando la acción ${key}: ${error.message}` };
    }
  }
}
