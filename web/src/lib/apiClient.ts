// Cliente API robusto para conectar el Frontend con el Backend con manejo de espera/timeout e integración de logs

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 12000; // 12 segundos de espera máxima

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
    reportLogToBackend('debug', `API Request: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
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

// Servicios específicos para Bots
export const BotApiClient = {
  async getProfiles() {
    const res = await apiFetch('/bot/profiles');
    return res.data || [];
  },

  async createBotWithMenus(botData: { name: string; description: string; welcomeMessage: string; options: any[] }) {
    // 1. Crear perfil de bot
    const profileRes = await apiFetch('/bot/profiles', {
      method: 'POST',
      body: JSON.stringify({
        botId: `bot_${Date.now()}`,
        name: botData.name,
        description: botData.description,
        type: 'custom',
        isPublic: true,
        isActive: true,
      }),
    });

    const profileId = profileRes.data?.id;
    if (!profileId) throw new Error('No se pudo crear el perfil del bot en el backend.');

    // 2. Crear flujos de menús y submenús en el backend
    for (const opt of botData.options) {
      const parentFlowRes = await apiFetch('/bot/flows', {
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

      const parentFlowId = parentFlowRes.data?.id;

      // 3. Crear submenús si existen
      if (opt.subOptions && opt.subOptions.length > 0 && parentFlowId) {
        for (const sub of opt.subOptions) {
          await apiFetch('/bot/flows', {
            method: 'POST',
            body: JSON.stringify({
              botProfileId: profileId,
              parentId: parentFlowId,
              name: sub.label,
              triggerKeyword: sub.number,
              flowType: 'menu',
              content: JSON.stringify([]),
              responseMessage: sub.response,
              isActive: true,
            }),
          });
        }
      }
    }

    return profileRes.data;
  },
};
