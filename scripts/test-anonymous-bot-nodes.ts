import { BotProfileService, BotService } from '@repo/domain';

async function createAndShowAnonymousBotTree() {
  try {
    const randomNum = '+54911' + Math.floor(10000000 + Math.random() * 90000000);
    const botId = `anon_bot_${Date.now()}`;
    
    // 1. Crear perfil de bot anónimo con menú principal y mensaje de bienvenida
    const profile = await BotProfileService.createProfile({
      botId,
      name: 'Bot Anónimo Comercial',
      phoneNumber: randomNum,
      description: 'Bot anónimo creado para demostración de nodos y multimensaje',
      menuOptions: [
        { label: '1. Ver Catálogo y Promos', option: '1', customResponse: 'Aquí tienes nuestro catálogo y promociones vigentes.' },
        { label: '2. Consultar Stock en Vivo', option: '2', actionKey: 'stock.check' },
        { label: '3. Hablar con Soporte', option: '3', actionKey: 'support.human' }
      ],
      welcomeMessage: '¡Hola! Bienvenido a nuestro asistente anónimo automatizado.'
    });

    // 2. Obtener el flujo raíz del menú principal
    const flows = await BotService.getFlows(profile.id);
    const rootMenu = flows.find(f => f.parentId === null);

    if (rootMenu) {
      // 3. Agregar un nodo hijo a la opción 1 (Catálogo y Promos) con múltiples mensajes encadenados (Texto + Imagen)
      await BotService.createFlow({
        botProfileId: profile.id,
        parentId: rootMenu.id,
        name: 'Detalle de Promociones y Foto',
        triggerKeyword: '1',
        contentType: 'text_plain',
        flowType: 'conversation',
        responseMessage: '🔥 ¡Aprovecha 30% OFF pagando con transferencia en toda nuestra tienda online!',
        messages: [
          {
            contentType: 'media_interactive',
            responseMessage: '📸 Aquí tienes el banner con los productos en oferta:',
            mediaUrl: 'https://ejemplo.com/assets/promo-banner.jpg'
          }
        ],
        isActive: true
      });
    }

    // 4. Obtener el árbol conversacional completo estructurado en JSON para paneles
    const treeResponse = await BotService.getConversationTree(profile.id);

    console.log(JSON.stringify(treeResponse, null, 2));
  } catch (err: any) {
    console.error(JSON.stringify({ success: false, error: err.message }, null, 2));
  }
}

createAndShowAnonymousBotTree();
