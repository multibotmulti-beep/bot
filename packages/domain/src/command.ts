import { z } from 'zod';
import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { UserService, CredentialService, WebhookService, WhatsAppService } from './index';

export const ExecuteCommandSchema = z.object({
  action: z.string(),
  params: z.record(z.any()).optional().default({}),
});

export type ExecuteCommandDTO = z.infer<typeof ExecuteCommandSchema>;

/**
 * Gestor dinámico y consciente de peticiones (Request-Aware) para URLs base del API y Frontend.
 * Soporta cabeceras de proxy/ngrok/Railway/producción automáticamente sin hardcoding.
 */
export function getApiBaseUrl(customUrl?: string, reqContext?: { headers?: Record<string, any>; protocol?: string }): string {
  if (customUrl) {
    return customUrl.replace(/\/$/, '');
  }

  if (reqContext?.headers) {
    const host = reqContext.headers['x-forwarded-host'] || reqContext.headers['host'];
    if (host) {
      const proto = reqContext.headers['x-forwarded-proto'] || reqContext.protocol || 'http';
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  if (process.env.API_URL) {
    return process.env.API_URL.replace(/\/$/, '');
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN.startsWith('http')
      ? process.env.RAILWAY_PUBLIC_DOMAIN
      : `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    return domain.replace(/\/$/, '');
  }

  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, '');
  }

  const port = process.env.API_PORT || process.env.PORT || '4000';
  return `http://localhost:${port}`;
}

export function getFrontendBaseUrl(customUrl?: string, reqContext?: { headers?: Record<string, any>; protocol?: string }): string {
  if (customUrl) {
    return customUrl.replace(/\/$/, '');
  }

  if (process.env.PAGINA) {
    const p = process.env.PAGINA.startsWith('http') ? process.env.PAGINA : `https://${process.env.PAGINA}`;
    return p.replace(/\/$/, '');
  }

  if (process.env.PAGE_URL) {
    const p = process.env.PAGE_URL.startsWith('http') ? process.env.PAGE_URL : `https://${process.env.PAGE_URL}`;
    return p.replace(/\/$/, '');
  }

  if (reqContext?.headers) {
    const host = reqContext.headers['x-forwarded-host'] || reqContext.headers['host'];
    if (host) {
      const proto = reqContext.headers['x-forwarded-proto'] || reqContext.protocol || 'http';
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }

  if (process.env.PUBLIC_WEB_URL) {
    return process.env.PUBLIC_WEB_URL.replace(/\/$/, '');
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN.startsWith('http')
      ? process.env.RAILWAY_PUBLIC_DOMAIN
      : `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    return domain.replace(/\/$/, '');
  }

  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, '');
  }

  const port = process.env.FRONTEND_PORT || '3000';
  return `http://localhost:${port}`;
}

function getSystemBaseUrl(customUrl?: string): string {
  return getApiBaseUrl(customUrl);
}

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
        const baseUrl = getSystemBaseUrl(validated.params.targetUrl);
        const user = await UserService.createUser({
          email: validated.params.email || `test-${Date.now()}@example.com`,
          phoneNumber: validated.params.phoneNumber || `+34600${Math.floor(100000 + Math.random() * 900000)}`,
          name: validated.params.name || 'Usuario de Prueba API',
        }).catch(() => null);

        const credential = await CredentialService.createCredential({
          apiName: validated.params.apiName || 'mock-service-api',
          apiKey: validated.params.apiKey || 'key_test_12345',
          apiSecret: validated.params.apiSecret || 'secret_hmac_98765',
          targetUrl: `${baseUrl}/webhooks/test-receiver`,
          isActive: true,
        });

        return { message: 'Datos de prueba sembrados exitosamente con pasarela nativa de webhooks', user, credential };
      }

      case 'create_user':
        return await UserService.createUser(validated.params as any);

      case 'list_users':
        return await UserService.getUsers();

      case 'delete_user':
        return await UserService.deleteUser(validated.params.id);

      case 'create_credential':
        return await CredentialService.createCredential(validated.params as any);

      case 'list_credentials':
        return await CredentialService.listCredentials();

      case 'delete_credential':
        return await CredentialService.deleteCredential(validated.params.apiName);

      case 'dispatch_webhook':
        return await WebhookService.dispatch(validated.params as any);

      case 'list_webhook_logs':
        return await WebhookService.listLogs(validated.params.credentialId);

      case 'send_whatsapp':
        return await WhatsAppService.sendMessage(validated.params as any);

      case 'configure_whatsapp_environment': {
        const baseUrl = getSystemBaseUrl(validated.params.targetUrl);

        const credential = await CredentialService.createCredential({
          apiName: 'whatsapp',
          apiKey: validated.params.apiKey || 'wa_key_test_777',
          apiSecret: validated.params.apiSecret || 'wa_webhook_secret_hmac_2026',
          targetUrl: `${baseUrl}/webhooks/whatsapp`,
          isActive: true,
        });

        logger.info({ baseUrl, targetUrl: credential.targetUrl }, 'Entorno de WhatsApp configurado con pasarela nativa (sin ngrok)');

        return {
          success: true,
          message: 'Entorno de WhatsApp API configurado exitosamente con pasarela nativa (local / Railway)',
          whatsappCredential: {
            apiName: credential.apiName,
            apiKey: credential.apiKey,
            webhookToken: credential.apiSecret,
            targetUrl: credential.targetUrl,
            isActive: credential.isActive,
          },
        };
      }

      case 'start_local_tunnel':
      case 'start_ngrok_tunnel': {
        const baseUrl = getSystemBaseUrl(validated.params.targetUrl);
        logger.info({ baseUrl }, 'Iniciando pasarela de túnel nativo local/Railway');
        return {
          success: true,
          tunnelUrl: baseUrl,
          message: `Pasarela de webhooks nativa activa en ${baseUrl}. No se requiere ngrok.`,
        };
      }

      case 'system_status':
        return await UserService.getSystemStatus();

      case 'clear_webhook_logs': {
        const deleted = await prisma.webhookLog.deleteMany({});
        return { message: 'Logs de webhook eliminados', count: deleted.count };
      }

      default:
        throw new Error(`Acción o función desconocida: '${validated.action}'. Acciones válidas: seed_data, create_user, list_users, delete_user, create_credential, list_credentials, delete_credential, dispatch_webhook, list_webhook_logs, send_whatsapp, start_local_tunnel, start_ngrok_tunnel, configure_whatsapp_environment, system_status, clear_webhook_logs`);
    }
  }
}
