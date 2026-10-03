import { z } from 'zod';
import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { UserService, CredentialService, WebhookService, WhatsAppService } from './index';

export const ExecuteCommandSchema = z.object({
  action: z.string(),
  params: z.record(z.any()).optional().default({}),
});

export type ExecuteCommandDTO = z.infer<typeof ExecuteCommandSchema>;

export class CommandExecutor {
  static async execute(data: ExecuteCommandDTO) {
    const parseResult = ExecuteCommandSchema.safeParse(data);
    if (!parseResult.success) {
      throw new Error(`Parámetros de comando inválidos: ${parseResult.error.message}`);
    }

    const validated = parseResult.data;
    logger.info({ action: validated.action }, 'Ejecutando comando/función vía API universal de control');

    switch (validated.action) {
      case 'seed_data': {
        const user = await UserService.createUser({
          email: validated.params.email || `test-${Date.now()}@example.com`,
          name: validated.params.name || 'Usuario de Prueba API',
        }).catch(() => null);

        const credential = await CredentialService.createCredential({
          apiName: validated.params.apiName || 'mock-service-api',
          apiKey: validated.params.apiKey || 'key_test_12345',
          apiSecret: validated.params.apiSecret || 'secret_hmac_98765',
          targetUrl: validated.params.targetUrl || 'http://localhost:4000/webhooks/test-receiver',
          isActive: true,
        });

        return { message: 'Datos de prueba sembrados exitosamente', user, credential };
      }

      case 'create_user':
        return await UserService.createUser(validated.params);

      case 'list_users':
        return await UserService.getUsers();

      case 'delete_user':
        return await UserService.deleteUser(validated.params.id);

      case 'create_credential':
        return await CredentialService.createCredential(validated.params);

      case 'list_credentials':
        return await CredentialService.listCredentials();

      case 'delete_credential':
        return await CredentialService.deleteCredential(validated.params.apiName);

      case 'dispatch_webhook':
        return await WebhookService.dispatch(validated.params);

      case 'list_webhook_logs':
        return await WebhookService.listLogs(validated.params.credentialId);

      case 'send_whatsapp':
        return await WhatsAppService.sendMessage(validated.params);

      case 'configure_whatsapp_environment': {
        let tunnelUrl = validated.params.targetUrl;
        if (!tunnelUrl) {
          try {
            const ngrok = await import('ngrok');
            const token = validated.params.authtoken || '2pDWRl27a0mEwOx8GLZ4c8LSxCw_7Zt96Vc887JiSjiGg92gx';
            await ngrok.authtoken(token);
            tunnelUrl = await ngrok.connect({ addr: validated.params.port || 4000 });
          } catch (e) {
            tunnelUrl = 'http://localhost:4000';
          }
        }

        const credential = await CredentialService.createCredential({
          apiName: 'whatsapp',
          apiKey: validated.params.apiKey || 'wa_key_test_777',
          apiSecret: validated.params.apiSecret || 'wa_webhook_secret_hmac_2026',
          targetUrl: `${tunnelUrl.replace(/\/$/, '')}/webhooks/test-receiver`,
          isActive: true,
        });

        return {
          success: true,
          message: 'Entorno de WhatsApp API configurado y guardado en PostgreSQL exitosamente',
          whatsappCredential: {
            apiName: credential.apiName,
            apiKey: credential.apiKey,
            webhookToken: credential.apiSecret,
            targetUrl: credential.targetUrl,
            isActive: credential.isActive,
          },
        };
      }

      case 'start_ngrok_tunnel': {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('ngrok solo está permitido en entorno de desarrollo (dev). En producción se utiliza el sistema propio.');
        }
        try {
          const ngrok = await import('ngrok');
          const token = validated.params.authtoken || '2pDWRl27a0mEwOx8GLZ4c8LSxCw_7Zt96Vc887JiSjiGg92gx';
          await ngrok.authtoken(token);
          const port = validated.params.port || 4000;
          const url = await ngrok.connect({ addr: port });
          return { success: true, tunnelUrl: url, message: `Túnel ngrok iniciado exitosamente para desarrollo en puerto ${port}` };
        } catch (err: any) {
          return { success: false, error: err.message, message: 'No se pudo iniciar ngrok con el autotoken proporcionado.' };
        }
      }

      case 'system_status':
        return await UserService.getSystemStatus();

      case 'clear_webhook_logs': {
        const deleted = await prisma.webhookLog.deleteMany({});
        return { message: 'Logs de webhook eliminados', count: deleted.count };
      }

      default:
        throw new Error(`Acción o función desconocida: '${validated.action}'. Acciones válidas: seed_data, create_user, list_users, delete_user, create_credential, list_credentials, delete_credential, dispatch_webhook, list_webhook_logs, send_whatsapp, start_ngrok_tunnel, configure_whatsapp_environment, system_status, clear_webhook_logs`);
    }
  }
}
