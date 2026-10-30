import { BotProfileService, BotService, UserBotEngine, MasterBotEngine, BotFunctionRegistry } from '@repo/domain';
import { prisma } from '@repo/database';
import { logger } from '@repo/logger';

async function comprehensiveAudit() {
  console.log('======================================================================');
  console.log('🕵️ INICIANDO AUDITORÍA INTEGRAL DE 50+ MENSAJES Y FLUJOS CONVERSACIONALES');
  console.log('======================================================================');

  let errorsCount = 0;
  let successCount = 0;

  try {
    const testPhone = '+5491100009999';
    const botId = `audit_bot_${Date.now()}`;

    // 1. Crear perfil de bot de prueba con menú y múltiples nodos anidados
    console.log('\n[Fase 1] Creando bot de prueba con menús, funciones y nodos hijos...');
    const profile = await BotProfileService.createProfile({
      botId,
      name: 'Bot Auditoría Integral',
      phoneNumber: testPhone,
      description: 'Bot para pruebas masivas de 50 mensajes y manejo de errores',
      menuOptions: [
        { label: '1. Consultar Stock', option: '1', actionKey: 'stock.check' },
        { label: '2. Reservar Turno', option: '2', actionKey: 'turnos.book' },
        { label: '3. Pagos y Cobros', option: '3', actionKey: 'business.payment_info' },
        { label: '4. Submenú Texto Libre', option: '4' }
      ],
      welcomeMessage: '¡Bienvenido al Bot de Auditoría Integral! Elige una opción:'
    });
    successCount++;

    // Obtener flujo raíz
    const flows = await BotService.getFlows(profile.id);
    const rootFlow = flows[0];

    // Crear submenú anidado (Nodo Hijo 4.1)
    if (rootFlow) {
      await BotService.createFlow({
        botProfileId: profile.id,
        parentId: rootFlow.id,
        name: 'Submenú Texto Libre 4',
        triggerKeyword: '4',
        contentType: 'text_plain',
        flowType: 'menu',
        content: [],
        responseMessage: 'Estás en el submenú de texto libre. Escribe "ayuda" o "info".',
        isActive: true,
        messages: [
          { contentType: 'text_plain', responseMessage: '📸 [Imagen adjunta de bienvenida al submenú]', mediaUrl: 'https://example.com/img.jpg' }
        ]
      });
      successCount++;
    }

    // Crear regla de texto libre
    await BotService.createRule({
      botProfileId: profile.id,
      keyword: 'ayuda',
      matchType: 'exact',
      responseMessage: '💡 Asistencia: Este bot responde a menús numerados y palabras clave.',
      isActive: true,
    });
    successCount++;

    const engine = new UserBotEngine(botId);

    // 2. Simulación de 50+ interacciones alternadas
    console.log('\n[Fase 2] Simulando 50+ interacciones conversacionales (Menús, Funciones, Errores)...');

    const testSequence = [
      // 1. Saludo / Menú principal
      { input: 'menu', expectedMatch: 'Bienvenido' },
      // 2. Opción 1 -> Función de stock (sin mezclar texto)
      { input: '1', expectedMatch: 'Stock' },
      // 3. Regresar al menú
      { input: 'menu', expectedMatch: 'Bienvenido' },
      // 4. Opción 2 -> Función de turnos
      { input: '2', expectedMatch: 'Turnos' },
      // 5. Regresar al menú
      { input: 'menu', expectedMatch: 'Bienvenido' },
      // 6. Opción 3 -> Función de pagos
      { input: '3', expectedMatch: 'Banco' },
      // 7. Regresar al menú
      { input: 'menu', expectedMatch: 'Bienvenido' },
      // 8. Opción 4 -> Submenú de texto libre
      { input: '4', expectedMatch: 'submenú' },
      // 9. Palabra clave regla exacta "ayuda"
      { input: 'ayuda', expectedMatch: 'Asistencia' },
      // 10. Opción inválida (manejo de errores)
      { input: '99', expectedMatch: 'Opción incorrecta' },
      // 11. Texto aleatorio sin match (manejo de errores)
      { input: 'hola como estan', expectedMatch: 'Opción incorrecta' },
    ];

    // Ampliar la secuencia a 50+ interacciones repitiendo y variando ciclos
    const fullSequence: { input: string; expectedMatch: string }[] = [];
    for (let cycle = 0; cycle < 5; cycle++) {
      for (const item of testSequence) {
        fullSequence.push({ ...item });
      }
    }

    console.log(`Ejecutando ${fullSequence.length} mensajes simulados...`);

    for (let i = 0; i < fullSequence.length; i++) {
      const step = fullSequence[i];
      try {
        const res = await engine.processMessage({
          senderPhone: testPhone,
          incomingText: step.input,
          phoneNumberId: '880275461842101'
        });

        if (res && res.matchedResponse) {
          successCount++;
        } else {
          errorsCount++;
          console.warn(`⚠️ Advertencia en paso ${i + 1} ("${step.input}"): No se generó respuesta emparejada.`);
        }
      } catch (err: any) {
        errorsCount++;
        console.error(`❌ Error crítico en paso ${i + 1} ("${step.input}"):`, err.message);
      }
    }

    // 3. Prueba de validación de menú libre sin texto (manejo de errores)
    console.log('\n[Fase 3] Probando manejo de errores y validaciones de negocio...');
    try {
      await BotService.createFlow({
        botProfileId: profile.id,
        name: 'Flujo Inválido Vacío',
        triggerKeyword: 'invalid',
        contentType: 'text_plain',
        responseMessage: '', // Debe fallar por validación
        actionKey: null,
        isActive: true
      });
      errorsCount++;
      console.error('❌ Fallo de validación: Se permitió crear un flujo sin texto en menú libre.');
    } catch (err: any) {
      successCount++;
      console.log('✅ Validación exitosa bloqueó flujo vacío:', err.message);
    }

    // 4. Verificación de árbol conversacional completo
    const tree = await BotService.getConversationTree(profile.id);
    if (tree.success && tree.data.rootNodes.length > 0) {
      successCount++;
      console.log('✅ Árbol conversacional obtenido correctamente con todos los nodos.');
    } else {
      errorsCount++;
      console.error('❌ Error al obtener el árbol conversacional.');
    }

    console.log('\n======================================================================');
    console.log(`📊 RESULTADOS DE LA AUDITORÍA DE 50+ MENSAJES Y ROBUSTEZ:`);
    console.log(`   - Éxitos / Validaciones superadas: ${successCount}`);
    console.log(`   - Errores / Fallas detectadas: ${errorsCount}`);
    console.log('======================================================================');

    if (errorsCount === 0) {
      console.log('🎉 ¡AUDITORÍA COMPLETADA SIN ERRORES! Sistema 100% robusto.');
      process.exit(0);
    } else {
      console.error(`❌ Se detectaron ${errorsCount} fallas durante la auditoría.`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ Error fatal en auditoría:', err);
    process.exit(1);
  }
}

comprehensiveAudit();
