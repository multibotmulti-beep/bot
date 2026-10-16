import { MasterBotEngine, BotProfileService } from '@repo/domain';
import { prisma } from '@repo/database';

async function testUserBot() {
  console.log('=== AUDITORÍA E2E DE INTERACCIÓN CON BOT PERSONAL ===');

  const userPhone = '5493765245980';
  const botId = '+543765245980';

  // Asegurar que la sesión apunta al bot activo correcto
  await prisma.botSession.upsert({
    where: { senderPhone: userPhone },
    update: { activeBotId: botId, verified: true },
    create: { senderPhone: userPhone, activeBotId: botId, verified: true }
  });

  const engine = new MasterBotEngine();

  console.log('\n1. Enviando "hola" al bot...');
  const res1 = await engine.processMessage({
    senderPhone: userPhone,
    incomingText: 'hola',
  });
  console.log('Respuesta:', res1.matchedResponse || res1.response || res1);

  console.log('\n2. Enviando opción "1" (Ver Catálogo y Stock)...');
  const res2 = await engine.processMessage({
    senderPhone: userPhone,
    incomingText: '1',
  });
  console.log('Respuesta:', res2.matchedResponse || res2.response || res2);

  console.log('\n=== AUDITORÍA FINALIZADA CON ÉXITO ===');
  process.exit(0);
}

testUserBot().catch((err) => {
  console.error('Error en auditoría:', err);
  process.exit(1);
});
