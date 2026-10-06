'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [waLinkInfo, setWaLinkInfo] = useState<{ whatsappLink: string; token: string } | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  // Polling para verificar si el bot de WhatsApp confirmó la autenticación real
  useEffect(() => {
    let interval: any = null;
    if (isWaiting && phone) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/auth/check-whatsapp-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: phone }),
          });
          const data = await res.json();
          if (data.success && data.data?.verified) {
            clearInterval(interval);
            const cleanPhone = phone.trim();
            localStorage.setItem('bot_user_phone', cleanPhone);
            setStatus('✅ ¡Verificación de WhatsApp confirmada por el bot! Redirigiendo al panel...');
            setTimeout(() => {
              router.push(`/?phone=${encodeURIComponent(cleanPhone)}`);
            }, 1000);
          }
        } catch (err) {
          // Silenciar errores de red en polling para reintentar
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWaiting, phone, router]);

  const handleRequestWhatsAppAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setStatus('Por favor ingresa un número de teléfono válido.');
      return;
    }
    const cleanPhone = phone.trim();
    setStatus('Iniciando autenticación real por WhatsApp...');
    setWaLinkInfo(null);
    setIsWaiting(false);

    try {
      const res = await fetch('/api/auth/initiate-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleanPhone }),
      });
      const data = await res.json();
      if (data.success) {
        setWaLinkInfo({
          whatsappLink: data.data.whatsappLink,
          token: data.data.token,
        });
        setIsWaiting(true);
        setStatus(`⏳ Esperando verificación... Haz clic en el botón de WhatsApp para enviar el mensaje al bot.`);
      } else {
        setStatus(`Error: ${data.error?.message || 'No se pudo iniciar la autenticación.'}`);
      }
    } catch (err: any) {
      setStatus(`Error de red: ${err.message}`);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
      <div style={{ maxWidth: '420px', width: '100%', padding: '32px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '1.5rem', fontWeight: 600 }}>🔒 Verificación Real por WhatsApp</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
          Ingresa tu número. El sistema abrirá el chat con el bot de WhatsApp para verificar tu identidad de forma real y automática.
        </p>

        {!waLinkInfo ? (
          <form onSubmit={handleRequestWhatsAppAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <input
                type="text"
                placeholder="Ej: +5491112345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontSize: '1rem' }}
              />
            </div>
            <button
              type="submit"
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            >
              Iniciar Verificación con WhatsApp
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', fontSize: '0.85rem', color: '#3b82f6' }}>
              📡 <strong>Escuchando verificación en tiempo real...</strong><br />
              Envía el mensaje al bot desde el número <strong>{phone}</strong>. La página te logueará automáticamente al recibir la confirmación.
            </div>
            <a
              href={waLinkInfo.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', width: '100%', padding: '14px', backgroundColor: '#25D366', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 700, textDecoration: 'none', textAlign: 'center', fontSize: '1.05rem', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)' }}
            >
              💬 Abrir Bot en WhatsApp y Enviar
            </a>
            <button
              onClick={() => { setWaLinkInfo(null); setStatus(null); setIsWaiting(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ← Ingresar otro número o reintentar
            </button>
          </div>
        )}

        {status && (
          <div style={{ marginTop: '16px', fontSize: '0.85rem', color: status.includes('✅') || status.includes('confirmada') ? '#2ecc71' : isWaiting ? '#3b82f6' : 'var(--color-error)' }}>
            {status}
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <a href="/" style={{ color: 'var(--color-primary)', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}>Cargando verificador real...</div>}>
      <LoginForm />
    </Suspense>
  );
}
