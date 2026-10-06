// src/lib/nativeBridge.ts

/**
 * NativeBridge centraliza la comunicación entre la aplicación Web y la aplicación Nativa (Flutter).
 * Provee una interfaz tipada y segura para solicitar funciones nativas.
 */

export const nativeBridge = {
  /**
   * Llama a un comando nativo registrado en Flutter.
   * @param command El nombre del handler (ej. 'openScanner', 'getDeviceInfo')
   * @param params Argumentos para el comando
   * @returns La respuesta de la aplicación nativa
   */
  async call<T = any>(command: string, params: any = {}): Promise<T | null> {
    // Detectar si estamos en un entorno con inappwebview
    if ((window as any).flutter_inappwebview) {
      try {
        return await (window as any).flutter_inappwebview.callHandler(
          command,
          params
        );
      } catch (error) {
        console.error(
          `NativeBridge: Error al ejecutar comando ${command}`,
          error
        );
        return null;
      }
    }

    console.warn(
      `NativeBridge: El entorno no es nativo (App no detectada). Comando: ${command}`
    );
    return null;
  },
};
