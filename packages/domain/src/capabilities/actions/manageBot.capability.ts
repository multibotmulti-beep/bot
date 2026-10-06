import { prisma } from '@repo/database';
import { CapabilityRegistry } from '../registry';
import { CapabilityContext, CapabilityResult } from '../types';

CapabilityRegistry.register({
  key: 'MANAGE_BOT_CREATE',
  name: 'Crear o Actualizar Bot',
  description: 'Crea o actualiza un perfil de bot y sus menús asociados',
  parameters: {
    name: 'string (Nombre del bot)',
    phoneNumber: 'string (Teléfono/ID del bot)',
    description: 'string (Opcional)',
    welcomeMessage: 'string (Mensaje de bienvenida)',
    options: 'array (Opciones de menú con opcional capabilityKey)'
  },
  exampleUsage: 'POST /capabilities/execute con { "capabilityKey": "MANAGE_BOT_CREATE", "args": { "name": "Mi Bot", "phoneNumber": "54911..." } }',
  execute: async (context: CapabilityContext): Promise<CapabilityResult> => {
    const { name, description, phoneNumber, type = 'custom', welcomeMessage, options } = context.args || {};
    if (!phoneNumber || !name) {
      return { success: false, message: 'Se requiere número de teléfono y nombre para crear el bot.' };
    }

    const cleanPhone = phoneNumber.trim();
    const botId = cleanPhone.replace(/[^0-9+]/g, '');

    const user = await prisma.user.upsert({
      where: { phoneNumber: cleanPhone },
      update: {},
      create: { phoneNumber: cleanPhone, name: `Usuario ${cleanPhone}` },
    });

    const profile = await prisma.botProfile.upsert({
      where: { botId },
      update: {
        name: name.trim(),
        description,
        type,
        isActive: true,
        userId: user.id,
      },
      create: {
        botId,
        phoneNumber: cleanPhone,
        name: name.trim(),
        description,
        type,
        isPublic: true,
        isActive: true,
        userId: user.id,
      },
    });

    if (welcomeMessage || (options && options.length > 0)) {
      await prisma.botFlow.create({
        data: {
          botProfileId: profile.id,
          name: `Menú de ${profile.name}`,
          triggerKeyword: 'menu',
          flowType: 'menu',
          content: JSON.stringify(options || []),
          responseMessage: welcomeMessage || `Bienvenido a ${profile.name}. Selecciona una opción:`,
          isActive: true,
        },
      });
    }

    return {
      success: true,
      data: profile,
      message: `🤖 Bot '${profile.name}' creado/actualizado correctamente (ID: ${profile.botId}).`
    };
  }
});

CapabilityRegistry.register({
  key: 'MANAGE_BOT_DELETE',
  name: 'Eliminar Bot',
  description: 'Elimina un perfil de bot por su ID de base de datos o botId',
  parameters: { id: 'string (ID de BD, opcional)', botId: 'string (botId, opcional)' },
  exampleUsage: 'POST /capabilities/execute con { "capabilityKey": "MANAGE_BOT_DELETE", "args": { "botId": "..." } }',
  execute: async (context: CapabilityContext): Promise<CapabilityResult> => {
    const { id, botId } = context.args || {};
    if (!id && !botId) {
      return { success: false, message: 'Se requiere ID o botId para eliminar el bot.' };
    }

    const query = id ? { id } : { botId };
    const deleted = await prisma.botProfile.delete({ where: query });

    return {
      success: true,
      data: deleted,
      message: `🗑️ Bot '${deleted.name}' eliminado correctamente.`
    };
  }
});
