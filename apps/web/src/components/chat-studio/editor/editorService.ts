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
    console.log(`[EditorService] -> PUT /bot/profiles/${botKey}/welcome | ENVIANDO PAYLOAD:`, JSON.stringify(payload, null, 2));
    const resWelcome = await apiFetch(`/bot/profiles/${botKey}/welcome`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    console.log(`[EditorService] <- PUT /bot/profiles/${botKey}/welcome | RESPUESTA API:`, JSON.stringify(resWelcome, null, 2));
    return resWelcome;
  },

  async updateMenuOptions(botKey: string, menuOptions: Array<{ label: string; actionKey?: string; option?: string }>, responseMessage?: string) {
    const payload = { menuOptions, responseMessage };
    console.log(`[EditorService] -> PUT /bot/profiles/${botKey}/menu | ENVIANDO PAYLOAD:`, JSON.stringify(payload, null, 2));
    const resMenu = await apiFetch(`/bot/profiles/${botKey}/menu`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    console.log(`[EditorService] <- PUT /bot/profiles/${botKey}/menu | RESPUESTA API:`, JSON.stringify(resMenu, null, 2));
    return resMenu;
  },

  async createChildNode(botProfileId: string, parentId: string, payload: any) {
    const fullPayload = {
      botProfileId,
      parentId,
      ...payload
    };
    console.log(`[EditorService] -> POST /bot/flows | ENVIANDO PAYLOAD (Nuevo Nodo / Hijo):`, JSON.stringify(fullPayload, null, 2));
    const resChild = await apiFetch('/bot/flows', {
      method: 'POST',
      body: JSON.stringify(fullPayload),
    });
    console.log(`[EditorService] <- POST /bot/flows | RESPUESTA API:`, JSON.stringify(resChild, null, 2));
    return resChild;
  },

  async deleteFlow(flowId: string) {
    console.log(`[EditorService] -> DELETE /bot/flows/${flowId}`);
    const resDelete = await apiFetch(`/bot/flows/${flowId}`, {
      method: 'DELETE',
    });
    console.log(`[EditorService] <- DELETE /bot/flows/${flowId} | RESPUESTA API:`, JSON.stringify(resDelete, null, 2));
    return resDelete;
  }
};
