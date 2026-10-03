import { z } from 'zod';
import { prisma, ApiCredential } from '@repo/database';
import { logger } from '@repo/logger';
import { CredentialError, WebhookError } from './errors';
import * as crypto from 'crypto';

// 1. Schemas de validación con Zod
export const CreateCredentialSchema = z.object({
  apiName: z.string().min(2),
  apiKey: z.string().min(1, { message: 'La API Key es obligatoria' }),
  apiSecret: z.string().min(1, { message: 'El Secret es obligatorio para la firma HMAC' }),
  targetUrl: z.string().url({ message: 'La URL de destino del Webhook no es válida' }),
  isActive: z.boolean().optional().default(true),
});

export const DispatchWebhookSchema = z.object({
  apiName: z.string(),
  event: z.string(),
  payload: z.record(z.any()),
  overrideUrl: z.string().url().optional(), // Permite usar ngrok o túneles de terceros dinámicamente
});

export type CreateCredentialDTO = z.infer<typeof CreateCredentialSchema>;
export type DispatchWebhookDTO = z.infer<typeof DispatchWebhookSchema>;

// 2. Interfaz de Transporte Modular para Webhooks (Ngrok, HTTP Directo, Colas, etc.)
export interface WebhookTransportOptions {
  url: string;
  apiKey: string;
  signature: string;
  event: string;
  payloadString: string;
}

export interface WebhookTransport {
  send(options: WebhookTransportOptions): Promise<{ responseCode: number; responseBody: string }>;
}

export class HttpFetchTransport implements WebhookTransport {
  async send(options: WebhookTransportOptions) {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': options.apiKey,
        'X-Webhook-Signature': options.signature,
        'X-Webhook-Event': options.event,
      },
      body: options.payloadString,
    });

    const responseCode = response.status;
    const responseBody = await response.text();
    return { responseCode, responseBody };
  }
}

// 3. Servicio de Credenciales con Errores Precisos
export class CredentialService {
  static async createCredential(data: CreateCredentialDTO): Promise<ApiCredential> {
    const parseResult = CreateCredentialSchema.safeParse(data);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => e.message).join(', ');
      throw new CredentialError(
        `Validation failed for credential: ${errorMessage}`,
        `Error de credenciales: Datos inválidos (${errorMessage})`,
        parseResult.error.errors
      );
    }

    const validated = parseResult.data;
    logger.info({ apiName: validated.apiName }, 'Creando o actualizando credencial para API');

    try {
      return await prisma.apiCredential.upsert({
        where: { apiName: validated.apiName },
        update: {
          apiKey: validated.apiKey,
          apiSecret: validated.apiSecret,
          targetUrl: validated.targetUrl,
          isActive: validated.isActive,
        },
        create: {
          apiName: validated.apiName,
          apiKey: validated.apiKey,
          apiSecret: validated.apiSecret,
          targetUrl: validated.targetUrl,
          isActive: validated.isActive,
        },
      });
    } catch (error: any) {
      throw new CredentialError(
        `Failed to save credential for ${validated.apiName}: ${error.message}`,
        `Error de credenciales: No se pudo guardar la credencial para '${validated.apiName}' en la base de datos`,
        { originalError: error.message }
      );
    }
  }

  static async getCredential(apiName: string): Promise<ApiCredential> {
    const credential = await prisma.apiCredential.findUnique({
      where: { apiName },
    });

    if (!credential) {
      throw new CredentialError(
        `Credential not found for API: ${apiName}`,
        `Error de credenciales: No existe ninguna configuración para la API '${apiName}'. Por favor regístrela primero.`
      );
    }

    if (!credential.isActive) {
      throw new CredentialError(
        `Credential is inactive for API: ${apiName}`,
        `Error de credenciales: La API '${apiName}' se encuentra inactiva temporalmente.`
      );
    }

    return credential;
  }

  static async listCredentials(): Promise<ApiCredential[]> {
    return prisma.apiCredential.findMany();
  }

  static async deleteCredential(apiName: string): Promise<boolean> {
    logger.info({ apiName }, 'Eliminando credencial de API');
    const existing = await prisma.apiCredential.findUnique({ where: { apiName } });
    if (!existing) {
      throw new CredentialError(
        `Credential not found for API: ${apiName}`,
        `Error de credenciales: No se encontró la API '${apiName}' para eliminar.`
      );
    }
    await prisma.apiCredential.delete({ where: { apiName } });
    return true;
  }
}

