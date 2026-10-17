import { prisma } from '@repo/database';
import { MasterBotEngine, BotProfileService, BotFunctionRegistry, BotFunctionConfigService } from '@repo/domain';
import { logger } from '@repo/logger';

async function runInteractionTest() {
  try {
    const targetBotPhone = '+543765245980';
    const cleanPhone = '543765245980';
    const clientPhone = '5491112345678';

    console.log(`🧪 === INTERACCIÓN Y CARGA DE DATOS CON BOT ${targetBotPhone} ===`);

    // 1. Asegurar que existe el perfil de bot para +543765245980
    let profile = await prisma.botProfile.findUnique({
      where: { botId: cleanPhone },
    });

    if (!profile) {
      console.log('Creando perfil de bot para el número solicitado...');
      profile = await BotProfileService.createProfile({
        phoneNumber: targetBotPhone,
        name: 'Negocio Oficial 543765245980',
        description: 'Bot oficial del negocio',
        type: 'custom',
        isPublic: true,
        isActive: true,
        menuOptions: [
          { option: '1', label: 'Ver Stock' },
          { option: '2', label: 'Datos de Pago' },
          { option: '3', label: 'Actualizar Stock' },
          { option: '4', label: 'Guardar Nota Cliente' }
        ]
      });
    } else {
      await BotProfileService.activateProfile(profile.id);
    }

    // 2. Configurar datos de pago (Business Payment Info) usando BotFunctionConfigService
    console.log('2. Configurando datos de pago del negocio en la BD...');
    await BotFunctionConfigService.saveConfig(profile.botId, 'business.payment_info', {
      banco: 'Banco Galicia',
      titular: 'Comercio Oficial S.A.',
      cbu: '0720000788000012345678',
      alias: 'negocio.oficial.mp',
      linkPago: 'https://mpago.li/ejemplo'
    });

    // 3. Configurar stock inicial en la base de datos (BotMemory)
    console.log('3. Cargando stock inicial en la base de datos...');
    await BotFunctionRegistry.execute('stock.manage', {
      senderPhone: clientPhone,
      botId: profile.botId,
      args: { product: 'Remera Premium Algodón', qty: 25 }
    });

    await BotFunctionRegistry.execute('stock.manage', {
      senderPhone: clientPhone,
      botId: profile.botId,
      args: { product: 'Pánel Solar 100W', qty: 12 }
    });

    // 4. Simular interacción del cliente enviando mensajes al bot
    console.log('4. Simulando interacción por chat con el bot...');
    const engine = new MasterBotEngine();

    // Asegurar sesión con este bot
    await prisma.botSession.upsert({
      where: { senderPhone: clientPhone },
      update: { activeBotId: profile.botId },
      create: { senderPhone: clientPhone, activeBotId: profile.botId }
    });

    // A. Enviar "hola"
    console.log('\n--- Interacción A: Enviar "hola" ---');
    const resHola = await engine.processMessage({
      senderPhone: clientPhone,
      incomingText: 'hola',
      phoneNumberId: '880275461842101',
    });
    console.log('Respuesta:', resHola.matchedResponse || resHola.response);

    // B. Consultar Stock (acción stock.check)
    console.log('\n--- Interacción B: Consultar Stock ---');
    const resStock = await BotFunctionRegistry.execute('stock.check', {
      senderPhone: clientPhone,
      botId: profile.botId,
    });
    console.log('Resultado stock.check:', resStock.message);

    // C. Consultar Datos de Pago (acción business.payment_info)
    console.log('\n--- Interacción C: Consultar Datos de Pago ---');
    const resPago = await BotFunctionRegistry.execute('business.payment_info', {
      senderPhone: clientPhone,
      botId: profile.botId,
    });
    console.log('Resultado business.payment_info:', resPago.message);

    console.log('\n🎉 ¡INTERACCIÓN Y CARGA DE DATOS COMPLETADAS CON ÉXITO PARA EL BOT +543765245980! 🎉');
  } catch (error) {
    console.error('❌ Error en test de interacción:', error);
    process.exit(1);
  }
}

runInteractionTest();
