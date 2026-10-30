import { BotProfileService, BotService } from '@repo/domain';

async function auditPanelAPIAndFlows() {
  console.log('==================================================');
  console.log('🔍 INICIANDO AUDITORÍA Y TEST DE API PARA EL PANEL 3');
  console.log('==================================================');

  try {
    const randomNum = '+54911' + Math.floor(10000000 + Math.random() * 90000000);
    const botId = `panel_test_bot_${Date.now()}`;

    // 1. Crear perfil de bot para prueba
    console.log('\n1. Creando perfil de bot de prueba...');
    const profile = await BotProfileService.createProfile({
      botId,
      name: 'Bot Auditoría Panel',
      phoneNumber: randomNum,
      description: 'Bot de prueba para auditoría de API del Panel 3',
      welcomeMessage: '¡Hola! Bienvenido al asistente de auditoría.',
      menuOptions: [
        { label: '1. Ver Catálogo', option: '1', actionKey: 'stock.check' },
        { label: '2. Menú Libre', option: '2' } // Sin actionKey, requiere texto mínimo
      ]
    });
    console.log(`✅ Perfil creado exitosamente con ID: ${profile.id}`);

    // 2. Probar Validación de Error: Intentar crear flujo de menú libre SIN mensaje de respuesta (debe fallar)
    console.log('\n2. Probando validación de error en menús libres sin texto mínimo...');
    try {
      await BotService.createFlow({
        botProfileId: profile.id,
        name: 'Flujo Inválido',
        triggerKeyword: 'invalid',
        contentType: 'text_plain',
        responseMessage: '', // Vacío deliberadamente
        isActive: true
      });
      console.error('❌ ERROR: Se permitió crear un flujo sin mensaje de texto mínimo cuando se esperaba un error.');
    } catch (err: any) {
      console.log(`✅ Validación de error correcta capturada en el backend:\n   -> "${err.message}"`);
    }

    // 3. Crear nodo hijo / flujo válido con la estructura de árbol y multimensaje
    console.log('\n3. Creando nodo hijo válido y estructura multimensaje...');
    const flows = await BotService.getFlows(profile.id);
    const rootFlow = flows[0];

    const childNode = await BotService.createFlow({
      botProfileId: profile.id,
      parentId: rootFlow.id,
      name: 'Submenú Opciones de Promos',
      triggerKeyword: '2',
      contentType: 'text_plain',
      flowType: 'conversation',
      responseMessage: '🔥 ¡Seleccionaste el Menú Libre! Aquí tienes toda la información de promociones.',
      messages: [
        {
          contentType: 'media_interactive',
          responseMessage: '📸 Imagen adjunta de la promoción:',
          mediaUrl: 'https://ejemplo.com/banner-promo.jpg'
        }
      ],
      isActive: true
    });
    console.log(`✅ Nodo hijo creado exitosamente con ID: ${childNode.id}`);

    // 4. Obtener árbol conversacional completo (JSON que consume el panel)
    console.log('\n4. Obteniendo árbol conversacional jerárquico (/tree)...');
    const treeResult = await BotService.getConversationTree(profile.id);
    console.log('✅ Árbol JSON obtenido correctamente para el panel:');
    console.log(JSON.stringify(treeResult, null, 2));

    console.log('\n==================================================');
    console.log('🎉 ¡AUDITORÍA Y PRUEBAS DE API DEL PANEL COMPLETADAS CON ÉXITO!');
    console.log('==================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error crítico durante la auditoría de API:', err);
    process.exit(1);
  }
}

auditPanelAPIAndFlows();
