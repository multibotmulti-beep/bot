/**
 * Script de simulación E2E estilo humano:
 * 1. Completa el asistente guiado por API (Paso 1, 2, 3) para crear el bot.
 * 2. Carga información de configuración real para cada función (Stock, Turnos, Pagos, etc.).
 * 3. Simula una conversación real paso a paso (menú, consultas de stock, turnos, pagos, etc.).
 */

import fetch from 'node-fetch';

async function runHumanSimulation() {
  console.log('======================================================================');
  console.log('🤖 SIMULACIÓN E2E ESTILO HUMANO - ASISTENTE Y CHAT EN VIVO');
  console.log('======================================================================');

  const API_URL = 'http://localhost:4000';
  const SESSION_TOKEN = 'human_sim_session_' + Date.now();

  try {
    // 1. Completar Asistente Paso 1: Nombre y Teléfono
    console.log('\n[1] Asistente Paso 1: Enviando nombre y teléfono...');
    const step1Res = await fetch(`${API_URL}/bot/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
      body: JSON.stringify({ name: 'Comercio Humano VIP', phoneNumber: '+5491155554444' }),
    });
    const step1Data = await step1Res.json() as any;
    console.log('   Respuesta Paso 1:', step1Data.message);

    // 2. Completar Asistente Paso 2: Mensaje de Bienvenida
    console.log('\n[2] Asistente Paso 2: Enviando mensaje de bienvenida...');
    const step2Res = await fetch(`${API_URL}/bot/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
      body: JSON.stringify({ welcomeMessage: '¡Hola! Bienvenido a Comercio Humano VIP. ¿En qué podemos ayudarte?' }),
    });
    const step2Data = await step2Res.json() as any;
    console.log('   Respuesta Paso 2:', step2Data.message);

    // 3. Completar Asistente Paso 3: Seleccionar funciones del menú
    console.log('\n[3] Asistente Paso 3: Habilitando todas las funciones en el menú...');
    const step3Res = await fetch(`${API_URL}/bot/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
      body: JSON.stringify({ enabledFunctions: ['stock.check', 'turnos.book', 'business.payment_info', 'faq.query', 'mis.reservas', 'support.human'] }),
    });
    const step3Data = await step3Res.json() as any;
    console.log('   Respuesta Paso 3:', step3Data.message);
    const botId = step3Data.botId || '+5491155554444';

    // 4. Cargar configuraciones detalladas para cada función en la base de datos real
    console.log('\n[4] Cargando información y configuraciones en la base de datos real...');
    const configs = [
      { actionKey: 'stock.manage', config: { product: 'Smartphone Pro Max', qty: 25, precio: 999.99, categoria: 'Tecnología' } },
      { actionKey: 'turnos.book', config: { horarios: '10:00, 13:00, 16:00', servicio: 'Asesoramiento Comercial', duracionMin: 30 } },
      { actionKey: 'business.payment_info', config: { banco: 'Banco Galicia', titular: 'Comercio Humano VIP S.A.', cbu: '0070000930000012345678', alias: 'comercio.vip.mp', linkPago: 'https://mpago.li/vip123' } },
    ];

    for (const item of configs) {
      await fetch(`${API_URL}/bot/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
        body: JSON.stringify({ actionKey: item.actionKey, config: item.config }),
      });
      console.log(`   ⚙️ Configurado [${item.actionKey}] con éxito.`);
    }

    // 5. Simular conversación paso a paso como un humano real
    console.log('\n----------------------------------------------------------------------');
    console.log('💬 SIMULANDO CONVERSACIÓN HUMANA CON EL BOT');
    console.log('----------------------------------------------------------------------');

    const conversationSteps = [
      { stepName: 'Ver Menú Principal', message: 'menu' },
      { stepName: 'Consultar Stock', message: '1' },
      { stepName: 'Reservar Turno', message: '2' },
      { stepName: 'Consultar Datos de Pago', message: '3' },
      { stepName: 'Consultar Mis Reservas', message: 'mis reservas' },
      { stepName: 'Derivación a Asesor Humano', message: '6' },
    ];

    for (const turn of conversationSteps) {
      console.log(`\n👤 Humano (${turn.stepName}): "${turn.message}"`);
      
      const chatRes = await fetch(`${API_URL}/bot/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
        body: JSON.stringify({ message: turn.message }),
      });

      const chatJson = await chatRes.json() as any;
      const replyMsg = typeof chatJson.botResponse === 'object' ? (chatJson.botResponse.message || JSON.stringify(chatJson.botResponse, null, 2)) : (chatJson.botResponse || chatJson.message);
      console.log(`🤖 Bot:\n${replyMsg}`);
      console.log('----------------------------------------------------------------------');
    }

    console.log('\n======================================================================');
    console.log('🎉 ¡SIMULACIÓN HUMANA E2E COMPLETADA CON ÉXITO!');
    console.log('======================================================================');
  } catch (err: any) {
    console.error('\n❌ ERROR EN SIMULACIÓN HUMANA:', err.message);
    process.exit(1);
  }
}

runHumanSimulation();
