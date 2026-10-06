const fetch = require('node-fetch');

async function testLogin() {
  console.log('--- Iniciando prueba de login ---');
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
  const username = 'user_final_9002'; // El usuario que creamos antes
  const password = 'password123';

  try {
    const response = await fetch(`${API_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: 'USER:login',
        params: { username, password },
      }),
    });

    const result = await response.json();
    console.log('Resultado de la API:', JSON.stringify(result, null, 2));

    if (
      result.success &&
      result.data &&
      result.data.user &&
      result.data.user.token
    ) {
      console.log('✅ Login exitoso. Token recibido:', result.data.user.token);
    } else {
      console.error(
        '❌ Error en login:',
        result.message || 'Error desconocido'
      );
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
}

testLogin();
