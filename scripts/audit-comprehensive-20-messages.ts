import { prisma } from '@repo/database';
import { BotService, BotProfileService } from '@repo/domain';
import { logger } from '@repo/logger';

async function runAudit() {
  console.log('🚀 === INICIANDO AUDITORÍA COMPREHENSIVA DE 20 MENSAJES Y EDICIÓN AVANZADA ===');

  const testPhone = '5491188888888';
  const testBotId = 'audit-bot-20';

  // 1. Limpiar datos previos
  await prisma.botSession.deleteMany({ where: { senderPhone: testPhone } });
  await prisma.botProfile.deleteMany({ where: { botId: testBotId } });

  console.log('📦 Creando perfil de bot para auditoría...');
  const profile = await BotProfileService.createProfile({
    botId: testBotId,
    phoneNumber: testPhone,
    name: 'Bot Auditoría 20 Mensajes',
    description: 'Bot para probar 20 mensajes progresivos, menús, imágenes y funciones',
    type: 'custom',
    isPublic: true,
    isActive: true,
  });

  console.log(`✅ Perfil creado con ID: ${profile.id}`);

  const flowIds: string[] = [];

  // 2. Crear 20 mensajes progresivos interponiendo tipos: text_plain, text_menu, image_menu, single_function
  console.log('📝 Creando 20 nodos/mensajes progresivos en la base de datos...');
  
  const contentTypes = ['text_plain', 'text_menu', 'image_menu', 'single_function'] as const;

  for (let i = 1; i <= 20; i++) {
    const cType = contentTypes[(i - 1) % contentTypes.length];
    const name = `Paso ${i} - Nodo ${cType}`;
    const triggerKeyword = `paso${i}`;
    let responseMessage = `Hola, este es el mensaje progresivo número ${i} de tipo ${cType}.`;
    let mediaUrl: string | null = null;
    let content: any = [];
    let actionKey: string | null = null;

    if (cType === 'text_menu') {
      responseMessage = `📋 [Menú ${i}] Selecciona una opción para continuar:`;
      content = [
        { label: `Opción A del paso ${i}`, option: '1' },
        { label: `Opción B del paso ${i}`, option: '2' }
      ];
    } else if (cType === 'image_menu') {
      responseMessage = `🖼️ [Imagen ${i}] Visualiza este catálogo interactivo:`;
      mediaUrl = `https://picsum.photos/seed/audit${i}/400/300`;
      content = [
        { label: `Comprar ítem ${i}`, option: '1' },
        { label: `Ver detalles ${i}`, option: '2' }
      ];
    } else if (cType === 'single_function') {
      responseMessage = `⚡ [Función ${i}] Ejecutando acción en tiempo real...`;
      actionKey = i % 2 === 0 ? 'stock.check' : 'business.payment_info';
    }

    const parentId = flowIds.length > 0 && i % 3 === 0 ? flowIds[flowIds.length - 1] : null;

    const flow = await BotService.createFlow({
      botProfileId: profile.id,
      name,
      triggerKeyword,
      contentType: cType,
      mediaUrl,
      flowType: cType.includes('menu') ? 'menu' : 'conversation',
      content,
      responseMessage,
      actionKey,
      isActive: true,
      parentId,
    });

    flowIds.push(flow.id);
  }

  console.log(`✅ Se crearon exitosamente ${flowIds.length} nodos conversacionales.`);

  // 3. Probar obtención con jerarquía y configuración completa
  console.log('🔍 Probando obtención de flujos enriquecidos (configuración y jerarquía)...');
  const enrichedFlows = await BotService.getFlows(profile.id);
  console.log(`📊 Flujos obtenidos con configuración y jerarquía: ${enrichedFlows.length}`);
  
  if (enrichedFlows.length !== 20) {
    throw new Error(`Se esperaban 20 flujos, se obtuvieron ${enrichedFlows.length}`);
  }

  // Verificar que cada flujo contiene configuration y hierarchy
  const sample = enrichedFlows[0];
  console.log('📌 Muestra de flujo enriquecido:', {
    name: sample.name,
    contentType: sample.configuration.contentType,
    attachedChildren: sample.hierarchy.attachedCount
  });

  if (!sample.configuration || !sample.hierarchy) {
    throw new Error('El flujo no contiene los objetos configuration o hierarchy requeridos.');
  }

  console.log('✅ Verificación de flujos enriquecidos EXITOSA.');

  // 4. Probar Edición en caliente de nodos (Actualizar mensajes, tipos y opciones)
  console.log('✏️ Probando edición de nodos conversacionales...');
  const targetId = flowIds[5]; // Nodo 6
  const updatedFlow = await BotService.updateFlow(targetId, {
    name: 'Paso 6 - EDITADO',
    responseMessage: '✨ ¡Este mensaje ha sido editado exitosamente durante la auditoría!',
    contentType: 'text_menu',
    menuOptions: [
      { label: 'Nuevo Submenú 1', option: '1' },
      { label: 'Nuevo Submenú 2', option: '2' }
    ]
  });
  console.log(`✅ Nodo ${targetId} editado correctamente. Nuevo mensaje: "${updatedFlow.responseMessage}"`);

  // 5. Probar Eliminación de nodos
  console.log('🗑️ Probando eliminación de un nodo específico...');
  const deleteTargetId = flowIds[flowIds.length - 1]; // Último nodo
  await BotService.deleteFlow(deleteTargetId);
  const remainingFlows = await BotService.getFlows(profile.id);
  console.log(`📊 Flujos restantes tras eliminación: ${remainingFlows.length} (Esperados: 19)`);

  if (remainingFlows.length !== 19) {
    throw new Error(`Se esperaban 19 flujos tras la eliminación, se encontraron ${remainingFlows.length}`);
  }

  console.log('🎉 === AUDITORÍA DE 20 MENSAJES Y EDICIÓN COMPLETADA CON ÉXITO ===');
}

runAudit().catch((err) => {
  console.error('❌ Error en auditoría:', err);
  process.exit(1);
});
