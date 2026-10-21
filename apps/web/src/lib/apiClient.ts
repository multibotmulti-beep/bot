// Cliente API robusto para conectar el Frontend con el Backend con manejo de espera/timeout e integración de logs
const getApiBaseUrl = () => {
  return '';
};

const API_BASE_URL = getApiBaseUrl();
const REQUEST_TIMEOUT_MS = 12000; // 12 segundos de espera máxima

import { ClientDatabase } from './clientDatabase';

interface RequestOptions extends RequestInit {
  timeout?: number;
}

export async function apiFetch<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    // Enviar log local al backend (sistema de logs centralizado)
    reportLogToBackend('debug', `API Request: {options.method || 'GET'} ${endpoint}`);

    const phone = typeof window !== 'undefined' ? localStorage.getItem('bot_user_phone') : null;
    const isAnon = typeof window !== 'undefined' ? localStorage.getItem('is_anonymous') === 'true' : false;
    const additionalHeaders: Record<string, string> = {};
    if (!phone || isAnon) {
      additionalHeaders['X-Anonymous-Mode'] = 'true';
    }

    const hasBody = Boolean(fetchOptions.body);
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...additionalHeaders,
        ...(fetchOptions.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      reportLogToBackend('error', `API Timeout: La solicitud a ${endpoint} tardó demasiado en responder.`);
      throw new Error('El servidor tardó demasiado en responder (Timeout). Verifique su conexión.');
    }
    reportLogToBackend('error', `API Error en ${endpoint}: ${error.message}`);
    throw error;
  }
}

// Sistema de reporte de logs centralizado hacia el backend (/logs)
export async function reportLogToBackend(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta: any = {}) {
  try {
    if (typeof window === 'undefined') return;
    await fetch(`${API_BASE_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, meta: { ...meta, url: window.location.href } }),
    }).catch(() => {
      // Evitar bucle infinito si el servidor de logs no responde
    });
  } catch {
    // Silencioso
  }
}

// Servicios específicos para Bots utilizando exclusivamente la Base de Datos Real
export const BotApiClient = {
  async getProfiles() {
    try {
      const phone = typeof window !== 'undefined' ? localStorage.getItem('bot_user_phone') : null;
      const query = phone ? `?phoneNumber=${encodeURIComponent(phone)}` : '';
      console.log(`[BotApiClient.getProfiles] Solicitando perfiles con query: ${query}`);
      const res = await apiFetch(`/bot/profiles${query}`);
      console.log(`[BotApiClient.getProfiles] Respuesta recibida:`, res);
      if (res.success && res.data && res.data.length > 0) {
        const filtered = res.data.filter((p: any) => p.id !== 'admin' && p.botId !== 'admin' && p.type !== 'system');
        console.log(`[BotApiClient.getProfiles] Perfiles filtrados válidos:`, filtered);
        if (filtered.length > 0) return filtered;
      }
    } catch (err: any) {
      console.error(`[BotApiClient.getProfiles] Error obteniendo perfiles:`, err);
    }
    return [];
  },

  async createBotWithMenus(botData: { name: string; description: string; welcomeMessage: string; invalidOptionMessage?: string; options: any[] }) {
    let rawPhone = typeof window !== 'undefined' ? localStorage.getItem('bot_user_phone') : null;
    if (!rawPhone || rawPhone.replace(/[^0-9]/g, '').length < 8) {
      rawPhone = '+54911' + Math.floor(10000000 + Math.random() * 90000000);
      if (typeof window !== 'undefined') {
        localStorage.setItem('bot_user_phone', rawPhone);
      }
    }
    const phoneNumber = rawPhone.startsWith('+') ? rawPhone : '+' + rawPhone.replace(/[^0-9]/g, '');

    const menuOptions = botData.options.map(opt => ({
      label: opt.label,
      option: opt.number || opt.id || '1',
      actionKey: opt.actionKey || undefined,
      customResponse: opt.customResponse || undefined
    }));

    const payload = {
      botId: `bot_${Date.now()}`,
      phoneNumber,
      name: botData.name,
      description: botData.description,
      type: 'custom',
      isPublic: true,
      isActive: true,
      welcomeMessage: botData.welcomeMessage,
      invalidOptionMessage: botData.invalidOptionMessage,
      menuOptions,
    };

    console.log(`[BotApiClient.createBotWithMenus] Creando perfil con payload:`, payload);
    const profileRes = await apiFetch('/bot/profiles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    console.log(`[BotApiClient.createBotWithMenus] Respuesta de creación:`, profileRes);

    const profileId = profileRes.data?.id;
    if (!profileId) throw new Error('No se pudo crear el perfil del bot en la base de datos real.');

    return profileRes.data;
  },

  async executeFunction(actionKey: string, senderPhone: string, botId?: string) {
    const targetBotId = botId || 'admin';
    console.log(`[BotApiClient.executeFunction] Ejecutando ${actionKey} para ${senderPhone} con botId ${targetBotId}`);
    return await apiFetch('/bot/execute-function', {
      method: 'POST',
      body: JSON.stringify({ actionKey, senderPhone, botId: targetBotId }),
    });
  },

  async activateProfile(id: string) {
    console.log(`[BotApiClient.activateProfile] Activando perfil id: ${id}`);
    return await apiFetch(`/bot/profiles/${id}/activate`, {
      method: 'PUT',
    });
  },
};

export const ChatApiClient = {
  async getConversations(botId?: string) {
    const phone = typeof window !== 'undefined' ? localStorage.getItem('bot_user_phone') : null;
    const params = new URLSearchParams();
    if (phone) params.append('phoneNumber', phone);
    if (botId) params.append('botId', botId);
    console.log(`[ChatApiClient.getConversations] Solicitando conversaciones: ?${params.toString()}`);
    const res = await apiFetch(`/api/chats?${params.toString()}`);
    console.log(`[ChatApiClient.getConversations] Resultado:`, res);
    return res.success ? res.data : [];
  },
  async getMessages(senderPhone: string, botId?: string) {
    const params = new URLSearchParams();
    if (botId) params.append('botId', botId);
    const query = params.toString() ? `?${params.toString()}` : '';
    console.log(`[ChatApiClient.getMessages] Solicitando mensajes para ${senderPhone} con botId ${botId || 'N/A'}`);
    const res = await apiFetch(`/api/chats/${encodeURIComponent(senderPhone)}${query}`);
    console.log(`[ChatApiClient.getMessages] Mensajes obtenidos:`, res);
    return res.success ? res.data : [];
  },
  async sendMessage(senderPhone: string, message: string, botId: string) {
    console.log(`[ChatApiClient.sendMessage] Enviando mensaje '${message}' de ${senderPhone} a bot ${botId}`);
    const res = await apiFetch('/api/chats/send', {
      method: 'POST',
      body: JSON.stringify({ senderPhone, message, botId }),
    });
    console.log(`[ChatApiClient.sendMessage] Respuesta de envío:`, res);
    return res.success ? res.data : null;
  },
  async deleteChat(senderPhone: string) {
    console.log(`[ChatApiClient.deleteChat] Borrando chat para ${senderPhone}`);
    const res = await apiFetch(`/api/chats/${encodeURIComponent(senderPhone)}`, {
      method: 'DELETE',
    });
    console.log(`[ChatApiClient.deleteChat] Resultado:`, res);
    return res.success ? res.data : null;
  }
};
