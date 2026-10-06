import { CapabilityRegistry } from '@repo/domain';
import { logger } from '@repo/logger';

async function testCapabilities() {
  console.log('==================================================');
  console.log('🧪 PROBANDO CAPACIDADES DE DOMINIO MODULARES');
  console.log('==================================================');

  try {
    const testPhone = '+5491198765432';

    // 1. Listar capacidades registradas
    console.log('\n1. Listando todas las capacidades registradas:');
    const allCaps = CapabilityRegistry.getAll();
    console.log(`✅ Capacidades encontradas: ${allCaps.length}`);
    allCaps.forEach(c => console.log(`   - [${c.key}]: ${c.name}`));

    // 2. Probar AUTH_LOGIN
    console.log('\n2. Probando capacidad AUTH_LOGIN...');
    const authResult = await CapabilityRegistry.execute('AUTH_LOGIN', { senderPhone: testPhone });
    console.log('✅ Resultado AUTH_LOGIN:', authResult);

    // 3. Probar LIST_MY_BOTS
    console.log('\n3. Probando capacidad LIST_MY_BOTS...');
    const myBotsResult = await CapabilityRegistry.execute('LIST_MY_BOTS', { senderPhone: testPhone });
    console.log('✅ Resultado LIST_MY_BOTS:', myBotsResult);

    // 4. Probar MANAGE_BOT_CREATE
    console.log('\n4. Probando capacidad MANAGE_BOT_CREATE...');
    const createResult = await CapabilityRegistry.execute('MANAGE_BOT_CREATE', {
      args: {
        name: 'Bot Test Automatizado',
        description: 'Bot de prueba creado por script de validación',
        phoneNumber: testPhone,
        welcomeMessage: 'Hola, bienvenido al bot de prueba.',
        options: [{ label: 'Opción 1', option: '1', response: 'Respuesta 1' }]
      }
    });
    console.log('✅ Resultado MANAGE_BOT_CREATE:', createResult);

    // 5. Probar LIST_ALL_BOTS
    console.log('\n5. Probando capacidad LIST_ALL_BOTS...');
    const allBotsResult = await CapabilityRegistry.execute('LIST_ALL_BOTS', {});
    console.log('✅ Resultado LIST_ALL_BOTS:', allBotsResult);

    // 6. Probar LIST_CHATS
    console.log('\n6. Probando capacidad LIST_CHATS...');
    const chatsResult = await CapabilityRegistry.execute('LIST_CHATS', { args: { senderPhone: testPhone } });
    console.log('✅ Resultado LIST_CHATS:', chatsResult);

    console.log('\n==================================================');
    console.log('🎉 ¡TODAS LAS CAPACIDADES FUNCIONAN CORRECTAMENTE!');
    console.log('==================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error probando capacidades:', err);
    process.exit(1);
  }
}

testCapabilities();
