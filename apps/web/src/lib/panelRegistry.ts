import { lazy, ComponentType } from 'react';

// Registro centralizado de paneles con carga perezosa (Lazy Loading)
// Permite escalar a miles de paneles sin afectar el rendimiento ni el tamaño del bundle inicial.
export const panelRegistry: Record<string, ComponentType<any>> = {
  home: lazy(() => import('@/components/panels/HomePanel')),
  settings: lazy(() => import('@/components/panels/SettingsPanel')),
  whatsapp: lazy(() => import('@/components/panels/WhatsAppStylePanel')),
  'function-config': lazy(() => import('@/components/panels/FunctionConfigPanel')),
  'bot-chat-simulator': lazy(() => import('@/components/panels/BotChatSimulatorPanel')),
};

export function registerPanel(id: string, component: ComponentType<any>) {
  if (!panelRegistry[id]) {
    panelRegistry[id] = component;
  }
}
