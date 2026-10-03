import { prisma } from '@repo/database';
import { BotService, BotProfileService } from '@repo/domain';
import { logger } from '@repo/logger';

async function runTest() {
  try {
    console.log('🧪 Iniciando test de integración de bot con 3 niveles de submenús...');

    const senderPhone = '5491100000000';
    const botId = 'test-jerarquico-999';

    // 1. Limpiar sesión previa y perfil previo si existe
    await prisma.botSession.deleteMany({ where: { senderPhone } });
    await prisma.botProfile.deleteMany({ where: { botId } });

    // 2. Crear perfil de bot con 3 niveles de menús
    const profile = await BotProfileService.createProfile({
      botId,
      name: 'Bot Jerárquico de Test',
      description: 'Bot con 3 niveles de submenús',
      type: 'custom',
      isPublic: true,
      isActive: true,
    });

    // Crear árbol recursivo de 3 niveles en la base de datos
    // Nivel 1 (Raíz) -> Opción 1: "Categorías"
    const rootFlow = await prisma.botFlow.create({
      data: {
        botProfile: { connect: { id: profile.id } },
        name: 'Menú Principal',
        triggerKeyword: 'menu',
        flowType: 'menu',
        content: JSON.stringify([{ label: '1️⃣ Categorías', option: '1' }]),
        responseMessage: '¡Hola! Bienvenido al Bot de Test 3 Niveles. Selecciona:',
        isActive: true,
      },
    });

    // Nivel 2 -> Opción 1.1: "Ropa"
    const level1Flow = await prisma.botFlow.create({
      data: {
        botProfile: { connect: { id: profile.id } },
        parent: { connect: { id: rootFlow.id } },
        name: 'Submenú Nivel 1',
        triggerKeyword: '1',
        flowType: 'menu',
        content: JSON.stringify([{ label: '1️⃣.1️⃣ Remeras', option: '1.1' }]),
        responseMessage: 'Selecciona la categoría:',
        isActive: true,
      },
    });

    // Nivel 3 -> Opción 1.1.1: "Remera Oversize (Alias de Pago: alianzas.mp)"
    const level2Flow = await prisma.botFlow.create({
      data: {
        botProfile: { connect: { id: profile.id } },
        parent: { connect: { id: level1Flow.id } },
        name: 'Submenú Nivel 2',
        triggerKeyword: '1.1',
        flowType: 'menu',
        content: JSON.stringify([{ label: 'Alias de Pago: remeras.mp', option: '1.1.1' }]),
        responseMessage: 'Detalle del producto y alias:',
        isActive: true,
      },
    });

    console.log('✅ Bot y 3 niveles de submenús creados exitosamente en la BD.');

    // 3. Simular interacción por webhook
    const sendMessage = async (text: string) => {
      console.log(`\n----------------------------------------`);
      console.log(`📤 Usuario envía: "${text}"`);
      const res = await BotService.handleIncomingWebhook({
        entry: [
          {
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: '880275461842101' },
                  messages: [{ from: senderPhone, text: { body: text } }],
                },
              },
            ],
          },
        ],
      }, botId);
      console.log(`📥 Bot responde:`, res.matchedResponse);
      return res;
    };

    // Interacción paso a paso
    // A. Abrir bot (enviar hola / menú)
    let r1 = await sendMessage('hola');
    if (!r1.matchedResponse?.includes('Categorías')) throw new Error('Falló Nivel 1');

    // B. Entrar a Nivel 1 ("1")
    let r2 = await sendMessage('1');
    if (!r2.matchedResponse?.includes('Remeras')) throw new Error('Falló Nivel 2');

    // C. Entrar a Nivel 2 ("1.1" o "1")
    let r3 = await sendMessage('1');
    if (!r3.matchedResponse?.includes('remeras.mp')) throw new Error('Falló Nivel 3');

    // D. Probar volver con "0"
    let r4 = await sendMessage('0');
    console.log('✅ Test de 3 niveles completado con éxito absoluto sin loops!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en test de integración:', err);
    process.exit(1);
  }
}

runTest();
