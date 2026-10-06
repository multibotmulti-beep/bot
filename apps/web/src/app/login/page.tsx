'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('Verificando acceso por WhatsApp...');

  useEffect(() => {
    const phone = searchParams.get('phone');
    const token = searchParams.get('token');

    if (phone) {
      const cleanPhone = phone.trim();
      localStorage.setItem('bot_user_phone', cleanPhone);
      setStatus(`¡Autenticación exitosa! Bienvenido, ${cleanPhone}. Redirigiendo a tu panel...`);
      setTimeout(() => {
        router.push(`/?phone=${encodeURIComponent(cleanPhone)}`);
      }, 1200);
    } else {
      setStatus('Enlace de inicio de sesión inválido o incompleto.');
    }
  }, [searchParams, router]);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
      <div style={{ maxWidth: '400px', padding: '32px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>🔑 Acceso WhatsApp</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>{status}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Cargando acceso...</div>}>
      <LoginForm />
    </Suspense>
  );
}
