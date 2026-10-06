'use client';

import { useState, Suspense } from 'react';
import Dock from '@/components/Dock';
import { panelRegistry } from '@/lib/panelRegistry';
import { useUserSession } from '@/lib/userSession';
import Icon from '@/components/Icon';

type View = keyof typeof panelRegistry;

export default function Page() {
  const { userPhone, isLoggedIn, isLoaded, login, logout } = useUserSession();
  const [currentView, setCurrentView] = useState<View>('test');
  const [authInputPhone, setAuthInputPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleInitiateWhatsAppAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authInputPhone.trim()) {
      setAuthMessage('Ingresa un número de teléfono válido.');
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);
    setWhatsappLink(null);

    try {
      const response = await fetch('http://localhost:4000/api/auth/whatsapp/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: authInputPhone.trim() }),
      });
      const data = await response.json();
      if (data.success && data.data?.whatsappLink) {
        setWhatsappLink(data.data.whatsappLink);
        setAuthMessage('¡Enlace generado! Envía el mensaje por WhatsApp al bot para verificar tu número o haz clic en el botón de abajo.');
      } else {
        setAuthMessage('Error al generar autenticación por WhatsApp.');
      }
    } catch (err: any) {
      setAuthMessage(`Error de conexión: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
        Cargando plataforma de bots...
      </div>
    );
  }

  // Pantalla de Inicio de Sesión creada desde cero para WhatsApp (si no está logueado ni en modo anónimo)
  if (!isLoggedIn && !isAnonymous) {
    return (
      <main style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '440px', padding: '32px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Icon name="chat" style={{ width: '22px', height: '22px' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>WhatsApp Bot Platform</h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Inicio de sesión seguro por número</p>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
            Ingresa tu número de teléfono de WhatsApp para acceder a tu base de datos de bots diseñados y editarlos sin contraseña.
          </p>

          <form onSubmit={handleInitiateWhatsAppAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Número de Teléfono (WhatsApp)</label>
              <input
                type="text"
                placeholder="ej: +5491112345678"
                value={authInputPhone}
                onChange={(e) => setAuthInputPhone(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontSize: '0.95rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
            >
              {authLoading ? 'Generando enlace...' : '📲 Verificar con WhatsApp Real'}
            </button>
          </form>

          {authMessage && (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'pre-line' }}>
              {authMessage}
            </div>
          )}

          {whatsappLink && (
            <div style={{ marginTop: '12px' }}>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', padding: '10px', backgroundColor: '#25D366', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}
              >
                Abrir WhatsApp y Enviar Mensaje ↗
              </a>
              <button
                onClick={() => login(authInputPhone)}
                style={{ width: '100%', marginTop: '8px', padding: '8px', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                [Modo Dev] Simular verificación exitosa y entrar
              </button>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '24px', paddingTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setIsAnonymous(true)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
            >
              Continuar en Modo Anónimo (Explorar sin guardar)
            </button>
          </div>
        </div>
      </main>
    );
  }

  const ActivePanel = panelRegistry[currentView] || panelRegistry['test'];

  return (
    <main
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Barra superior de sesión */}
      <div style={{ padding: '8px 24px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          {isLoggedIn ? (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>WhatsApp ID: <span style={{ color: 'var(--color-primary)' }}>{userPhone}</span></span>
            </>
          ) : (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <span>Modo Anónimo (Simulador y Diseñador Libres)</span>
            </>
          )}
        </div>
        {isLoggedIn ? (
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
          >
            Cerrar Sesión
          </button>
        ) : (
          <button
            onClick={() => setIsAnonymous(false)}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
          >
            Iniciar Sesión con WhatsApp
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          overflowY: 'auto',
          paddingBottom: '90px',
        }}
      >
        <Suspense
          fallback={
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Cargando panel de bots...
            </div>
          }
        >
          <ActivePanel />
        </Suspense>
      </div>
      <Dock onNavigate={(view) => setCurrentView(view as View)} activeView={currentView} />
    </main>
  );
}
