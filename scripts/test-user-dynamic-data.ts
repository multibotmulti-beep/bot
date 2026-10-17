import { prisma } from '@repo/database';
import { MasterBotEngine, BotProfileService, BotFunctionConfigService, BotMemoryService, BotFunctionRegistry } from '@repo/domain';
import { logger } from '@repo/logger';

async function runDynamicDataTest() {
  try {
    console.log('🧪 === INICIANDO TEST DE DATOS DINÁMICOS DE USUARIO (+543765245980) ===');

    const userPhone = '+543765245980';
    const cleanPhone = userPhone.replace(/[^0-9]/g, '');
    const botId = cleanPhone; // El botID asociado al número del usuario

    // 1. Limpiar datos previos de este usuario y bot
    await prisma.botSession.deleteMany({ where: { senderPhone: { in: [userPhone, cleanPhone] } } });
    await prisma.botProfile.deleteMany({ where: { botId } });

    // 2. Crear perfil de bot para este usuario (nada hardcodeado, datos propios)
    console.log(`\n--- 1. Creando perfil de bot para el usuario ${userPhone} ---`);
    const profile = await BotProfileService.createProfile({
      phoneNumber: userPhone,
      name: 'Negocio de ' + userPhone,
      description: 'Tienda personalizada del usuario',
      type: 'custom',
      isPublic: true,
      isActive: true,
    });
    console.log('✅ Perfil de bot creado:', profile.botId);

    // 3. Simular que el usuario carga su propia información de pago en la BD
    console.log('\n--- 2. Cargando información de pago personalizada en la BD ---');
    const customPaymentData = {
      banco: 'Mercado Pago / Galicia',
      titular: 'Emprendedor ' + cleanPhone,
      cbu: '0000003100012345678999',
      alias: 'mi.tienda.personal.' + cleanPhone.slice(-4),
      linkPago: 'https://mpago.li/test-' + cleanPhone,
    };
    await BotFunctionConfigService.saveConfig(botId, 'business.payment_info', customPaymentData);
    console.log('✅ Configuración de pago guardada:', customPaymentData);

    // 4. Simular que el usuario carga su propio stock en la BD
    console.log('\n--- 3. Cargando stock personalizado en la BD ---');
    const customStockData = {
      producto: 'Remera Exclusiva ' + cleanPhone,
      cantidad: 42,
      precio: 15500,
      categoria: 'Indumentaria',
    };
    await BotFunctionConfigService.saveConfig(botId, 'stock.manage', customStockData);
    await BotMemoryService.record({
      botId,
      senderPhone: userPhone,
      category: 'stock',
      title: `Stock: ${customStockData.producto}`,
      payload: customStockData,
      tags: ['stock', 'usuario'],
    });
    console.log('✅ Stock guardado:', customStockData);

    // 5. Vincular acciones a un flujo de menú para que el bot pueda invocarlas
    await prisma.botFlow.create({
      data: {
        botProfileId: profile.id,
        name: 'Menú Principal del Usuario',
        triggerKeyword: 'menu',
        flowType: 'menu',
        content: JSON.stringify([
          { label: '1. Ver Datos de Pago', option: '1', actionKey: 'business.payment_info' },
          { label: '2. Consultar Stock', option: '2', actionKey: 'stock.check' }
        ]),
        responseMessage: '👋 ¡Hola! Bienvenido a tu panel de negocio. Selecciona una opción:',
        isActive: true,
      },
    });

    // 6. Activar el perfil del bot y simular la interacción del usuario
    await BotProfileService.activateProfile(profile.id);

    const masterEngine = new MasterBotEngine();

    // Establecer sesión activa para el usuario apuntando a su bot
    await prisma.botSession.upsert({
      where: { senderPhone: cleanPhone },
      update: { activeBotId: botId, verified: true },
      create: { senderPhone: cleanPhone, activeBotId: botId, verified: true },
    });

    const sendMessage = async (text: string) => {
      console.log(`\n----------------------------------------`);
      console.log(`📤 Usuario (${userPhone}) envía: "${text}"`);
      const res = await masterEngine.processMessage({
        senderPhone: userPhone,
        incomingText: text,
        phoneNumberId: '880275461842101',
      });
      console.log(`📥 Respuesta del Bot:\n${res.response || res.matchedResponse || JSON.stringify(res)}`);
      return res;
    };

    // A. Enviar "hola" o "menu" para ver el menú del bot
    await sendMessage('hola');

    // B. Enviar opción 1 para consultar datos de pago personalizados
    const resPayment = await sendMessage('1');
    if (!resPayment.response?.includes(customPaymentData.alias) && !resPayment.matchedResponse?.includes(customPaymentData.alias)) {
      throw new Error(`Falló la prueba de pagos: El bot no devolvió el alias configurado (${customPaymentData.alias}).`);
    }
    console.log('✅ Verificación de pagos EXITOSA: El bot leyó y respondió con los datos personalizados.');

    // C. Enviar opción 2 para consultar stock personalizado
    const resStock = await sendMessage('2');
    if (!resStock.response?.includes(customStockData.producto) && !resStock.matchedResponse?.includes(customStockData.producto)) {
      throw new Error(`Falló la prueba de stock: El bot no devolvió el producto configurado (${customStockData.producto}).`);
    }
    console.log('✅ Verificación de stock EXITOSA: El bot leyó y respondió con el inventario personalizado.');

    console.log('\n🎉 ¡TEST DE DATOS DINÁMICOS DE USUARIO COMPLETADO EXITOSAMENTE! 🎉');
  } catch (error) {
    console.error('❌ Error en el test de datos dinámicos:', error);
    process.exit(1);
  }
}

runDynamicDataTest();
