import { prisma } from '@repo/database';
import { CapabilityRegistry } from '../registry';
import { CapabilityContext, CapabilityResult } from '../types';

CapabilityRegistry.register({
  key: 'AUTH_LOGIN',
  name: 'Iniciar Sesión / Magic Link',
  description: 'Genera un token y enlace de acceso directo sin contraseña para el número remitente',
  parameters: { senderPhone: 'string (Teléfono del usuario)' },
  exampleUsage: 'POST /capabilities/execute con { "capabilityKey": "AUTH_LOGIN", "senderPhone": "+54911..." }',
  execute: async (context: CapabilityContext): Promise<CapabilityResult> => {
    const phoneNumber = context.senderPhone || context.args?.phoneNumber;
    if (!phoneNumber) {
      return { success: false, message: 'Número de teléfono requerido para autenticación.' };
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    await prisma.user.upsert({
      where: { phoneNumber: cleanPhone },
      update: {},
      create: { phoneNumber: cleanPhone, name: `Usuario ${cleanPhone}` },
    });

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAtDate = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.botSession.upsert({
      where: { senderPhone: cleanPhone },
      update: {
        loginToken: token,
        loginTokenExpires: expiresAtDate,
      },
      create: {
        senderPhone: cleanPhone,
        loginToken: token,
        loginTokenExpires: expiresAtDate,
      },
    });

    const loginUrl = `http://localhost:3000/login?phone=${encodeURIComponent(cleanPhone)}&token=${token}`;

    return {
      success: true,
      data: { token, loginUrl, phoneNumber: cleanPhone },
      message: `🔑 *Inicio de Sesión / Registro Automático*\n\nHola, hemos detectado tu número *${cleanPhone}*.\n• Estado: Cuenta cargada y lista.\n\nHaz clic en el siguiente enlace para ingresar a tu panel de control sin contraseña:\n\n🔗 ${loginUrl}\n\n(Este enlace es válido por 15 minutos).`
    };
  }
});
