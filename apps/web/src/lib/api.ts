const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
import { isLauncher } from './environment/detector';
import { bridge } from './bridge/UniversalBridge';
import { ClientDatabase } from './clientDatabase';

export const apiClient = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  // Integración condicional: solo usar si es Launcher y tiene capacidades
  if (isLauncher() && bridge.isAvailable('event-queue')) {
    console.log('[Bridge] Usando bridge nativo');
  }

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('session_token')
      : null;

  const phone =
    typeof window !== 'undefined'
      ? localStorage.getItem('bot_user_phone')
      : null;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (!phone) {
    defaultHeaders['X-Anonymous-Mode'] = 'true';
    if (endpoint === '/execute' && options.body) {
      try {
        const bodyObj = JSON.parse(String(options.body));
        const localResult = ClientDatabase.executeCommand(bodyObj.cmd, bodyObj.params);
        console.log(`[ClientDB Debug] Modo anónimo: ejecutando [${bodyObj.cmd}] en BD local del navegador`);
        return {
          ok: true,
          status: 200,
          json: async () => localResult,
        } as Response;
      } catch (e) {
        console.error('[ClientDB Error]', e);
      }
    }
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    });

    // Log para depuración
    console.log(
      `[API Debug] Endpoint: ${endpoint}, Status: ${response.status}`
    );

    return response;
  } catch (error) {
    console.error('[API Error] Network failure:', error);
    // Devolvemos un objeto que simula una respuesta de error para que
    // los componentes no fallen catastróficamente.
    return {
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        message: 'Servicio no disponible (Offline)',
      }),
    } as Response;
  }
};

export const getSalesSummary = async () => {
  const response = await apiClient('/execute', {
    method: 'POST',
    body: JSON.stringify({
      cmd: 'sales.summary',
      params: {},
    }),
  });
  return response.json();
};

export const getSalesHistory = async () => {
  const response = await apiClient('/execute', {
    method: 'POST',
    body: JSON.stringify({
      cmd: 'sales.history',
      params: {},
    }),
  });
  return response.json();
};
