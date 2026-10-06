import { apiClient } from './api';

export const loginUser = async (username, password) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('session_token');
    }
    const response = await apiClient('/execute', {
      method: 'POST',
      body: JSON.stringify({
        cmd: 'USER:login',
        params: { username, password },
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, user: result.data.user };
    } else {
      return { success: false, message: result.message || 'Error en login' };
    }
  } catch (error) {
    return { success: false, message: 'CONNECTION_ERROR' };
  }
};

export const registerUser = async (username, password, nombreCliente) => {
  try {
    const response = await apiClient('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, nombreCliente }),
    });

    const result = await response.json();
    return response.ok && result.success
      ? { success: true }
      : { success: false, message: result.message || 'Error' };
  } catch (error) {
    return { success: false, message: 'CONNECTION_ERROR' };
  }
};

export const getProfile = async () => {
  console.trace('TRACE: getProfile called by:');
  try {
    const response = await apiClient('/execute', {
      method: 'POST',
      body: JSON.stringify({ cmd: 'USER:get-profile', params: {} }),
    });
    const result = await response.json();
    return result.success
      ? { success: true, profile: result.data.profile }
      : { success: false };
  } catch (error) {
    return { success: false };
  }
};

export const logoutUser = async () => {
  try {
    await apiClient('/execute', {
      method: 'POST',
      body: JSON.stringify({ cmd: 'USER:logout', params: {} }),
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};
