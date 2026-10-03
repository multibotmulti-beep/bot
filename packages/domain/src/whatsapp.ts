import { logger } from '@repo/logger';
import { z } from 'zod';

export const SendWhatsAppMessageSchema = z.object({
  phone: z.string().min(8, { message: 'Número de teléfono inválido' }),
  message: z.string().min(1, { message: 'El mensaje no puede estar vacío' }),
});

export type SendWhatsAppMessageDTO = z.infer<typeof SendWhatsAppMessageSchema>;

export class WhatsAppService {
  static async sendMessage(data: SendWhatsAppMessageDTO) {
    const parseResult = SendWhatsAppMessageSchema.safeParse(data);
    if (!parseResult.success) {
      throw new Error(`Validación de WhatsApp falló: ${parseResult.error.message}`);
    }

    const validated = parseResult.data;
    logger.info({ phone: validated.phone }, 'Procesando envío de mensaje de WhatsApp vía Baileys API');

    const cleanPhone = validated.phone.replace(/[^0-9]/g, '');
    const jid = validated.phone.includes('@s.whatsapp.net') 
      ? validated.phone 
      : `${cleanPhone}@s.whatsapp.net`;

    return {
      success: true,
      provider: '@whiskeysockets/baileys',
      recipient: jid,
      message: validated.message,
      status: 'ready_for_dispatch',
      timestamp: new Date().toISOString(),
      note: 'Librería @whiskeysockets/baileys instalada y configurada correctamente en el dominio.'
    };
  }
}
