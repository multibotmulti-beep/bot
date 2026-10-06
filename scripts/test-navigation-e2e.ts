import { CapabilityRegistry, BotService } from '@repo/domain';
import { logger } from '@repo/logger';

async function runE2ENavigationTest() {
  console.log('==================================================');
  console.log('🚀 INICIANDO PRUEBA E2E DE NAVEGACIÓN Y CAPACIDADES');
  console.log('==================================================');

  try {
    const testPhone = '+5491176543210';
    const botId = 'bot_test_e2e';

    // 1. Listar capacidades disponibles
    console.log('\n1. Listando capacidades disponibles...');
    const capabilities = CapabilityRegistry.getAll();
    console.log(`✅ Capacidades encontradas: ${capabilities.length}`);
    capabilities.forEach(c => console.log(`   - [${c.key}]: ${c.name}`));

    // 2. Crear un bot de prueba con menú mixto (opción con capacidad y opción estática)
    console.log('\n2. Creando bot de prueba con menú mixto...');
    const createResult = await CapabilityRegistry.execute('MANAGE_BOT_CREATE', {
      args: {
        name: 'Bot E2E Interactivo',
        description: 'Bot para prueba end-to-end de capacidades y menús',
        phoneNumber: '5491176543210',
        welcomeMessage: '¡Hola! Bienvenido al Bot E2E Interactivo. Selecciona una opción:',
        options: [
          { label: '1. 📋 Listar mis bots (Con Capacidad)', option: '1', capabilityKey: 'LIST_MY_BOTS' },
          { label: '2. ℹ️ Información general (Estático)', option: '2' },
          { label: '3. 🔑 Iniciar sesión (Con Capacidad)', option: '3', capabilityKey: 'AUTH_LOGIN' }
        ]
      }
    });
    console.log('✅ Resultado creación de bot:', createResult.message);

    // 3. Simular navegación en el bot: Enviar "menu" para ver el menú principal
    console.log('\n3. Simulando mensaje entrante "menu"...');
    const menuPayload = {
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: '880275461842101' },
            messages: [{
              from: testPhone,
              text: { body: 'menu' },
            }],
          },
        }],
      }],
    };
    const menuResponse = await BotService.handleIncomingWebhook(menuPayload, botId);
    console.log('✅ Respuesta del Bot al comando "menu":', menuResponse);

    // 4. Simular selección de Opción 1 (Tiene capabilityKey: LIST_MY_BOTS)
    console.log('\n4. Simulando selección de Opción 1 (LIST_MY_BOTS)...');
    const option1Payload = {
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: '880275461842101' },
            messages: [{
              from: testPhone,
              text: { body: '1' },
            }],
          },
        }],
      }],
    };
    const option1Response = await BotService.handleIncomingWebhook(option1Payload, botId);
    console.log('✅ Respuesta del Bot al seleccionar Opción 1 (Capacidad ejecutada):', option1Response);

    // 5. Simular selección de Opción 2 (Estática / Sin capacidad)
    console.log('\n5. Simulando selección de Opción 2 (Estática)...');
    // Primero volver al menú principal enviando "0"
    await BotService.handleIncomingWebhook({
      entry: [{ changes: [{ value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '880275461842101' }, messages: [{ from: testPhone, text: { body: '0' } }] } }] }]
    }, botId);

    const option2Payload = {
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: '880275461842101' },
            messages: [{
              from: testPhone,
              text: { body: '2' },
            }],
          },
        }],
      }],
    };
    const option2Response = await BotService.handleIncomingWebhook(option2Payload, botId);
    console.log('✅ Respuesta del Bot al seleccionar Opción 2 (Estática):', option2Response);

    console.log('\n==================================================');
    console.log('🎉 ¡PRUEBA E2E DE NAVEGACIÓN Y CAPACIDADES EXITOSA!');
    console.log('==================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error en prueba E2E:', err);
    process.exit(1);
  }
}

runE2ENavigationTest();
