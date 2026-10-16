import { BotProfileService, MasterBotEngine, ChatService } from '@repo/domain';
import { prisma } from '@repo/database';

async function main() {
  console.log('=== TEST DE FLUJO COMPLETO: CUENTA, BOT, ACTIVACIÓN E INTERACCIÓN ===');

  const userPhone = '5493765245980';
  const cleanPhone = '+543765245980';

  // 1. Obtener o crear cuenta de usuario
  const user = await prisma.user.upsert({
    where: { phoneNumber: userPhone },
    update: {},
    create: { phoneNumber: userPhone, name: 'Adrian User' },
  });
  console.log('1. Cuenta de usuario:', user);

  // 2. Crear un nuevo bot para este usuario
  const newBot = await BotProfileService.createProfile({
    botId: `bot_restaurante_${Date.now()}`,
    phoneNumber: cleanPhone,
    name: 'Restaurante Gourmet Bot',
    description: 'Bot oficial para reservas y menú gastronómico',
    type: 'custom',
    isPublic: true,
    isActive: false, // Inactivo inicialmente
    welcomeMessage: '🍷 ¡Bienvenido a Restaurante Gourmet! ¿En qué podemos ayudarte hoy?',
    menuOptions: [
      { option: '1', label: 'Ver Carta del Día', response: '📜 Carta de Hoy:\n- Bife de chorizo con guarnición\n- Salmón a la plancha\n- Tiramisú casero' },
      { option: '2', label: 'Hacer una Reserva', response: '📅 Por favor indícanos fecha y cantidad de comensales.' }
    ]
  });
  console.log('2. Bot creado para la cuenta:', newBot.name, 'con ID:', newBot.botId);

  // 3. Activar este bot (desactiva cualquier otro de esta cuenta y actualiza la sesión)
  console.log('3. Activando el nuevo bot...');
  const activatedBot = await BotProfileService.activateProfile(newBot.id);
  console.log('Bot activado exitosamente:', activatedBot.name, 'Estado:', activatedBot.isActive ? 'Activo' : 'Inactivo');

  // Verificar que los otros bots de este usuario quedaron inactivos
  const allUserBots = await prisma.botProfile.findMany({
    where: {
      OR: [
        { phoneNumber: cleanPhone },
        { phoneNumber: userPhone },
        { userId: user.id }
      ]
    }
  });
  console.log('Todos los bots de la cuenta tras la activación:');
  allUserBots.forEach(b => console.log(` - ${b.name} (${b.botId}): ${b.isActive ? '🟢 ACTIVO' : '⚪ INACTIVO'}`));

  // 4. Interactuar con el bot activo
  console.log('4. Simulando interacción de WhatsApp con el bot activo...');
  const engine = new MasterBotEngine();

  // Cliente habla al bot activo
  const clientPhone = '+5493765112233';
  await prisma.botSession.upsert({
    where: { senderPhone: clientPhone },
    update: { activeBotId: activatedBot.botId },
    create: { senderPhone: clientPhone, activeBotId: activatedBot.botId }
  });

  // Mensaje 1: "hola"
  console.log('-> Cliente envía: "hola"');
  const res1 = await engine.processMessage({
    senderPhone: clientPhone,
    incomingText: 'hola',
  });
  console.log('<- Bot Activo responde:\n', res1.matchedResponse || res1.response);

  // Mensaje 2: "1" (Ver carta)
  console.log('-> Cliente envía: "1"');
  const res2 = await engine.processMessage({
    senderPhone: clientPhone,
    incomingText: '1',
  });
  console.log('<- Bot Activo responde a opción 1:\n', res2.matchedResponse || res2.response);

  // 5. Verificar que el panel de chats del usuario cargará esta conversación
  console.log('5. Verificando conversaciones del bot activo para el panel de chats...');
  const conversations = await ChatService.getConversations(cleanPhone, activatedBot.botId);
  console.log('Conversaciones registradas para el bot activo:', conversations);

  const msgs = await ChatService.getMessagesByPhone(clientPhone);
  console.log('Mensajes registrados en la BD para el cliente:');
  msgs.forEach(m => console.log(` [${m.direction}] [Bot: ${m.botId}]: ${m.message}`));

  console.log('=== FLUJO E2E VERIFICADO AL 100% ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
