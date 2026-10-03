'use client';

import Icon from './Icon';
import ThemeSwitcher from './ThemeSwitcher';
import { useState, useRef, useEffect } from 'react';
import logger from '@/lib/logger';

interface DockProps {
  onNavigate: (view: 'home' | 'analytics' | 'settings' | 'test' | 'whatsapp' | 'resources') => void;
  activeView: string;
}

export default function Dock({ onNavigate, activeView }: DockProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (view: 'home' | 'analytics' | 'settings' | 'test' | 'whatsapp' | 'resources') => {
    logger.info({ view }, 'Navegando a vista desde Dock');
    onNavigate(view);
  };

  const iconStyle = {
    width: '26.4px',
    height: '26.4px',
    color: 'var(--color-primary)',
  };

  const activeButtonStyle = {
    background: 'var(--color-surface)',
    borderRadius: '50%',
    padding: '10px',
    border: 'none',
    boxShadow: 'var(--shadow-soft)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const defaultButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '10px',
  };

  const menuButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    color: 'var(--color-text)',
    fontSize: '1rem',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'fit-content',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '30px',
        border: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '6px 16px',
        zIndex: 1000,
        boxShadow: 'var(--shadow-soft)',
        gap: '12px',
      }}
    >
      <button
        onClick={() => handleNavigate('home')}
        aria-label="Inicio"
        style={activeView === 'home' ? activeButtonStyle : defaultButtonStyle}
      >
        <Icon name="home" style={iconStyle} />
      </button>

      <button
        onClick={() => handleNavigate('analytics')}
        aria-label="Analíticas"
        style={activeView === 'analytics' ? activeButtonStyle : defaultButtonStyle}
      >
        <Icon name="analytics" style={iconStyle} />
      </button>

      <button
        onClick={() => handleNavigate('whatsapp')}
        aria-label="Mensajería WhatsApp"
        style={activeView === 'whatsapp' ? activeButtonStyle : defaultButtonStyle}
      >
        <Icon name="chat" style={iconStyle} />
      </button>

      <button
        onClick={() => handleNavigate('resources')}
        aria-label="Panel de Recursos y Ventanas"
        style={activeView === 'resources' ? activeButtonStyle : defaultButtonStyle}
      >
        <Icon name="settings" style={iconStyle} />
      </button>

      <button
        onClick={() => handleNavigate('test')}
        aria-label="Panel de Pruebas (Sandbox)"
        style={activeView === 'test' ? activeButtonStyle : defaultButtonStyle}
      >
        <Icon name="help" style={iconStyle} />
      </button>

      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Menú"
          style={defaultButtonStyle}
        >
          <Icon name="menu" style={iconStyle} />
        </button>

        {isMenuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 16px)',
              right: '0',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              minWidth: '200px',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <button
              onClick={() => {
                handleNavigate('settings');
                setIsMenuOpen(false);
              }}
              style={menuButtonStyle}
            >
              <Icon name="settings" style={{ width: '20px', height: '20px', color: 'var(--color-secondary)' }} />
              <span>Configuración</span>
            </button>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="theme" style={{ width: '20px', height: '20px', color: 'var(--color-secondary)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tema</span>
              </div>
              <ThemeSwitcher />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
