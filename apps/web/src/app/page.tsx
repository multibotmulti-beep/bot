'use client';

import { useState, useEffect, Suspense } from 'react';
import Dock from '@/components/Dock';
import { panelRegistry } from '@/lib/panelRegistry';
import { useUserSession } from '@/lib/userSession';
import Icon from '@/components/Icon';
import logger from '@/lib/logger';
import { apiFetch } from '@/lib/apiClient';

type View = keyof typeof panelRegistry;

const COUNTRIES = [
  { name: '🇦🇷 Argentina', code: '+54' },
  { name: '🇲🇽 México', code: '+52' },
  { name: '🇪🇸 España', code: '+34' },
  { name: '🇨🇱 Chile', code: '+56' },
  { name: '🇨🇴 Colombia', code: '+57' },
  { name: '🇵🇪 Perú', code: '+51' },
  { name: '🇺🇾 Uruguay', code: '+598' },
  { name: '🇺🇸 Estados Unidos', code: '+1' },
  { name: '🇧🇷 Brasil', code: '+55' },
  { name: '🇪🇨 Ecuador', code: '+593' },
  { name: '🇻🇪 Venezuela', code: '+58' },
  { name: '🇧🇴 Bolivia', code: '+591' },
  { name: '🇵🇾 Paraguay', code: '+595' },
];

export default function Page() {
  const { userPhone, isLoggedIn, isLoaded, login, logout } = useUserSession();
  const [currentView, setCurrentView] = useState<View>('test');
  const [countryCode, setCountryCode] = useState('+54');
  const [localPhone, setLocalPhone] = useState('');
  const authInputPhone = `${countryCode}${localPhone.replace(/^0+/, '').replace(/\D/g, '')}`;
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    logger.info({ currentView }, 'Panel completo detectado y cargado en la interfaz');
    if (typeof window !== 'undefined') {
      const anonSaved = localStorage.getItem('is_anonymous');
      if (anonSaved === 'true') {
        setIsAnonymous(true);
      }
    }
  }, [currentView]);

  const handleCheckVerification = async () => {
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const res = await apiFetch('/api/auth/check-whatsapp-status', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: authInputPhone.trim() }),
      });
      if (res.success && res.data?.verified) {
        login(authInputPhone.trim());
      } else {
        setAuthMessage('⏳ El bot aún no ha confirmado tu verificación. Envía el mensaje con el código al bot de WhatsApp y vuelve a hacer clic en este botón.');
      }
    } catch (err: any) {
      setAuthMessage(`Error al comprobar estado: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInitiateWhatsAppAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authInputPhone.trim()) {
      setAuthMessage('Ingresa un número de teléfono válido.');
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);
    setWhatsappLink(null);
    setAuthToken(null);

    try {
      const data = await apiFetch('/api/auth/initiate-whatsapp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: authInputPhone.trim() }),
      });
      if (data.success && data.data?.whatsappLink) {
        setWhatsappLink(data.data.whatsappLink);
        setAuthToken(data.data.token || null);
        setAuthMessage('¡Enlace generado! Envía el mensaje por WhatsApp al bot para verificar tu número o haz clic en el botón de arriba.');
      } else {
        setAuthMessage('Error al generar autenticación por WhatsApp.');
      }
    } catch (err: any) {
      setAuthMessage(`Error de conexión: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEnterAsGuest = async () => {
    setAuthLoading(true);
    try {
      const res = await apiFetch('/bot/profiles/anonymous', { method: 'POST' });
      if (res.success) {
        setIsAnonymous(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('is_anonymous', 'true');
          if (res.profile?.phoneNumber) {
            localStorage.setItem('bot_user_phone', res.profile.phoneNumber);
          } else {
            const uniquePhone = '+549' + Math.floor(1000000000 + Math.random() * 9000000000);
            localStorage.setItem('bot_user_phone', uniquePhone);
          }
          if (res.profile?.botId || res.profile?.id) {
            sessionStorage.setItem('active_bot_id', res.profile.botId || res.profile.id);
          }
        }
      }
    } catch (err: any) {
      alert(`Error al iniciar como invitado: ${err.message}`);
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{ padding: '12px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="ej: 91112345678"
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  style={{ flex: 1, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            {!whatsappLink && (
              <button
                type="submit"
                disabled={authLoading}
                style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
              >
                {authLoading ? 'Generando enlace...' : '📲 Verificar con WhatsApp Real'}
              </button>
            )}
          </form>

          {whatsappLink && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', padding: '12px', backgroundColor: '#25D366', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}
              >
                📲 Abrir WhatsApp y Enviar Mensaje ↗
              </a>
              <button
                type="button"
                disabled={authLoading}
                onClick={handleCheckVerification}
                style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
              >
                {authLoading ? 'Comprobando...' : '🔄 Ya envié el mensaje - Verificar e Iniciar Sesión'}
              </button>
            </div>
          )}

          {authToken && (
            <div style={{ marginTop: '12px', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-primary)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Comando de verificación para enviar por WhatsApp:</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)', userSelect: 'all' }}>
                VERIFICAR_{authToken}
              </div>
            </div>
          )}

          {authMessage && (
            <div style={{ marginTop: '12px', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'pre-line' }}>
              {authMessage}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '24px', paddingTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              disabled={authLoading}
              onClick={handleEnterAsGuest}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'underline' }}
            >
              {authLoading ? 'Creando sesión...' : 'Ingresar como Invitado (Crear sesión anónima en BD)'}
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
            onClick={() => {
              localStorage.removeItem('is_anonymous');
              setIsAnonymous(false);
            }}
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
