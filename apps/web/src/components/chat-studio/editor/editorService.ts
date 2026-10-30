import { apiFetch } from '@/lib/apiClient';

export interface SaveNodePayload {
  responseMessage: string;
  contentType: string;
  mediaUrl?: string | null;
  actionKey?: string | null;
  menuOptions?: Array<{ number?: string; label: string; actionKey?: string; option?: string }>;
}

export const EditorService = {
  async updateWelcomeOrRootNode(botKey: string, payload: SaveNodePayload) {
    // 1. Actualizar el flujo raíz o bienvenida
    const resWelcome = await apiFetch(`/bot/profiles/${botKey}/welcome`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return resWelcome;
  },

  async updateMenuOptions(botKey: string, menuOptions: Array<{ label: string; actionKey?: string; option?: string }>, responseMessage?: string) {
    const resMenu = await apiFetch(`/bot/profiles/${botKey}/menu`, {
      method: 'PUT',
      body: JSON.stringify({ menuOptions, responseMessage }),
    });
    return resMenu;
  },

  async createChildNode(botProfileId: string, parentId: string, payload: any) {
    const resChild = await apiFetch('/bot/flows', {
      method: 'POST',
      body: JSON.stringify({
        botProfileId,
        parentId,
        ...payload
      }),
    });
    return resChild;
  },

  async deleteFlow(flowId: string) {
    return await apiFetch(`/bot/flows/${flowId}`, {
      method: 'DELETE',
    });
  }
};
