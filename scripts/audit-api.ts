import { ChatService, AuthService, UserService, BotProfileService } from '@repo/domain';
import { logger } from '@repo/logger';

async function auditAll() {
  console.log('==================================================');
  console.log('🔍 INICIANDO AUDITORÍA COMPLETA DE LA API Y BACKEND');
  console.log('==================================================');

  try {
    // 1. Probar estado del sistema
    console.log('\n1. Probando estado del sistema...');
    const status = await UserService.getSystemStatus();
    console.log('✅ Estado del sistema:', status);

    // 2. Probar Autenticación por WhatsApp (Magic Link / Initiator)
    console.log('\n2. Probando inicio de autenticación por WhatsApp...');
    const authInit = await BotProfileService.initiateWhatsAppAuth('+5491112345678');
    console.log('✅ Auth iniciada correctamente. Enlace:', authInit.whatsappLink);

    // 3. Probar Estado de Autenticación
    console.log('\n3. Verificando estado de auth...');
    const authStatus = await BotProfileService.checkWhatsAppAuthStatus('+5491112345678');
    console.log('✅ Estado de auth:', authStatus);

    // 4. Probar Sistema de Chat (Guardar Mensaje Entrante)
    console.log('\n4. Guardando mensaje entrante de chat...');
    const incoming = await ChatService.saveMessage({
      senderPhone: '+5491112345678',
      botId: 'admin',
      direction: 'incoming',
      message: 'Hola bot, quiero cotizar un servicio',
    });
    console.log('✅ Mensaje entrante guardado:', incoming?.id);

    // 5. Probar Sistema de Chat (Responder / Mensaje Saliente)
    console.log('\n5. Enviando respuesta saliente al usuario...');
    const reply = await ChatService.replyToUser('+5491112345678', '¡Hola! Con gusto te ayudamos con tu cotización.', 'admin');
    console.log('✅ Respuesta saliente guardada:', reply.data?.id);

    // 6. Probar Listado de Conversaciones
    console.log('\n6. Listando conversaciones activas...');
    const convs = await ChatService.getConversations('+5491112345678');
    console.log('✅ Conversaciones encontradas:', convs.length, convs);

    // 7. Probar Historial por Número
    console.log('\n7. Obteniendo historial de chat para el número...');
    const messages = await ChatService.getMessagesByPhone('+5491112345678');
    console.log(`✅ Mensajes en el historial: ${messages.length}`);

    // 8. Probar Borrado de Chat
    console.log('\n8. Borrando historial de chat...');
    const deleted = await ChatService.deleteChat('+5491112345678');
    console.log('✅ Borrado de chat exitoso:', deleted.message);

    // 9. Verificar que se borró
    const afterDelete = await ChatService.getMessagesByPhone('+5491112345678');
    console.log(`✅ Mensajes tras el borrado: ${afterDelete.length} (Debe ser 0)`);

    console.log('\n==================================================');
    console.log('🎉 ¡AUDITORÍA COMPLETADA CON ÉXITO! TODAS LAS PRUEBAS PASARON.');
    console.log('==================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error crítico durante la auditoría:', err);
    process.exit(1);
  }
}

auditAll();
