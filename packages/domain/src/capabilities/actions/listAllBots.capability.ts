import { prisma } from '@repo/database';
import { CapabilityRegistry } from '../registry';
import { CapabilityContext, CapabilityResult } from '../types';

CapabilityRegistry.register({
  key: 'LIST_ALL_BOTS',
  name: 'Ver Todos los Bots',
  description: 'Muestra el catálogo de bots públicos y demostrativos disponibles',
  parameters: {},
  exampleUsage: 'POST /capabilities/execute con { "capabilityKey": "LIST_ALL_BOTS" }',
  execute: async (_context: CapabilityContext): Promise<CapabilityResult> => {
    const profiles = await prisma.botProfile.findMany({ where: { isActive: true, isPublic: true }, take: 10 });
    const list = profiles.map(p => `• *${p.name}* (ID / Tel: \`${p.botId}\`) - ${p.description || 'Bot activo'}`).join('\n');
    
    return {
      success: true,
      data: profiles,
      message: `🤖 *Bots Disponibles en la Plataforma:*\n\n${list}\n\nEnvía el número o ID del bot que deseas consultar.\n\n0. ↩️ Volver`
    };
  }
});
