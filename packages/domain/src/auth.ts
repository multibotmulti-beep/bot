import { prisma } from '@repo/database';
import { logger } from '@repo/logger';
import { AppError } from './errors';
import { BotProfileService } from './bot';
import * as crypto from 'crypto';

export class AuthService {
  static isAdmin(phoneNumber?: string | null): boolean {
    if (!phoneNumber) return false;
    const clean = phoneNumber.replace(/[^0-9]/g, '');
    const adminEnv = process.env.ADMIN_PHONE_NUMBERS || '5493765376985,34600123456';
    const admins = adminEnv.split(',').map(p => p.replace(/[^0-9]/g, ''));
    return admins.includes(clean);
  }

  static async generateLoginLink(phoneNumber: string) {
    if (!phoneNumber || !phoneNumber.trim()) {
      throw new AppError('Phone number is required', 'Se requiere un número de teléfono válido.', 'INVALID_PHONE' as any, 400);
    }

    const cleanPhone = phoneNumber.trim();

    logger.info({ phoneNumber: cleanPhone }, 'Generando enlace directo al bot de WhatsApp para autenticación (Magic Link)');

    // Iniciar autenticación y obtener el enlace directo al bot (wa.me/BOT_NUMBER?text=VERIFICAR_...)
    const authResult = await BotProfileService.initiateWhatsAppAuth(cleanPhone);
    const token = authResult.token;
    const waLink = authResult.whatsappLink;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos de validez

    // Guardar también en BotSession en BD para verificación persistente
    await prisma.botSession.upsert({
      where: { senderPhone: cleanPhone },
      update: {
        loginToken: token,
        loginTokenExpires: expiresAt,
      },
      create: {
        senderPhone: cleanPhone,
        loginToken: token,
        loginTokenExpires: expiresAt,
      },
    });

    const magicLink = `/login?phone=${encodeURIComponent(cleanPhone)}&token=${token}`;

    return {
      success: true,
      phoneNumber: cleanPhone,
      token,
      waLink,
      magicLink,
      expiresAt: expiresAt.toISOString(),
    };
  }

  static async verifyLoginToken(phoneNumber: string, token: string) {
    if (!phoneNumber || !token) {
      throw new AppError('Phone number and token are required', 'Se requiere número de teléfono y token de verificación.', 'INVALID_AUTH_PARAMS' as any, 400);
    }

    const cleanPhone = phoneNumber.trim();
    const cleanToken = token.trim();

    logger.info({ phoneNumber: cleanPhone }, 'Verificando token de inicio de sesión');

    const session = await prisma.botSession.findUnique({
      where: { senderPhone: cleanPhone },
    });

    if (!session || session.loginToken !== cleanToken) {
      throw new AppError(
        'Invalid login token or phone number mismatch',
        'Error de autenticación: El token es inválido o no corresponde a este número de teléfono. Otro número no puede iniciar sesión con este enlace.',
        'INVALID_TOKEN' as any,
        401
      );
    }

    if (!session.loginTokenExpires || session.loginTokenExpires < new Date()) {
      throw new AppError(
        'Login token expired',
        'Error de autenticación: El enlace de inicio de sesión ha expirado. Solicite uno nuevo.',
        'TOKEN_EXPIRED' as any,
        401
      );
    }

    // Token válido: limpiar para que sea de un solo uso
    await prisma.botSession.update({
      where: { senderPhone: cleanPhone },
      data: {
        loginToken: null,
        loginTokenExpires: null,
      },
    });

    logger.info({ phoneNumber: cleanPhone }, 'Token verificado exitosamente. Sesión autorizada.');
    return {
      success: true,
      phoneNumber: cleanPhone,
      message: 'Autenticación exitosa',
    };
  }
}
