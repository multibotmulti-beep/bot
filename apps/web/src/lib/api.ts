const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
import { isLauncher } from './environment/detector';
import { bridge } from './bridge/UniversalBridge';

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

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
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
