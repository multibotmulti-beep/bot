/**
 * Script de prueba E2E para el Motor de Bot Dinámico Jerárquico.
 * Valida:
 * 1. Modificación dinámica de menús y bienvenida del Bot Admin en base de datos.
 * 2. Creación y carga de un Bot Hijo de usuario (UserBotEngine) por debajo del MasterBotEngine.
 * 3. Ejecución de funciones desacopladas (actionKey) asociadas al menú.
 * 4. Independencia total de base de datos sin hardcoding en respuestas.
 */

import { prisma } from '@repo/database';
import { MasterBotEngine, UserBotEngine, BotFunctionRegistry } from '@repo/domain';

async function runE2ETests() {
  console.log('🧪 Iniciando pruebas E2E del Motor de Bot Dinámico...');
  const testPhone = '5491122334455';

  try {
    // Limpiar sesión previa de prueba
    await prisma.botSession.deleteMany({ where: { senderPhone: testPhone } });

    // ==========================================
    // TEST 1: Modificar Mensaje de Bienvenida y Menú del Bot Admin en BD
    // ==========================================
    console.log('\n[TEST 1] Modificando bienvenida y opciones de menú del Bot Admin...');
    const adminProfile = await prisma.botProfile.findUnique({ where: { botId: 'admin' } });
    if (!adminProfile) throw new Error('No se encontró el Bot Admin en la base de datos');

    const adminFlow = await prisma.botFlow.findFirst({ where: { botProfileId: adminProfile.id, parentId: null } });
    if (!adminFlow) throw new Error('No se encontró el flujo raíz del Bot Admin');

    const updatedWelcome = '🔥 ¡Bienvenido al Bot Maestro Actualizado! Selecciona:';
    const updatedOptions = [
      { label: '1. Iniciar sesión inmediata', option: '1', actionKey: 'auth.login' },
      { label: '2. Ver mis bots registrados', option: '2', actionKey: 'bot.list_my_bots' },
      { label: '3. Soporte VIP con asesor', option: '3', actionKey: 'support.human' }
    ];

    await prisma.botFlow.update({
      where: { id: adminFlow.id },
      data: {
        responseMessage: updatedWelcome,
        content: JSON.stringify(updatedOptions),
      },
    });

    console.log('✔ Menú y bienvenida del Bot Admin modificados en BD.');

    // ==========================================
    // TEST 2: Ejecución del MasterBotEngine con el Menú Modificado
    // ==========================================
    console.log('\n[TEST 2] Probando MasterBotEngine con el menú actualizado...');
    const masterEngine = new MasterBotEngine();

    // Mock de envío a WhatsApp para capturar respuestas sin fallar por red externa
    let lastSentMessage = '';
    (masterEngine as any).sendResponseToWhatsApp = async (_phone: string, text: string) => {
      lastSentMessage = text;
      return true;
    };

    // Mensaje "menu" al Bot Admin
    await masterEngine.processMessage({
      senderPhone: testPhone,
      incomingText: 'menu',
    });

    console.log('Respuesta recibida del motor:', lastSentMessage);
    if (!lastSentMessage.includes(updatedWelcome) || !lastSentMessage.includes('Soporte VIP')) {
      throw new Error('El motor no devolvió el mensaje de bienvenida o menú actualizado desde la BD');
    }
    console.log('✔ MasterBotEngine respondió con el menú actualizado desde la base de datos sin hardcoding.');

    // ==========================================
    // TEST 3: Ejecución de Función vinculada al Menú (actionKey: auth.login)
    // ==========================================
    console.log('\n[TEST 3] Probando ejecución de función mapeada (opción 1 -> auth.login)...');
    await masterEngine.processMessage({
      senderPhone: testPhone,
      incomingText: '1',
    });

    console.log('Respuesta de la función:', lastSentMessage);
    if (!lastSentMessage.includes('Inicio de Sesión Automático') && !lastSentMessage.includes('token=')) {
      throw new Error('No se ejecutó correctamente la función auth.login vinculada a la opción 1');
    }
    console.log('✔ Función de menú ejecutada dinámicamente mediante BotFunctionRegistry.');

    // ==========================================
    // TEST 4: Crear un Bot Hijo de Usuario y Cargar con UserBotEngine
    // ==========================================
    console.log('\n[TEST 4] Creando bot hijo de usuario en la base de datos...');
    const userBotId = 'bot-usuario-ventas-vip';

    const userBot = await prisma.botProfile.upsert({
      where: { botId: userBotId },
      update: { name: 'Bot Ventas VIP', type: 'custom', isActive: true },
      create: {
        botId: userBotId,
        name: 'Bot Ventas VIP',
        description: 'Bot hijo creado dinámicamente para ventas exclusivas',
        type: 'custom',
        isPublic: true,
        isActive: true,
      },
    });

    const userBotOptions = [
      { label: '1. Productos Destacados', option: '1' },
      { label: '2. Contactar Vendedor Humano', option: '2', actionKey: 'support.human' }
    ];

    const existingUserFlow = await prisma.botFlow.findFirst({ where: { botProfileId: userBot.id } });
    if (existingUserFlow) {
      await prisma.botFlow.update({
        where: { id: existingUserFlow.id },
        data: {
          responseMessage: '¡Bienvenido a Ventas VIP! Elige una opción:',
          content: JSON.stringify(userBotOptions),
        },
      });
    } else {
      await prisma.botFlow.create({
        data: {
          botProfileId: userBot.id,
          name: 'Menú Ventas VIP',
          triggerKeyword: 'menu',
          flowType: 'menu',
          content: JSON.stringify(userBotOptions),
          responseMessage: '¡Bienvenido a Ventas VIP! Elige una opción:',
          isActive: true,
        },
      });
    }

    console.log('✔ Bot hijo de usuario creado y almacenado en la base de datos.');

    // Cambiar la sesión activa del usuario hacia el bot hijo
    await prisma.botSession.update({
      where: { senderPhone: testPhone },
      data: { activeBotId: userBotId, currentParentFlowId: null },
    });

    // Enviar mensaje al bot hijo a través de MasterBotEngine (delegación jerárquica)
    console.log('\n[TEST 5] Probando delegación jerárquica al bot hijo...');
    await masterEngine.processMessage({
      senderPhone: testPhone,
      incomingText: 'menu',
    });

    console.log('Respuesta recibida del bot hijo:', lastSentMessage);
    if (!lastSentMessage.includes('Ventas VIP') || !lastSentMessage.includes('Productos Destacados')) {
      throw new Error('La delegación jerárquica al bot hijo falló');
    }
    console.log('✔ El bot hijo respondió con sus opciones y mensaje propios.');

    // Probar opción 2 del bot hijo que ejecuta función de soporte humano
    await masterEngine.processMessage({
      senderPhone: testPhone,
      incomingText: '2',
    });
    console.log('Respuesta opción 2 bot hijo:', lastSentMessage);
    if (!lastSentMessage.includes('asesor humano')) {
      throw new Error('La función vinculada en el bot hijo falló al ejecutarse');
    }
    console.log('✔ Función en bot hijo ejecutada exitosamente.');

    // Regresar al Bot Admin maestro enviando 0
    await masterEngine.processMessage({
      senderPhone: testPhone,
      incomingText: '0',
    });
    console.log('Respuesta al regresar:', lastSentMessage);
    if (!lastSentMessage.includes(updatedWelcome)) {
      throw new Error('No se restauró el Bot Admin al enviar 0');
    }
    console.log('✔ Regreso al Bot Admin validado con éxito.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS E2E DEL MOTOR DE BOT PASARON SATISFACTORIAMENTE!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS E2E:', error);
    process.exit(1);
  }
}

runE2ETests();
