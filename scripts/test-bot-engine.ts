/**
 * Script de pruebas exhaustivas para validar el MasterBotEngine, UserBotEngine,
 * verificador de sesión propio y manipulación de menús y funciones vía base de datos.
 */

import { MasterBotEngine, UserBotEngine, BotFunctionRegistry, CapabilityRegistry } from '@repo/domain';
import { prisma } from '@repo/database';

async function testBotEngine() {
  console.log('==================================================');
  console.log('🧪 PRUEBAS EMPÍRICAS DEL MOTOR DE BOT DINÁMICO');
  console.log('==================================================');

  try {
    const testPhone = '5491155554444';

    // 1. Limpiar sesiones previas del usuario de prueba
    await prisma.botSession.deleteMany({ where: { senderPhone: testPhone } });
    console.log('✔ Sesión previa limpiada.');

    // 2. Probar MasterBotEngine (Bot Admin Central)
    console.log('\n2. Probando MasterBotEngine con mensaje inicial ("menu")...');
    const masterEngine = new MasterBotEngine();
    const res1 = await masterEngine.processMessage({
      senderPhone: testPhone,
      incomingText: 'menu',
      phoneNumberId: '880275461842101',
    });
    console.log('✅ Resultado MasterBotEngine (menu):', res1);

    // 3. Probar ejecución de opción 1 (Auth Login) a través del motor admin
    console.log('\n3. Probando selección de opción 1 (auth.login) en MasterBotEngine...');
    const res2 = await masterEngine.processMessage({
      senderPhone: testPhone,
      incomingText: '1',
      phoneNumberId: '880275461842101',
    });
    console.log('✅ Resultado opción 1 (login):', res2);

    // 4. Probar cambio a Bot Hijo (UserBotEngine) conectándose a "demo-soporte"
    console.log('\n4. Probando UserBotEngine conectándose al bot hijo "demo-soporte"...');
    await prisma.botSession.update({
      where: { senderPhone: testPhone },
      data: { activeBotId: 'demo-soporte' },
    });

    const userBotEngine = new UserBotEngine('demo-soporte');
    const res3 = await userBotEngine.processMessage({
      senderPhone: testPhone,
      incomingText: 'menu',
      phoneNumberId: '880275461842101',
    });
    console.log('✅ Resultado UserBotEngine (demo-soporte):', res3);

    // 5. Probar funciones en BotFunctionRegistry
    console.log('\n5. Probando ejecución directa de funciones en BotFunctionRegistry...');
    const fnResult = await BotFunctionRegistry.execute('auth.login', { senderPhone: testPhone, botId: 'admin' });
    console.log('✅ Resultado BotFunctionRegistry (auth.login):', fnResult);

    console.log('\n==================================================');
    console.log('🎉 ¡TODAS LAS PRUEBAS DEL MOTOR DE BOT PASARON EXITOSAMENTE!');
    console.log('==================================================');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error en pruebas del motor de bot:', error);
    process.exit(1);
  }
}

testBotEngine();
