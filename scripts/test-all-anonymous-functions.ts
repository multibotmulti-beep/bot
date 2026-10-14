/**
 * Script de prueba E2E exhaustivo para probar y verificar TODAS las funciones y capacidades
 * del motor de bot en modo anónimo conectado a la base de datos real.
 */

import fetch from 'node-fetch';

async function testAllAnonymousFunctions() {
  console.log('======================================================================');
  console.log('🧪 PRUEBA EXHAUSTIVA DE TODAS LAS FUNCIONES Y CAPACIDADES (MODO ANÓNIMO)');
  console.log('======================================================================');

  const API_URL = 'http://localhost:4000';

  try {
    // 1. Crear un perfil anónimo en la base de datos real para la prueba
    console.log('\n[0] Creando perfil anónimo en base de datos real...');
    const profileRes = await fetch(`${API_URL}/bot/profiles/anonymous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const profileData = await profileRes.json() as any;
    if (!profileData.success || !profileData.profile) {
      throw new Error('No se pudo crear el perfil anónimo');
    }
    const botId = profileData.profile.botId;
    console.log(`✔ Perfil anónimo creado con éxito. Bot ID: ${botId}`);

    // 2. Obtener lista de todas las funciones disponibles
    const functionsRes = await fetch(`${API_URL}/bot/functions`);
    const functionsData = await functionsRes.json() as any;
    const functionsList = functionsData.functions || [];
    const capabilitiesList = functionsData.capabilities || [];

    console.log(`\n📋 Funciones encontradas en catálogo: ${functionsList.length}`);
    console.log(`📋 Capacidades encontradas en catálogo: ${capabilitiesList.length}`);

    // 3. Probar guardar configuraciones para funciones configurables
    const configurableActions = ['stock.manage', 'turnos.book', 'business.payment_info'];
    for (const actionKey of configurableActions) {
      console.log(`\n⚙️ Guardando configuración automática para '${actionKey}'...`);
      let testConfig = {};
      if (actionKey === 'stock.manage') {
        testConfig = { product: 'Producto Test E2E', qty: 100, precio: 99.99, categoria: 'General' };
      } else if (actionKey === 'turnos.book') {
        testConfig = { horarios: '10:00, 14:00, 18:00', servicio: 'Consulta VIP', duracionMin: 30 };
      } else if (actionKey === 'business.payment_info') {
        testConfig = { banco: 'Banco Test', titular: 'Test S.A.', cbu: '1234567890123456789012', alias: 'test.alias', linkPago: 'https://pay.test' };
      }

      const cfgRes = await fetch(`${API_URL}/bot/function-configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Anonymous-Mode': 'true' },
        body: JSON.stringify({ botId, actionKey, config: testConfig }),
      });
      const cfgData = await cfgRes.json() as any;
      console.log(`   Resultado config '${actionKey}':`, cfgData.success ? '✅ OK' : '❌ FAILED');
    }

    // 4. Probar la ejecución de cada función individualmente en modo anónimo
    console.log('\n----------------------------------------------------------------------');
    console.log('🚀 EJECUTANDO CADA FUNCIÓN DEL BOT EN MODO ANÓNIMO');
    console.log('----------------------------------------------------------------------');

    for (const fn of functionsList) {
      const actionKey = fn.actionKey;
      console.log(`\n👉 Probando acción: [${actionKey}] - ${fn.description}`);

      let args = {};
      if (actionKey === 'client.save_info') {
        args = { info: 'Preferencia de entrega: Dejar en recepción' };
      } else if (actionKey === 'pedidos.create') {
        args = { title: 'Pedido Test E2E' };
      }

      const execRes = await fetch(`${API_URL}/bot/execute-function`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Anonymous-Mode': 'true',
        },
        body: JSON.stringify({
          actionKey,
          senderPhone: '+5491155556666',
          botId,
          args,
        }),
      });

      const execData = await execRes.json() as any;
      if (execData.success) {
        console.log(`   ✅ ÉXITO [${actionKey}]:`, execData.message?.substring(0, 90).replace(/\n/g, ' ') || 'OK');
      } else {
        console.log(`   ❌ FALLÓ [${actionKey}]:`, execData.error || execData.message);
      }
    }

    // 5. Probar capacidades de dominio
    console.log('\n----------------------------------------------------------------------');
    console.log('🚀 PROBANDO CAPACIDADES DE DOMINIO');
    console.log('----------------------------------------------------------------------');

    for (const cap of capabilitiesList) {
      const capabilityKey = cap.key;
      console.log(`\n👉 Probando capacidad: [${capabilityKey}] - ${cap.name}`);

      let args = {};
      if (capabilityKey === 'AUTH_LOGIN') {
        args = { senderPhone: '+5491155556666' };
      } else if (capabilityKey === 'MANAGE_BOT_CREATE') {
        args = { name: 'Bot Creado por E2E', phoneNumber: '+5491177778888', welcomeMessage: 'Hola' };
      }

      const capRes = await fetch(`${API_URL}/capabilities/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Anonymous-Mode': 'true',
        },
        body: JSON.stringify({
          capabilityKey,
          senderPhone: '+5491155556666',
          botId,
          args,
        }),
      });

      const capData = await capRes.json() as any;
      if (capData.success) {
        console.log(`   ✅ ÉXITO CAPACIDAD [${capabilityKey}]:`, capData.message?.substring(0, 90).replace(/\n/g, ' ') || 'OK');
      } else {
        console.log(`   ❌ FALLÓ CAPACIDAD [${capabilityKey}]:`, capData.error || capData.message);
      }
    }

    console.log('\n======================================================================');
    console.log('🎉 ¡AUDITORÍA Y PRUEBA EXHAUSTIVA DE TODAS LAS FUNCIONES COMPLETADA!');
    console.log('======================================================================');
  } catch (err: any) {
    console.error('\n❌ ERROR CRÍTICO EN LA PRUEBA EXHAUSTIVA:', err.message);
    process.exit(1);
  }
}

testAllAnonymousFunctions();
