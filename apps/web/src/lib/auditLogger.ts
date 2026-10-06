// src/lib/auditLogger.ts
export const auditLog = (
  message: string,
  type: 'info' | 'warn' | 'error' = 'info'
) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [AUDIT] [${type.toUpperCase()}]: ${message}`;

  if (type === 'error') console.error(logMessage);
  else if (type === 'warn') console.warn(logMessage);
  else console.log(logMessage);

  // Emitir evento para el sistema de Toasts (opcional, se puede conectar con el ToastProvider)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('audit-event', { detail: { message, type } })
    );
  }
};
