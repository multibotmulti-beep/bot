import { BotProfileService, MasterBotEngine, ChatService } from '@repo/domain';
import { prisma } from '@repo/database';
import { logger } from '@repo/logger';

async function runAudit() {
  console.log('=== INICIANDO AUDITORÍA RIGUROSA DE AISLAMIENTO Y PERFILES ===');

  const ownerPhone = '+5493765111111';
  const strangerPhone = '+5491188887777';

  // Limpieza inicial y siembra de admin
  await prisma.botSession.deleteMany({
    where: { senderPhone: { in: [ownerPhone, strangerPhone] } }
  });
  await prisma.chatMessage.deleteMany({
    where: { senderPhone: { in: [ownerPhone, strangerPhone] } }
  });
  await BotProfileService.seedDemoProfiles();

  // 1. Crear Bot personalizado para el dueño
  console.log('1. Creando Bot personalizado para el dueño...');
  const profile = await BotProfileService.createProfile({
    phoneNumber: ownerPhone,
    name: 'Pizzería Don Carlos Bot',
    description: 'Bot de pizzas y empanadas',
    type: 'custom',
    isPublic: true,
    isActive: true,
    welcomeMessage: '🍕 ¡Bienvenido a Pizzería Don Carlos! Elige una opción:',
    menuOptions: [
      { option: '1', label: 'Ver Pizzas' },
      { option: '2', label: 'Ver Empanadas' }
    ]
  });

  const engine = new MasterBotEngine();

  // 2. Verificar que un usuario extraño (sin bot creado) recibe el menú de Admin / Control Center
  console.log('2. Probando usuario extraño sin bot...');
  const strangerRes = await engine.processMessage({
    senderPhone: strangerPhone,
    incomingText: 'hola',
  });
  console.log('Respuesta extraño:', strangerRes.matchedResponse?.substring(0, 50));

  if (!strangerRes.matchedResponse || !strangerRes.matchedResponse.includes('Bot Oficial')) {
    throw new Error('AUDITORÍA FALLIDA: Un usuario sin bot no fue atendido por el Bot Admin.');
  }

  // 3. Verificar que el dueño (con bot creado y activo) recibe el menú de su propia Pizzería
  console.log('3. Probando dueño con su propio bot activo...');
  const ownerRes = await engine.processMessage({
    senderPhone: ownerPhone,
    incomingText: 'hola',
  });
  console.log('Respuesta dueño:', ownerRes.matchedResponse);

  if (!ownerRes.matchedResponse || !ownerRes.matchedResponse.includes('Pizzería Don Carlos')) {
    throw new Error('AUDITORÍA FALLIDA: El dueño no fue atendido por su propio bot personalizado.');
  }

  console.log('=== ¡AUDITORÍA RIGUROSA DE AISLAMIENTO Y PERFILES EXITOSA! ===');
  process.exit(0);
}

runAudit().catch((err) => {
  console.error('Error en auditoría:', err);
  process.exit(1);
});
