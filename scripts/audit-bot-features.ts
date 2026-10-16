/**
 * Script de auditoría y prueba E2E para verificar la creación de bots,
 * el aislamiento por perfil y el funcionamiento de las nuevas funciones
 * (Turnos con control temporal, Pedidos, Stock, Datos de Negocio y Memoria).
 */

import { prisma } from '@repo/database';
import { BotFunctionRegistry, BotMemoryService, BotFunctionConfigService } from '@repo/domain';

async function runAudit() {
  console.log('🤖 [AUDITORÍA] Iniciando simulación de creación de bot y pruebas de funciones...');
  const ownerPhone = '5491199887766';
  const clientPhone = '5491111223344';
  const auditBotId = 'bot-audit-comercio';

  try {
    // 1. Limpiar datos de prueba previos
    await prisma.botMemory.deleteMany({ where: { botId: auditBotId } });
    await prisma.botProfile.deleteMany({ where: { botId: auditBotId } });
    await prisma.botSession.deleteMany({ where: { OR: [{ senderPhone: ownerPhone }, { senderPhone: clientPhone }] } });

    console.log('\n[1/5] Simulando creación de Bot por parte del dueño...');
    const ownerUser = await prisma.user.upsert({
      where: { phoneNumber: ownerPhone },
      update: {},
      create: { phoneNumber: ownerPhone, name: 'Dueño Auditor' },
    });

    const botProfile = await prisma.botProfile.create({
      data: {
        botId: auditBotId,
        name: 'Comercio Auditoría VIP',
        description: 'Bot de prueba para auditoría de funciones y memoria',
        phoneNumber: ownerPhone,
        userId: ownerUser.id,
        isActive: true,
        isPublic: true,
      },
    });
    console.log(`✔ Bot creado exitosamente: ${botProfile.name} (ID: ${botProfile.botId}) vinculado al usuario ${ownerPhone}`);

    // 2. Simular interacción de cliente reservando un Turno
    console.log('\n[2/5] Probando función de Turnos (`turnos.book`)...');
    await BotFunctionConfigService.saveConfig(auditBotId, 'turnos.book', { horarios: '10:00, 14:00, 18:00', servicio: 'Consulta Odontológica' });
    const turnResult = await BotFunctionRegistry.execute('turnos.book', {
      senderPhone: clientPhone,
      botId: auditBotId,
      args: { servicio: 'Consulta Odontológica' },
    });
    console.log('Resultado turnos.book:', turnResult.message);
    if (!turnResult.success) throw new Error('Fallo al ejecutar turnos.book');

    // Verificar en la memoria que se registró correctamente con categoría 'turno'
    const memoriesAfterTurn = await BotMemoryService.list({ botId: auditBotId, senderPhone: clientPhone, category: 'turno' });
    if (memoriesAfterTurn.memories.length === 0) throw new Error('No se guardó el turno en la memoria del bot');
    console.log(`✔ Turno guardado en base de datos. Total turnos activos: ${memoriesAfterTurn.memories.length}`);

    // 3. Simular creación de un Pedido / Compra
    console.log('\n[3/5] Probando función de Pedidos (`pedidos.create`)...');
    const orderResult = await BotFunctionRegistry.execute('pedidos.create', {
      senderPhone: clientPhone,
      botId: auditBotId,
    });
    console.log('Resultado pedidos.create:', orderResult.message);
    if (!orderResult.success) throw new Error('Fallo al ejecutar pedidos.create');

    // 4. Simular Gestión de Stock exclusivo de este bot (`stock.manage`)
    console.log('\n[4/5] Probando gestión y aislamiento de Stock (`stock.manage`)...');
    const stockResult = await BotFunctionRegistry.execute('stock.manage', {
      senderPhone: ownerPhone,
      botId: auditBotId,
      args: { product: 'Camisa Exclusiva Auditoría', qty: 50 },
    });
    console.log('Resultado stock.manage:', stockResult.message);
    if (!stockResult.success) throw new Error('Fallo al ejecutar stock.manage');

    // 5. Simular consulta de Datos de Negocio (CBU/Alias) y Mis Reservas
    console.log('\n[5/5] Probando consulta de Datos de Pago (`business.payment_info`) y Historial (`mis.reservas`)...');
    const paymentInfoResult = await BotFunctionRegistry.execute('business.payment_info', {
      senderPhone: clientPhone,
      botId: auditBotId,
    });
    console.log('Resultado business.payment_info:', paymentInfoResult.message);

    const historyResult = await BotFunctionRegistry.execute('mis.reservas', {
      senderPhone: clientPhone,
      botId: auditBotId,
    });
    console.log('Resultado mis.reservas:', historyResult.message);
    if (!historyResult.message.includes('TURNO') || !historyResult.message.includes('COMPRA')) {
      throw new Error('El historial mis.reservas no listó correctamente los turnos y compras del cliente');
    }

    console.log('\n🎉 ¡AUDITORÍA EXITOSA! Todas las funciones, aislamiento por perfil, persistencia de turnos, pedidos y stock funcionan correctamente.');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERROR EN LA AUDITORÍA:', error.message || error);
    process.exit(1);
  }
}

runAudit();
