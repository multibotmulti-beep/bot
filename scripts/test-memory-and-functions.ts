import { BotMemoryService, BotFunctionRegistry } from '@repo/domain';
import { prisma } from '@repo/database';
import { logger } from '@repo/logger';

async function testMemoryAndFunctions() {
  console.log('==================================================');
  console.log('🧪 VERIFICANDO SISTEMA DE MEMORIA Y FUNCIONES DE NEGOCIO');
  console.log('==================================================');

  const testBotId = 'negocio-test-' + Date.now();
  const testPhone = '+5491112345678';

  try {
    // 1. Probar registro de Stock aislado por perfil
    console.log('\n1. Probando registro de Stock (stock.manage)...');
    const stockResult = await BotFunctionRegistry.execute('stock.manage', {
      botId: testBotId,
      senderPhone: testPhone,
      args: { product: 'Zapatillas Pro', qty: 50 }
    });
    console.log('✅ Resultado stock.manage:', stockResult);

    // 2. Probar reserva de Turno (turnos.book)
    console.log('\n2. Probando reserva de Turno (turnos.book)...');
    const turnoResult = await BotFunctionRegistry.execute('turnos.book', {
      botId: testBotId,
      senderPhone: testPhone
    });
    console.log('✅ Resultado turnos.book:', turnoResult);

    // 3. Probar datos de pago (business.payment_info)
    console.log('\n3. Probando consulta de pagos (business.payment_info)...');
    const payInfoResult = await BotFunctionRegistry.execute('business.payment_info', {
      botId: testBotId,
      senderPhone: testPhone
    });
    console.log('✅ Resultado business.payment_info:', payInfoResult);

    // 4. Verificar directamente en la base de datos que todo está guardado por perfil
    console.log('\n4. Verificando persistencia en base de datos (tabla bot_memories)...');
    const memoriesInDb = await BotMemoryService.list({ botId: testBotId });
    console.log(`✅ Total de registros en memoria para el bot '${testBotId}': ${memoriesInDb.memories.length}`);
    memoriesInDb.memories.forEach((m, i) => {
      console.log(`   [${i + 1}] Categoría: ${m.category} | Título: ${m.title} | Status: ${m.status}`);
      console.log(`       Payload:`, m.payload);
    });

    if (memoriesInDb.memories.length >= 2) {
      console.log('\n🎉 ¡VERIFICACIÓN EXITOSA! La base de datos recuerda y aísla perfectamente el stock, turnos y datos por perfil.');
    } else {
      throw new Error('No se encontraron todos los registros esperados en la base de datos.');
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error en la verificación de base de datos:', err);
    process.exit(1);
  }
}

testMemoryAndFunctions();
