/**
 * Script de prueba E2E para verificar la creación de perfiles anónimos en la base de datos real
 * y la ejecución de funciones del bot en modo anónimo sin usar almacenamiento local.
 */

import fetch from 'node-fetch';

async function testAnonymousDbFlow() {
  console.log('==================================================');
  console.log('🧪 PROBANDO FLUJO ANÓNIMO CON BASE DE DATOS REAL');
  console.log('==================================================');

  const API_URL = 'http://localhost:4000';

  try {
    // 1. Crear perfil anónimo en la base de datos real
    console.log('\n1. Creando perfil anónimo en base de datos real (/bot/profiles/anonymous)...');
    const profileRes = await fetch(`${API_URL}/bot/profiles/anonymous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    const profileData = await profileRes.json() as any;
    console.log('📦 Respuesta de creación de perfil anónimo:', profileData);

    if (!profileData.success || !profileData.profile) {
      throw new Error('Fallo al crear perfil anónimo en base de datos');
    }

    const botId = profileData.profile.botId;
    console.log(`✔ Perfil anónimo creado con éxito en BD real. Bot ID: ${botId}`);

    // 2. Ejecutar función de stock (stock.check) usando el botId anónimo recién creado
    console.log(`\n2. Ejecutando función 'stock.check' para el bot '${botId}' en modo anónimo...`);
    const execRes = await fetch(`${API_URL}/bot/execute-function`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Anonymous-Mode': 'true',
      },
      body: JSON.stringify({
        actionKey: 'stock.check',
        senderPhone: '+5491155556666',
        botId: botId,
      }),
    });

    const execData = await execRes.json() as any;
    console.log('⚡ Resultado de ejecución de función:', execData);

    if (!execData.success) {
      throw new Error('Fallo al ejecutar función en modo anónimo');
    }

    console.log('\n🎉 ¡PRUEBA EXITOSA! El perfil anónimo se creó en la base de datos real y las funciones del bot operan correctamente.');
  } catch (error: any) {
    console.error('\n❌ ERROR EN LA PRUEBA ANÓNIMA:', error.message);
    process.exit(1);
  }
}

testAnonymousDbFlow();
