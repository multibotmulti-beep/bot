import { prisma } from '@repo/database';
import { CapabilityRegistry } from '../registry';
import { CapabilityContext, CapabilityResult } from '../types';

CapabilityRegistry.register({
  key: 'LIST_MY_BOTS',
  name: 'Listar Mis Bots',
  description: 'Lista los bots propiedad del usuario autenticado o número remitente',
  parameters: { senderPhone: 'string (Teléfono de WhatsApp del usuario)' },
  exampleUsage: 'POST /capabilities/execute con { "capabilityKey": "LIST_MY_BOTS", "senderPhone": "+54911..." }',
  execute: async (context: CapabilityContext): Promise<CapabilityResult> => {
    const phoneNumber = context.senderPhone || context.args?.phoneNumber;
    if (!phoneNumber) {
      return { success: false, message: 'Número de teléfono requerido para listar los bots.' };
    }

    const cleanSender = phoneNumber.replace(/[^0-9]/g, '');
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { phoneNumber: cleanSender },
          { phoneNumber: `+${cleanSender}` }
        ]
      },
      include: { bots: true }
    });

    if (!user || user.bots.length === 0) {
      return {
        success: true,
        data: [],
        message: `📋 *Listar Mis Bots*\n\nTu número *${phoneNumber}* no tiene bots asociados actualmente.\n\nEnvía *1* para iniciar sesión o registrar tu configuración.\n\n0. ↩️ Volver`
      };
    }

    const botList = user.bots.map((b, idx) => `${idx + 1}. *${b.name}* (ID: \`${b.botId}\`) - ${b.isActive ? '🟢 Activo' : '🔴 Inactivo'}`).join('\n');
    return {
      success: true,
      data: user.bots,
      message: `📋 *Tus Bots Registrados (*${user.name || phoneNumber}*):*\n\n${botList}\n\nEnvía el ID de tu bot para interactuar con él.\n\n0. ↩️ Volver`
    };
  }
});
