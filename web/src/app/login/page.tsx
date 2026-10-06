'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    if (phoneParam) {
      const cleanPhone = phoneParam.trim();
      localStorage.setItem('bot_user_phone', cleanPhone);
      setStatus(`¡Autenticación exitosa! Redirigiendo...`);
      setTimeout(() => {
        router.push(`/?phone=${encodeURIComponent(cleanPhone)}`);
      }, 1000);
    }
  }, [searchParams, router]);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setStatus('Por favor ingresa un número de teléfono válido.');
      return;
    }
    const cleanPhone = phone.trim();
    localStorage.setItem('bot_user_phone', cleanPhone);
    setStatus('¡Sesión iniciada con éxito! Redirigiendo...');
    setTimeout(() => {
      window.location.href = `/?phone=${encodeURIComponent(cleanPhone)}`;
    }, 1000);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
      <div style={{ maxWidth: '400px', width: '100%', padding: '32px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '1.5rem', fontWeight: 600 }}>🔑 Iniciar Sesión con WhatsApp</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
          Ingresa tu número de teléfono registrado en WhatsApp para acceder a tus bots y guardarlos en la base de datos.
        </p>

        <form onSubmit={handleManualLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            Iniciar Sesión
          </button>
        </form>

        {status && (
          <div style={{ marginTop: '16px', fontSize: '0.85rem', color: status.includes('éxito') ? '#2ecc71' : 'var(--color-text-muted)' }}>
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
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}>Cargando login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
