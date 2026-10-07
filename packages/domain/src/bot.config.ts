/**
 * Archivo de configuración del Motor de Bot Dinámico.
 * Define parámetros de funcionamiento del motor sin código hardcodeado de respuestas.
 */

export const BotConfig = {
  defaultBotId: process.env.DEFAULT_BOT_ID || 'admin',
  sessionTtlMinutes: 15,
  defaultMatchType: 'default',
  graphApiVersion: 'v17.0',
  defaultPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '880275461842101',
  enableDatabaseFallback: true,
  strictDynamicMode: true, // Forzar uso exclusivo de base de datos para respuestas y menús
};

export type BotEngineConfig = typeof BotConfig;
