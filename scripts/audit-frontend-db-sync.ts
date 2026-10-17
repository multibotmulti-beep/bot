import { prisma } from '@repo/database';
import { BotFunctionConfigService, BotFunctionRegistry } from '@repo/domain';
import { logger } from '@repo/logger';

async function auditFrontendDbSync() {
  try {
    console.log('🧪 === AUDITORÍA DE SINCRONIZACIÓN DB Y CARGA EN FUNCIONES DEL BOT ===');

    const botId = '+543765245980';
    const actionKey = 'business.payment_info';
    const testConfig = {
      banco: 'Banco Nación (Test Frontend Sync)',
      titular: 'Empresa Test SRL',
      cbu: '1110000999000011112222',
      alias: 'test.frontend.sync',
      linkPago: 'https://mpago.li/sync-test'
    };

    // 1. Simular guardado desde el Frontend (equivalente a POST /bot/function-configs)
    console.log('1. Guardando configuración de función (como lo hace el Panel Frontend)...');
    const saveResult = await BotFunctionConfigService.saveConfig(botId, actionKey, testConfig);
    if (!saveResult.success) {
      throw new Error(`Falló el guardado: ${saveResult.error}`);
    }
    console.log('✅ Configuración guardada en base de datos correctamente.');

    // 2. Verificar que la base de datos almacena el registro exacto
    console.log('2. Verificando persistencia directa en la tabla botFunctionConfig...');
    const dbRecord = await prisma.botFunctionConfig.findUnique({
      where: {
        botId_actionKey: { botId, actionKey }
      }
    });
    console.log('Registro en BD:', dbRecord);
    if (!dbRecord || !dbRecord.configJson) {
      throw new Error('El registro no se encontró en la base de datos.');
    }

    // 3. Simular que el bot carga y responde con los datos guardados
    console.log('3. Simulando ejecución de la función por parte del bot...');
    const executionResult = await BotFunctionRegistry.execute(actionKey, {
      senderPhone: '5491198765432',
      botId: botId,
    });
    console.log('Respuesta generada por el bot:', executionResult.message);

    if (!executionResult.success || !executionResult.message?.includes('Banco Nación (Test Frontend Sync)')) {
      throw new Error(`El bot no logró cargar o responder con los datos guardados. Respuesta: ${executionResult.message}`);
    }

    console.log('\n🎉 ¡AUDITORÍA DE SINCRONIZACIÓN DB Y CARGA DE DATOS EXITOSA! 🎉');
  } catch (error) {
    console.error('❌ Error en auditoría de sincronización:', error);
    process.exit(1);
  }
}

auditFrontendDbSync();
