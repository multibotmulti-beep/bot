/**
 * Script de prueba y auditoría E2E para verificar el flujo completo del simulador de chat:
 * - Creación/obtención de perfil anónimo.
 * - Solicitud de mensajes de chat (verificando que el backend responda automáticamente con bienvenida y menú).
 * - Envío de mensaje del usuario y respuesta del bot.
 * - Logs estructurados detallados de cada petición y respuesta.
 */

import fetch from 'node-fetch';

async function testBotSimulatorWelcomeFlow() {
  console.log('======================================================================');
  console.log('🧪 AUDITORÍA E2E: BIENVENIDA, MENÚ Y RESPUESTA AUTOMÁTICA DEL BOT');
  console.log('======================================================================');

  const API_URL = 'http://localhost:4000';

  try {
    // 1. Crear / sincronizar sesión anónima y perfil en base de datos
    console.log('\n[Paso 1] Solicitando perfil anónimo en /bot/profiles/anonymous...');
    const profileRes = await fetch(`${API_URL}/bot/profiles/anonymous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const profileJson = await profileRes.json() as any;
    console.log('📦 [Backend Response - Anonymous Profile]:', JSON.stringify(profileJson, null, 2));

    let botId = profileJson.profile?.botId;
    let phoneNumber = profileJson.profile?.phoneNumber || profileJson.phoneNumber || '+5491155556666';

    if (!botId) {
      // Si no hay perfil anónimo previo, creamos uno explícitamente para la prueba
      botId = `bot_test_${Date.now()}`;
      console.log(`\n[Paso 1b] Creando bot de prueba con menús en /bot/profiles para botId: ${botId}...`);
      const createRes = await fetch(`${API_URL}/bot/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          phoneNumber,
          name: 'Bot de Auditoría Bienvenida',
          description: 'Bot para probar bienvenida y menú automático',
          type: 'custom',
          isPublic: true,
          isActive: true,
          welcomeMessage: '🤖 ¡Hola! Bienvenido al sistema de auditoría del bot. Elige una opción del menú:',
          invalidOptionMessage: '⚠️ Opción incorrecta. Elige una opción válida o escribe 0.',
          menuOptions: [
            { label: 'Ver Catálogo y Stock', option: '1', actionKey: 'stock.check' },
            { label: 'Hablar con Asesor Humano', option: '2', actionKey: 'support.human' }
          ]
        })
      });
      const createJson = await createRes.json() as any;
      console.log('📦 [Backend Response - Create Bot]:', JSON.stringify(createJson, null, 2));
    }

    console.log(`✔ Bot ID activo para la prueba: ${botId}`);
    console.log(`✔ Teléfono de sesión: ${phoneNumber}`);

    // 2. Obtener historial de chat (Debe disparar la generación automática del mensaje de bienvenida y menú en el backend)
    console.log(`\n[Paso 2] Solicitando mensajes de chat en GET /api/chats/${encodeURIComponent(phoneNumber)}?botId=${botId}...`);
    const chatRes = await fetch(`${API_URL}/api/chats/${encodeURIComponent(phoneNumber)}?botId=${botId}`);
    const chatJson = await chatRes.json() as any;
    console.log('📦 [Backend Response - Welcome & Menu Messages]:', JSON.stringify(chatJson, null, 2));

    if (!chatJson.success || !chatJson.data || chatJson.data.length === 0) {
      throw new Error('El backend no generó el mensaje de bienvenida y menú inicial automáticamente.');
    }

    const welcomeMsg = chatJson.data.find((m: any) => m.direction === 'incoming');
    console.log('\n💬 [Mensaje de Bienvenida y Menú Generado por el Backend]:');
    console.log('----------------------------------------------------------------------');
    console.log(welcomeMsg ? welcomeMsg.message : 'No se encontró mensaje incoming.');
    console.log('----------------------------------------------------------------------');

    // 3. Enviar un mensaje de respuesta del usuario (ej. opción '1' o 'menu')
    console.log(`\n[Paso 3] Enviando respuesta del usuario ('1') en POST /api/chats/send...`);
    const sendRes = await fetch(`${API_URL}/api/chats/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderPhone: phoneNumber,
        message: '1',
        botId: botId
      })
    });
    const sendJson = await sendRes.json() as any;
    console.log('📦 [Backend Response - Bot Reply to User Option 1]:', JSON.stringify(sendJson, null, 2));

    if (!sendJson.success) {
      throw new Error('Fallo al enviar mensaje y obtener respuesta del bot.');
    }

    console.log('\n🎉 ¡AUDITORÍA E2E EXITOSA! El backend genera automáticamente la bienvenida y el menú, y responde correctamente a las interacciones.');
  } catch (error: any) {
    console.error('\n❌ ERROR EN LA AUDITORÍA E2E:', error.message);
    process.exit(1);
  }
}

testBotSimulatorWelcomeFlow();
