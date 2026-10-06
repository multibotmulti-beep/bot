'use client';

import { useEffect } from 'react';

const CURRENT_VERSION = '1.0.1';

export default function VersionChecker() {
  useEffect(() => {
    const savedVersion = localStorage.getItem('app_version');

    if (savedVersion !== CURRENT_VERSION) {
      console.log(
        `Nueva versión detectada: ${savedVersion} -> ${CURRENT_VERSION}. Limpiando caché...`
      );
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('app_version', CURRENT_VERSION);
      // Opcional: recargar la página para asegurar estado limpio
      window.location.reload();
    }
  }, []);

  return null;
}
