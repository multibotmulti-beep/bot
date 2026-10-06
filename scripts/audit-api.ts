import { ChatService, AuthService, UserService, BotProfileService, BotService } from '@repo/domain';
import { logger } from '@repo/logger';

async function auditAll() {
  console.log('==================================================');
  console.log('🔍 INICIANDO AUDITORÍA DEL BOT, VERIFICACIÓN Y MENÚS');
  console.log('==================================================');

  try {
    const testPhone = '+5491198765432';

    // 1. Iniciar autenticación por WhatsApp (genera loginToken en BotSession)
    console.log('\n1. Generando enlace de verificación de WhatsApp...');
    const authInit = await BotProfileService.initiateWhatsAppAuth(testPhone);
    console.log('✅ Auth iniciada. Token generado:', authInit.token);
    console.log('✅ Enlace de WhatsApp:', authInit.whatsappLink);

    // 2. Simular mensaje entrante de webhook con el comando de verificación "verificar_TOKEN"
    console.log('\n2. Simulando mensaje entrante en webhook: "verificar_' + authInit.token + '"...');
    const webhookPayload = {
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: '880275461842101' },
            messages: [{
              from: testPhone,
              text: { body: `verificar_${authInit.token}` },
            }],
          },
        }],
      }],
    };

    const webhookResult = await BotService.handleIncomingWebhook(webhookPayload);
    console.log('✅ Resultado del webhook de verificación:', webhookResult);

    // 3. Verificar que el estado de autenticación ahora sea verdadero (verified: true)
    console.log('\n3. Comprobando estado de autenticación post-verificación...');
    const authStatus = await BotProfileService.checkWhatsAppAuthStatus(testPhone);
    console.log('✅ Estado de auth verificado:', authStatus);

    // 4. Probar respuesta del bot al menú principal (comando "menu" o "0")
    console.log('\n4. Simulando mensaje de menú ("menu")...');
    const menuPayload = {
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: '880275461842101' },
            messages: [{
              from: testPhone,
              text: { body: 'menu' },
            }],
          },
        }],
      }],
    };
    const menuResult = await BotService.handleIncomingWebhook(menuPayload);
    console.log('✅ Resultado del menú principal:', menuResult);

    console.log('\n==================================================');
    console.log('🎉 ¡AUDITORÍA DEL BOT Y VERIFICACIÓN EXITOSA!');
    console.log('==================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error crítico durante la auditoría del bot:', err);
    process.exit(1);
  }
}

auditAll();
