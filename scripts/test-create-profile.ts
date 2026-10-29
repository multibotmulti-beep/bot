import { BotProfileService, BotService } from '@repo/domain';

async function testTree() {
  try {
    const randomNum = '+54911' + Math.floor(10000000 + Math.random() * 90000000);
    const botId = `bot_${Date.now()}`;
    
    // 1. Crear perfil base con menú
    const profile = await BotProfileService.createProfile({
      botId,
      name: 'Bot Árbol Jerárquico',
      phoneNumber: randomNum,
      description: 'Prueba de árbol conversacional',
      menuOptions: [
        { label: '1. Ventas', option: '1', actionKey: 'sales.create' },
        { label: '2. Soporte', option: '2', actionKey: 'support.human' }
      ],
      welcomeMessage: 'Bienvenido al menú principal de jerarquía.'
    });

    // 2. Obtener el flujo raíz creado para asociarle un nodo hijo (submenú)
    const flows = await BotService.getFlows(profile.id);
    const rootFlow = flows[0];

    if (rootFlow) {
      // Crear un nodo hijo debajo del flujo raíz
      await BotService.createFlow({
        botProfileId: profile.id,
        parentId: rootFlow.id,
        name: 'Submenú Opciones de Ventas',
        triggerKeyword: '1',
        contentType: 'text_plain',
        flowType: 'menu',
        content: [],
        responseMessage: 'Has seleccionado Ventas. ¿Qué deseas comprar?',
        isActive: true
      });
    }

    // 3. Obtener el árbol conversacional completo en formato JSON jerárquico
    const tree = await BotService.getConversationTree(profile.id);

    console.log(JSON.stringify(tree, null, 2));
  } catch (err: any) {
    console.error(JSON.stringify({ success: false, error: err.message }, null, 2));
  }
}

testTree();
