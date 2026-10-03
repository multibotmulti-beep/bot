'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Icon from './Icon';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      style={{
        background: 'var(--color-border)',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        padding: '6px 12px',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <Icon name={isDark ? 'moon' : 'sun'} style={{ width: '16px', height: '16px', color: 'var(--color-primary)' }} />
      <span>{isDark ? 'Oscuro' : 'Claro'}</span>
    </button>
  );
}
