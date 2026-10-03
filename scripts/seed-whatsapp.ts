import { CredentialService } from '@repo/domain';
import { logger } from '@repo/logger';

async function seed() {
  try {
    console.log('Actualizando credenciales de WhatsApp Business con el token permanente...');
    
    try {
      await CredentialService.deleteCredential('whatsapp');
    } catch (e) {
      // Ignorar si no existe
    }

    const credential = await CredentialService.createCredential({
      apiName: 'whatsapp',
      apiKey: 'EAAWpnXQ6Y8UBSuStpAGsK92XgZBjq0MYsVhLAFEsWG0M9SJgdtZCq6gzCPIWDPaPtfPi8ZBaid36w9gIZAZAM5Vl8ZBZABw08H6KEzlVsndbFBZAwdtJkz9in83bBZBs7UBDIZAJzWISUbtPDduVNmpbcJZBFvhSjD9AAwh2VXqhhyiC4u64uEDbePY0z1c9wH6WAZDZD',
      apiSecret: 'waba_id_2706891212982443_phone_id_880275461842101',
      targetUrl: 'https://graph.facebook.com/v17.0/880275461842101/messages',
      isActive: true,
    });

    console.log('¡Credenciales permanentes de WhatsApp guardadas exitosamente!', credential);
  } catch (err) {
    console.error('Error al guardar credenciales:', err);
    process.exit(1);
  }
}

seed();
