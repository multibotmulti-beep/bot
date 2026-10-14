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
    const additionalHeaders: Record<string, string> = {};
    if (!phone) {
      additionalHeaders['X-Anonymous-Mode'] = 'true';
    }

    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
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
      const res = await apiFetch('/bot/profiles');
      if (res.success && res.data && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Si no hay perfiles, autogenerar un perfil anónimo en la base de datos real
    }
    try {
      const anonRes = await apiFetch('/bot/profiles/anonymous', { method: 'POST' });
      if (anonRes.success && anonRes.profile) {
        return [anonRes.profile];
      }
    } catch {}
    return [{ id: 'admin', botId: 'admin', name: 'Bot Admin Central', type: 'system', isPublic: true }];
  },

  async createBotWithMenus(botData: { name: string; description: string; welcomeMessage: string; options: any[] }) {
    // 1. Crear perfil de bot en la base de datos real
    const profileRes = await apiFetch('/bot/profiles', {
      method: 'POST',
      body: JSON.stringify({
        botId: `bot_${Date.now()}`,
        name: botData.name,
        description: botData.description,
        type: 'custom',
        isPublic: true,
        isActive: true,
        welcomeMessage: botData.welcomeMessage,
      }),
    });

    const profileId = profileRes.data?.id;
    if (!profileId) throw new Error('No se pudo crear el perfil del bot en la base de datos real.');

    // 2. Crear flujos de menús en la base de datos real
    for (const opt of botData.options) {
      await apiFetch('/bot/flows', {
        method: 'POST',
        body: JSON.stringify({
          botProfileId: profileId,
          name: opt.label,
          triggerKeyword: opt.number,
          flowType: 'menu',
          content: JSON.stringify(opt.subOptions || []),
          responseMessage: opt.response || botData.welcomeMessage,
          isActive: true,
        }),
      });
    }

    return profileRes.data;
  },

  async executeFunction(actionKey: string, senderPhone: string, botId?: string) {
    const targetBotId = botId || 'admin';
    return await apiFetch('/bot/execute-function', {
      method: 'POST',
      body: JSON.stringify({ actionKey, senderPhone, botId: targetBotId }),
    });
  },
};