// 4. Servicio de Webhooks Modular con Soporte para Ngrok, Terceros y Auditoría
export class WebhookService {
  private static transport: WebhookTransport = new HttpFetchTransport();

  static setTransport(customTransport: WebhookTransport) {
    this.transport = customTransport;
    logger.info('Transporte de webhooks actualizado dinámicamente');
  }

  static async dispatch(data: DispatchWebhookDTO) {
    const parseResult = DispatchWebhookSchema.safeParse(data);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => e.message).join(', ');
      throw new WebhookError(
        `Webhook dispatch validation failed: ${errorMessage}`,
        `Error de webhook: Payload o parámetros inválidos (${errorMessage})`
      );
    }

    const validated = parseResult.data;
    logger.info({ apiName: validated.apiName, event: validated.event }, 'Despachando webhook seguro (Sistema Modular)');

    const credential = await CredentialService.getCredential(validated.apiName);
    const targetUrl = validated.overrideUrl || credential.targetUrl;
    const payloadString = JSON.stringify(validated.payload);
    
    const signature = crypto
      .createHmac('sha256', credential.apiSecret)
      .update(payloadString)
      .digest('hex');

    let responseCode: number | null = null;
    let responseBody: string | null = null;
    let status = 'SUCCESS';

    try {
      const result = await this.transport.send({
        url: targetUrl,
        apiKey: credential.apiKey,
        signature,
        event: validated.event,
        payloadString,
      });

      responseCode = result.responseCode;
      responseBody = result.responseBody;

      if (responseCode < 200 || responseCode >= 300) {
        status = 'FAILED';
        logger.error({ apiName: validated.apiName, targetUrl, responseCode, responseBody }, 'Webhook rechazado por receptor (Ngrok/Tercero/Local)');
        throw new WebhookError(
          `Webhook target responded with status ${responseCode}: ${responseBody}`,
          `Error de webhook: El servicio receptor (${validated.apiName}) rechazó el evento en ${targetUrl} (Código HTTP ${responseCode})`,
          { responseCode, responseBody, targetUrl }
        );
      } else {
        logger.info({ apiName: validated.apiName, targetUrl, responseCode }, 'Webhook entregado exitosamente mediante transporte modular');
      }
    } catch (error: any) {
      status = 'FAILED';
      if (error instanceof WebhookError) throw error;
      responseBody = error.message;
      logger.error({ apiName: validated.apiName, targetUrl, err: error }, 'Error de red o transporte al despachar webhook');
      throw new WebhookError(
        `Network or transport error dispatching webhook to ${targetUrl}: ${error.message}`,
        `Error de comunicación: No se pudo conectar con el destino '${targetUrl}' para la API '${validated.apiName}'`,
        { originalError: error.message, targetUrl }
      );
    } finally {
      // Registrar log en base de datos
      await prisma.webhookLog.create({
        data: {
          credentialId: credential.id,
          event: validated.event,
          payload: payloadString,
          responseCode,
          responseBody,
          status,
        },
      }).catch((dbErr) => {
        logger.error({ err: dbErr }, 'No se pudo guardar el log del webhook en base de datos');
      });
    }

    return { success: true, targetUrl, responseCode, responseBody };
  }

  static async listLogs(credentialId?: string) {
    if (credentialId) {
      return prisma.webhookLog.findMany({
        where: { credentialId },
        orderBy: { createdAt: 'desc' },
      });
    }
    return prisma.webhookLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static verifySignature(apiSecret: string, payload: any, signature: string): boolean {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', apiSecret)
      .update(payloadString)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
}
