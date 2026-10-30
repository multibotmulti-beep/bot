import { BotProfileService, BotService, UserBotEngine } from '@repo/domain';

async function simulateOwnerFlow() {
  console.log('======================================================================');
  console.log('👤 SIMULACIÓN DE DUEÑO DE NEGOCIO - GESTIÓN Y CHAT CON EL BOT');
  console.log('======================================================================');

  try {
    const ownerPhone = '+5491188887777';
    const botId = `negocio_${Date.now()}`;

    // 1. El dueño crea su bot personalizado con menú y bienvenida
    console.log('\n[Paso 1] Creando bot del negocio...');
    const profile = await BotProfileService.createProfile({
      botId,
      name: 'Bot de Mi Tienda',
      phoneNumber: ownerPhone,
      description: 'Bot oficial de atención al cliente',
      welcomeMessage: '¡Hola! Bienvenido a Mi Tienda. Elige una opción:',
      menuOptions: [
        { label: '1. Ver Catálogo y Stock', option: '1', actionKey: 'stock.check' },
        { label: '2. Promociones Vigentes', option: '2', customResponse: '🔥 ¡Tenemos 25% OFF en pagos con transferencia!' },
        { label: '3. Hablar con un Asesor', option: '3', actionKey: 'support.human' }
      ]
    });
    console.log('✅ Bot creado exitosamente:', { botId: profile.botId, name: profile.name });

    // 2. El dueño consulta el árbol de conversación inicial
    console.log('\n[Paso 2] Consultando árbol conversacional del bot...');
    const initialTree = await BotService.getConversationTree(profile.id);
    console.log('📊 Árbol inicial (JSON para paneles):', JSON.stringify(initialTree, null, 2));

    // 3. El dueño agrega un nodo hijo (submenú con múltiples mensajes / imagen) a la opción 2
    console.log('\n[Paso 3] Agregando nuevos mensajes y subnodo a la opción 2 (Promociones)...');
    const flows = await BotService.getFlows(profile.id);
    const rootFlow = flows[0];

    const subNode = await BotService.createFlow({
      botProfileId: profile.id,
      parentId: rootFlow.id,
      name: 'Detalle de Promociones y Banner',
      triggerKeyword: '2',
      contentType: 'media_interactive',
      mediaUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f',
      flowType: 'menu',
      content: JSON.stringify([
        { label: 'A. Promos Bancarias', option: 'A', customResponse: '💳 3 y 6 cuotas sin interés con tarjetas bancarias.' },
        { label: 'B. Envíos Gratis', option: 'B', customResponse: '🚚 Envío gratis en compras superiores a $50.000.' }
      ]),
      responseMessage: '📸 Aquí tienes el catálogo visual de nuestras promos actuales:',
      isActive: true,
      messages: [
        { contentType: 'text_plain', responseMessage: '💡 Tip: Envía "A" o "B" para ver más detalles.', mediaUrl: null }
      ]
    });
    console.log('✅ Subnodo creado con éxito:', { id: subNode.id, name: subNode.name });

    // 4. El dueño edita un mensaje/nodo existente
    console.log('\n[Paso 4] Editando el mensaje de bienvenida del subnodo...');
    await BotService.updateFlow(subNode.id, {
      responseMessage: '🔥 [ACTUALIZADO] Catálogo visual exclusivo de promociones de temporada:'
    });
    console.log('✅ Subnodo actualizado correctamente.');

    // 5. El dueño elimina un mensaje o regla obsoleta (simulando limpieza)
    console.log('\n[Paso 5] Eliminando un nodo o regla obsoleta...');
    // Creamos una regla temporal para demostrar eliminación
    const tempRule = await BotService.createRule({
      botProfileId: profile.id,
      keyword: 'prueba_borrar',
      matchType: 'exact',
      responseMessage: 'Este mensaje será borrado.',
      isActive: true,
    });
    console.log('🗑️ Regla temporal creada con ID:', tempRule.id);
    await BotService.deleteRule(tempRule.id);
    console.log('✅ Regla temporal eliminada exitosamente.');

    // 6. Simulando chat del cliente final con el bot
    console.log('\n[Paso 6] Simulando interacción conversacional (Cliente chateando con el bot)...');
    const engine = new UserBotEngine(botId);
    const clientPhone = '+5491111112222';

    // Cliente envía "menu"
    console.log('\n👤 Cliente: "menu"');
    const res1 = await engine.processMessage({ senderPhone: clientPhone, incomingText: 'menu' });
    console.log('🤖 Bot Responde:', res1.matchedResponse);

    // Cliente selecciona opción 1 (Función stock.check) -> Debe responder exclusivamente con la función sin texto mezclado
    console.log('\n👤 Cliente: "1" (Selecciona opción de stock)');
    const res2 = await engine.processMessage({ senderPhone: clientPhone, incomingText: '1' });
    console.log('🤖 Bot Responde (Función pura):', res2.matchedResponse);

    // Cliente selecciona opción 2 (Promociones / subnodo)
    console.log('\n👤 Cliente: "2" (Selecciona opciones de promociones)');
    const res3 = await engine.processMessage({ senderPhone: clientPhone, incomingText: '2' });
    console.log('🤖 Bot Responde (Submenú con imagen):', res3.matchedResponse);

    // 7. Ver el árbol final actualizado para paneles
    console.log('\n[Paso 7] Obteniendo árbol final actualizado para el panel de control...');
    const finalTree = await BotService.getConversationTree(profile.id);
    console.log('📊 Árbol final:', JSON.stringify(finalTree, null, 2));

    console.log('\n======================================================================');
    console.log('🎉 ¡SIMULACIÓN DE DUEÑO Y CHAT COMPLETADA CON ÉXITO!');
    console.log('======================================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error durante la simulación:', err);
    process.exit(1);
  }
}

simulateOwnerFlow();
