import { prisma } from '@repo/database';
import { MasterBotEngine, BotProfileService } from '@repo/domain';
import { logger } from '@repo/logger';

async function runComprehensiveAudit() {
  try {
    console.log('🧪 === INICIANDO AUDITORÍA COMPREHENSIVE DEL FLUJO DE BOTS ===');

    const phoneWithoutBot = '5491199999999';
    const phoneWithBotA = '5491177777771';
    const phoneWithBotB = '5491177777772';

    // 1. Limpiar datos previos de prueba
    await prisma.botSession.deleteMany({
      where: {
        senderPhone: { in: [phoneWithoutBot, phoneWithBotA, phoneWithBotB] }
      }
    });
    await prisma.botProfile.deleteMany({
      where: {
        phoneNumber: { in: [phoneWithBotA, phoneWithBotB] }
      }
    });

    const masterEngine = new MasterBotEngine();

    // ==========================================
    // PRUEBA 1: Número sin bot activo
    // ==========================================
    console.log('\n--- PRUEBA 1: Número sin bot activo ---');
    const resNoBot = await masterEngine.processMessage({
      senderPhone: phoneWithoutBot,
      incomingText: 'hola',
      phoneNumberId: '880275461842101',
    });
    console.log('Respuesta recibida:', resNoBot.response);
    if (!resNoBot.response?.includes('no posee bot activo')) {
      throw new Error(`Falló Prueba 1: Se esperaba mensaje de número sin bot activo. Recibido: ${resNoBot.response}`);
    }
    console.log('✅ Prueba 1 EXITOSA: El número sin bot respondió correctamente ("Este número no posee bot activo").');

    // ==========================================
    // PRUEBA 2: Crear Bot Alpha para teléfono A y Bot Beta para teléfono B
    // ==========================================
    console.log('\n--- PRUEBA 2: Creación de Bot Alpha y Bot Beta ---');
    const profileA = await BotProfileService.createProfile({
      phoneNumber: phoneWithBotA,
      name: 'Pizzería Alpha',
      description: 'Bot de Pizzería',
      type: 'custom',
      isPublic: true,
      isActive: true,
    });

    // Crear menú raíz para Bot Alpha
    await prisma.botFlow.create({
      data: {
        botProfile: { connect: { id: profileA.id } },
        name: 'Menú Pizzería Alpha',
        triggerKeyword: 'menu',
        flowType: 'menu',
        content: JSON.stringify([
          { label: '1. Ver Pizzas', option: '1' },
          { label: '2. Ver Bebidas', option: '2' }
        ]),
        responseMessage: '🍕 ¡Bienvenido a Pizzería Alpha! Elige una opción:',
        isActive: true,
      },
    });

    const profileB = await BotProfileService.createProfile({
      phoneNumber: phoneWithBotB,
      name: 'Cafetería Beta',
      description: 'Bot de Cafetería',
      type: 'custom',
      isPublic: true,
      isActive: true,
    });

    // Crear menú raíz para Bot Beta
    await prisma.botFlow.create({
      data: {
        botProfile: { connect: { id: profileB.id } },
        name: 'Menú Cafetería Beta',
        triggerKeyword: 'menu',
        flowType: 'menu',
        content: JSON.stringify([
          { label: '1. Café Espresso', option: '1' },
          { label: '2. Medialunas', option: '2' }
        ]),
        responseMessage: '☕ ¡Bienvenido a Cafetería Beta! Elige una opción:',
        isActive: true,
      },
    });
    console.log('✅ Bot Alpha y Bot Beta creados exitosamente con sus menús.');

    // ==========================================
    // PRUEBA 3: Llamar / Interactuar con Bot Alpha (que tiene menú activo)
    // ==========================================
    console.log('\n--- PRUEBA 3: Interactuar con Bot Alpha (menú activo) ---');
    const resBotA = await masterEngine.processMessage({
      senderPhone: phoneWithBotA,
      incomingText: 'hola',
      phoneNumberId: '880275461842101',
    });
    console.log('Respuesta Bot Alpha:', resBotA.matchedResponse || resBotA.response);
    if (!resBotA.matchedResponse?.includes('Pizzería Alpha') && !resBotA.response?.includes('Pizzería Alpha')) {
      throw new Error('Falló Prueba 3: El bot con menú activo no respondió correctamente.');
    }
    console.log('✅ Prueba 3 EXITOSA: Bot Alpha con menú activo respondió correctamente.');

    // ==========================================
    // PRUEBA 4: Salir del bot (enviar "0")
    // ==========================================
    console.log('\n--- PRUEBA 4: Salir del Bot Alpha (enviar "0") ---');
    const resExit = await masterEngine.processMessage({
      senderPhone: phoneWithBotA,
      incomingText: '0',
      phoneNumberId: '880275461842101',
    });
    console.log('Respuesta de salida:', resExit.response);
    if (!resExit.response?.includes('Regresando')) {
      throw new Error('Falló Prueba 4: No se procesó la salida correctamente.');
    }
    console.log('✅ Prueba 4 EXITOSA: Salida del bot ejecutada correctamente.');

    // ==========================================
    // PRUEBA 5: Llamar a Bot Beta desde su número correspondiente
    // ==========================================
    console.log('\n--- PRUEBA 5: Llamar a Bot Beta ---');
    const resBotB = await masterEngine.processMessage({
      senderPhone: phoneWithBotB,
      incomingText: 'hola',
      phoneNumberId: '880275461842101',
    });
    console.log('Respuesta Bot Beta:', resBotB.matchedResponse || resBotB.response);
    if (!resBotB.matchedResponse?.includes('Cafetería Beta') && !resBotB.response?.includes('Cafetería Beta')) {
      throw new Error('Falló Prueba 5: El Bot Beta no respondió correctamente.');
    }
    console.log('✅ Prueba 5 EXITOSA: Bot Beta llamado y activo correctamente.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE AUDITORÍA FUERON EXITOSAS! 🎉');
  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
    process.exit(1);
  }
}

runComprehensiveAudit();
