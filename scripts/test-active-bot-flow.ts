import { BotProfileService, MasterBotEngine, ChatService } from '@repo/domain';
import { prisma } from '@repo/database';
import { logger } from '@repo/logger';

async function runSimulation() {
  console.log('=== INICIANDO SIMULACIÓN E2E DE CUENTA, BOT Y ACTIVACIÓN ===');

  const testPhone = '+5493769999999';
  const clientPhone = '+5491188887777';

  // Limpiar sesiones previas para prueba limpia
  await prisma.botSession.deleteMany({
    where: { senderPhone: { in: [testPhone, clientPhone] } }
  });
  await prisma.chatMessage.deleteMany({
    where: { senderPhone: { in: [testPhone, clientPhone] } }
  });

  // 1. Crear cuenta y bot
  console.log('1. Creando cuenta y perfil de bot...');
  const botProfile = await BotProfileService.createProfile({
    phoneNumber: testPhone,
    name: 'Bot de Prueba E2E',
    description: 'Bot creado automáticamente para pruebas end-to-end',
    type: 'custom',
    isPublic: true,
    isActive: false, // Inicialmente inactivo para probar activación
    welcomeMessage: '¡Hola! Bienvenido al Bot de Prueba E2E. Selecciona una opción:',
    menuOptions: [
      { option: '1', label: 'Consultar Estado' },
      { option: '2', label: 'Hablar con Asesor' }
    ]
  });

  console.log(`Bot creado exitosamente con ID: ${botProfile.botId}`);

  // 2. Activar el bot (lo cual desactiva otros y actualiza la sesión)
  console.log('2. Activando el bot...');
  const activated = await BotProfileService.activateProfile(botProfile.id);
  console.log(`Bot activado: ${activated.name} (isActive: ${activated.isActive})`);

  // 3. Simular interacción de un cliente hablando al bot activo
  console.log('3. Simulando mensaje entrante del cliente al bot activo...');
  const engine = new MasterBotEngine();

  const res1 = await engine.processMessage({
    senderPhone: clientPhone,
    incomingText: 'hola',
  });
  console.log('Respuesta del bot a "hola":', res1);

  // Simular envío de opción '1'
  const res2 = await engine.processMessage({
    senderPhone: clientPhone,
    incomingText: '1',
  });
  console.log('Respuesta del bot a "1":', res2);

  // 4. Verificar chats en la base de datos
  console.log('4. Verificando historial de chat guardado...');
  const chats = await ChatService.getConversations(testPhone, botProfile.botId);
  console.log('Conversaciones encontradas para el bot activo:', chats);

  const messages = await ChatService.getMessagesByPhone(clientPhone);
  console.log('Mensajes en la conversación:', messages);

  console.log('=== SIMULACIÓN E2E COMPLETADA CON ÉXITO ===');
  process.exit(0);
}

runSimulation().catch((err) => {
  console.error('Error en simulación E2E:', err);
  process.exit(1);
});
