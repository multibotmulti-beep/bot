/**
 * Servicio básico de sincronización local para una arquitectura Local-First.
 */
export const LocalStorageSync = {
  saveData: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving data to localStorage: ${key}`, error);
    }
  },
  getData: (key: string) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting data from localStorage: ${key}`, error);
      return null;
    }
  },
};
