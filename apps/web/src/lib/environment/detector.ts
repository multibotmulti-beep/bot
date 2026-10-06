/**
 * Utilidades para detectar si la aplicación se está ejecutando en un Launcher
 * o en un entorno de Navegador estándar.
 */

export const isLauncher = (): boolean => {
  return (
    typeof window !== 'undefined' && (window as any).env?.isLauncher === true
  );
};

export const isBrowser = (): boolean => {
  return !isLauncher();
};
