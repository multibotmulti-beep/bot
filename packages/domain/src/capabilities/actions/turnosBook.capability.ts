import { DomainCapability, CapabilityContext, CapabilityResult } from '../types';
import { CapabilityRegistry } from '../registry';
import { BotFunctionConfigService } from '../../function-config';
import { BotMemoryService } from '../../memory';

export const TurnosBookCapability: DomainCapability = {
  key: 'turnos.book',
  name: 'Reserva de Turnos',
  description: 'Reserva un turno médico, técnico o de servicios, registrándolo en la memoria con control temporal',
  execute: async (context: CapabilityContext): Promise<CapabilityResult> => {
    const botId = context.botId || 'admin';
    const senderPhone = context.senderPhone || '+5491155556666';
    const configRes = await BotFunctionConfigService.getConfig(botId, 'turnos.book');
    const horariosDisponibles = configRes.config?.horarios || '09:00, 11:00, 15:00';
    const title = `Turno Agendado (Horarios: ${horariosDisponibles})`;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await BotMemoryService.record({
      botId,
      senderPhone,
      category: 'turno',
      title,
      payload: { servicio: 'Atención General', horariosConfigurados: horariosDisponibles, fecha: tomorrow.toISOString(), estado: 'reservado' },
      tags: ['turno', 'activo'],
      scheduledAt: tomorrow,
    });

    return {
      success: true,
      message: `📅 *¡Turno Reservado con Éxito (Bot: ${botId})!*\n\nHorarios configurados del negocio: *${horariosDisponibles}*\nTu turno ha quedado agendado para mañana: *${tomorrow.toLocaleDateString()}*.\nTe enviaremos un recordatorio automático. ¡Gracias!`,
      data: { horariosDisponibles, fecha: tomorrow.toISOString() }
    };
  }
};

CapabilityRegistry.register(TurnosBookCapability);
