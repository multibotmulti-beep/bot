'use client';

import { useState, useEffect } from 'react';

export function useUserSession() {
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const phoneParam = params.get('phone');
      const tokenParam = params.get('token');

      if (phoneParam) {
        const cleanPhone = phoneParam.trim();
        localStorage.setItem('bot_user_phone', cleanPhone);
        setUserPhone(cleanPhone);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else {
        const saved = localStorage.getItem('bot_user_phone');
        if (saved) {
          setUserPhone(saved);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  const login = (phone: string) => {
    const clean = phone.trim();
    localStorage.setItem('bot_user_phone', clean);
    setUserPhone(clean);
  };

  const logout = () => {
    localStorage.removeItem('bot_user_phone');
    setUserPhone(null);
  };

  return {
    userPhone,
    isLoggedIn: !!userPhone,
    isLoaded,
    login,
    logout,
  };
}
