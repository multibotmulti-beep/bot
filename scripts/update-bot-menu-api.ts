import fetch from 'node-fetch';

async function updateBotMenu() {
  const botId = 'bot_anon_1792592879320';
  const url = `http://localhost:4000/bot/profiles/${botId}/menu`;

  const payload = {
    responseMessage: `🤖 *Menú Principal Actualizado* 🌟\n\nPor favor, selecciona una opción respondiendo con el número correspondiente:\n\n1️⃣ Catálogo y Stock\n2️⃣ Servicios y Asesoría (Contiene Submenú)\n3️⃣ Hablar con Asesor Humano\n4️⃣ Horarios y Ubicación\n5️⃣ Promociones Vigentes`,
    menuOptions: [
      {
        label: 'Catálogo y Stock',
        option: '1',
        actionKey: 'stock.check',
        customResponse: '📦 Aquí puedes consultar la disponibilidad de productos en tiempo real.'
      },
      {
        label: 'Servicios y Asesoría',
        option: '2',
        subOptions: [
          {
            number: '1',
            label: 'Consultoría Técnica',
            customResponse: '💻 *Consultoría Técnica*: Analizamos tu arquitectura y código fuente.'
          },
          {
            number: '2',
            label: 'Soporte Comercial',
            customResponse: '📈 *Soporte Comercial*: Te ayudamos a escalar tus ventas.'
          }
        ]
      },
      {
        label: 'Hablar con Asesor Humano',
        option: '3',
        actionKey: 'support.human',
        customResponse: '📞 Derivando con un asesor humano...'
      },
      {
        label: 'Horarios y Ubicación',
        option: '4',
        actionKey: 'faq.query',
        customResponse: '🕒 Horarios: Lunes a Viernes de 9:00 a 18:00 hrs.'
      },
      {
        label: 'Promociones Vigentes',
        option: '5',
        customResponse: '🔥 ¡Tenemos 20% de descuento en todos nuestros planes empresariales este mes!'
      }
    ]
  };

  console.log(`Enviando actualización de menú para el bot: ${botId}...`);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'guest_session=guest_1792592879320_pt5wstl'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Respuesta de la API:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error al actualizar el menú:', error);
  }
}

updateBotMenu();
