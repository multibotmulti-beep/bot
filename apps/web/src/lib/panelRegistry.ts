import { lazy, ComponentType } from 'react';

// Registro centralizado de paneles con carga perezosa (Lazy Loading)
// Permite escalar a miles de paneles sin afectar el rendimiento ni el tamaño del bundle inicial.
export const panelRegistry: Record<string, ComponentType<any>> = {
  home: lazy(() => import('@/components/panels/HomePanel')),
  analytics: lazy(() => import('@/components/panels/AnalyticsPanel')),
  settings: lazy(() => import('@/components/panels/SettingsPanel')),
  help: lazy(() => import('@/components/panels/HelpPanel')),
  whatsapp: lazy(() => import('@/components/panels/WhatsAppStylePanel')),
  resources: lazy(() => import('@/components/panels/ResourcesPanel')),
  test: lazy(() => import('@/components/panels/TestPanel')),
};

export function registerPanel(id: string, component: ComponentType<any>) {
  if (!panelRegistry[id]) {
    panelRegistry[id] = component;
  }
}
