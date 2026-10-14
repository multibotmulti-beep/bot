/**
 * Script de auditoría E2E para probar paso a paso el Asistente por API (/bot/assistant)
 * simulando la creación de perfil, bienvenida, funciones y chat interactivo estilo WhatsApp.
 */

import fetch from 'node-fetch';

async function auditApiAssistantFlow() {
  console.log('======================================================================');
  console.log('🤖 AUDITORÍA E2E: ASISTENTE GUIADO PASO A PASO POR API (/bot/assistant)');
  console.log('======================================================================');

  const API_URL = 'http://localhost:4000';
  let sessionToken = '';

  try {
    // --- PASO 1: Iniciar asistente (Sin datos -> Recibe solicitud de Nombre y Teléfono) ---
    console.log('\n[Paso 1] Iniciando asistente sin datos...');
    const res1 = await fetch(`${API_URL}/bot/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Anonymous-Mode': 'true' },
      body: JSON.stringify({}),
    });
    const data1 = await res1.json() as any;
    console.log('📥 Respuesta Paso 1:', data1);
    
    sessionToken = data1.sessionToken;
    const cookieHeader = res1.headers.get('set-cookie') || '';

    // Enviar Nombre y Teléfono
    console.log('\n[Paso 1.b] Enviando Nombre y Teléfono...');
    const res1b = await fetch(`${API_URL}/bot/assistant`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Anonymous-Mode': 'true',
        'X-Session-Token': sessionToken,
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        name: 'Cafetería Central API',
        phoneNumber: '+5491133334444'
      }),
    });
    const data1b = await res1b.json() as any;
    console.log('📥 Respuesta Paso 1.b:', data1b);

    // --- PASO 2: Enviar Mensaje de Bienvenida ---
    console.log('\n[Paso 2] Enviando Mensaje de Bienvenida...');
    const res2 = await fetch(`${API_URL}/bot/assistant`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Anonymous-Mode': 'true',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify({
        welcomeMessage: '¡Hola! Bienvenido a Cafetería Central. ¿Qué deseas ordenar hoy?'
      }),
    });
    const data2 = await res2.json() as any;
    console.log('📥 Respuesta Paso 2:', data2);
    console.log('📋 Funciones disponibles devueltas por el asistente:', data2.availableFunctions?.map((f: any) => f.actionKey));

    // --- PASO 3: Seleccionar Funciones del Menú ---
    console.log('\n[Paso 3] Seleccionando funciones para el menú (stock.check, turnos.book)...');
    const res3 = await fetch(`${API_URL}/bot/assistant`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Anonymous-Mode': 'true',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify({
        enabledFunctions: ['stock.check', 'turnos.book', 'business.payment_info']
      }),
    });
    const data3 = await res3.json() as any;
    console.log('📥 Respuesta Paso 3 (Bot Creado en BD Real):', data3);

    // --- PASO 4: Chatear con el Bot como Cliente (Simulación WhatsApp) ---
    console.log('\n[Paso 4.a] Cliente envía "menu"...');
    const resChat1 = await fetch(`${API_URL}/bot/assistant`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Anonymous-Mode': 'true',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify({
        message: 'menu'
      }),
    });
    const chatData1 = await resChat1.json() as any;
    console.log('💬 Respuesta del Bot (Menú Principal):\n', chatData1.botResponse);

    console.log('\n[Paso 4.b] Cliente selecciona opción "1" (Consultar Stock)...');
    const resChat2 = await fetch(`${API_URL}/bot/assistant`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Anonymous-Mode': 'true',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify({
        message: '1'
      }),
    });
    const chatData2 = await resChat2.json() as any;
    console.log('💬 Respuesta del Bot (Ejecución de Función Stock):\n', chatData2.botResponse);

    console.log('\n======================================================================');
    console.log('🎉 ¡AUDITORÍA E2E DEL ASISTENTE API FINALIZADA CON ÉXITO!');
    console.log('======================================================================');
  } catch (err: any) {
    console.error('\n❌ ERROR EN LA AUDITORÍA E2E:', err.message);
    process.exit(1);
  }
}

auditApiAssistantFlow();
