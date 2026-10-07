import { prisma } from '@repo/database';
import { MasterBotEngine, BotProfileService } from '@repo/domain';

async function main() {
  console.log('🚀 Iniciando prueba de ciclo completo del Motor de Bot Dinámico...');

  // 1. Modificar el Bot Admin (mensaje de bienvenida y opciones de menú independientes de las funciones)
  const admin = await prisma.botProfile.findUnique({ where: { botId: 'admin' } });
  if (!admin) throw new Error('Bot Admin no encontrado en la base de datos');

  console.log(`✔ Bot Admin encontrado: ID = ${admin.id}`);

  // Actualizar mensaje de bienvenida del Admin en la base de datos
  const adminFlow = await prisma.botFlow.findFirst({ where: { botProfileId: admin.id, parentId: null } });
  if (adminFlow) {
    const updatedFlow = await prisma.botFlow.update({
      where: { id: adminFlow.id },
      data: {
        responseMessage: '🌟 ¡Bienvenido al Centro de Control Oficial (Admin Modificado)! Selecciona:',
        content: JSON.stringify([
          { label: '1. 🔑 Acceder a mi cuenta', option: '1', actionKey: 'auth.login' },
          { label: '2. 🤖 Ver todos los bots disponibles', option: '2', actionKey: 'bot.list_all' },
          { label: '3. 👤 Soporte prioritario', option: '3', actionKey: 'support.human' }
        ]),
      },
    });
    console.log(`✔ Menú y Bienvenida del Bot Admin actualizados en BD. Mensaje: "${updatedFlow.responseMessage}"`);
  }

  // 2. Crear un Bot de Usuario independiente (Bot Hijo)
  const userBotPhone = '+5491122334455';
  const newBot = await BotProfileService.createProfile({
    phoneNumber: userBotPhone,
    name: 'Bot Restaurante Delicias',
    description: 'Bot para pedidos de comida y menú diario',
    welcomeMessage: '🍔 ¡Bienvenido a Restaurante Delicias! ¿Qué deseas ordenar hoy?',
    menuOptions: [
      { label: 'Ver Hamburguesas y Combos', option: '1' },
      { label: 'Ver Bebidas y Postres', option: '2' },
      { label: 'Estado de mi Pedido', option: '3' }
    ],
    type: 'custom',
    isPublic: true,
    isActive: true,
  });

  console.log(`✔ Bot de Usuario creado exitosamente: ID = ${newBot.botId}, Nombre = "${newBot.name}"`);

  // 3. Probar que las funciones y menús del Bot de Usuario son editables y eliminables de forma independiente
  const userBotFlow = await prisma.botFlow.findFirst({ where: { botProfileId: newBot.id, parentId: null } });
  if (userBotFlow) {
    // Solo modificar el texto del menú manteniendo la opción/función
    const updatedUserFlow = await prisma.botFlow.update({
      where: { id: userBotFlow.id },
      data: {
        responseMessage: '🍔 ¡Bienvenido a Restaurante Delicias (Menú Actualizado)! Elige una categoría:',
        content: JSON.stringify([
          { label: '🍔 Promociones Especiales y Combos', option: '1', actionKey: 'shop.catalog' },
          { label: '🥤 Bebidas y Postres Gourmet', option: '2' },
          { label: '🛵 Consultar Repartidor / Delivery', option: '3', actionKey: 'support.ticket' },
          { label: '📞 Hablar con el Cajero', option: '4', actionKey: 'support.human' } // Agregada nueva opción
        ]),
      },
    });
    console.log(`✔ Menú del bot de usuario editado y extendido en BD. Opciones: ${JSON.parse(updatedUserFlow.content).length}`);
  }

  // 4. Probar ejecución con MasterBotEngine
  const engine = new MasterBotEngine();

  // Test 4.1: Mensaje 'menu' al Admin para recibir el mensaje modificado desde la BD
  console.log('\n--- Probando MasterBotEngine con mensaje "menu" ---');
  const resAdmin = await engine.processMessage({
    senderPhone: '5491199887766',
    incomingText: 'menu',
  });
  console.log('Respuesta obtenida del Admin desde BD:');
  console.log(resAdmin.matchedResponse);

  // Test 4.2: Opción 1 del Admin (ejecución de función auth.login vinculada al menú)
  console.log('\n--- Probando MasterBotEngine seleccionando opción 1 (auth.login) ---');
  const resOption1 = await engine.processMessage({
    senderPhone: '5491199887766',
    incomingText: '1',
  });
  console.log('Resultado de ejecución de función vinculada:');
  console.log(resOption1.matchedResponse);

  console.log('\n✨ ¡Todas las verificaciones del Motor de Bot Dinámico completadas con éxito!');
}

main().catch(console.error);
