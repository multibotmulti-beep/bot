'use client';

import { useState } from 'react';
import { loginUser } from '../../lib/auth';
import { useLoading } from '../loading/LoadingProvider';

export default function LoginPage({
  onNavigate,
  onLoginSuccess,
}: {
  onNavigate: (view: 'home' | 'login' | 'register') => void;
  onLoginSuccess: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    global?: string;
  }>({});
  const { startLoading, stopLoading } = useLoading();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};
    if (!username) newErrors.username = 'Falta este campo';
    if (!password) newErrors.password = 'Falta este campo';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    startLoading();
    const result = await loginUser(username, password);
    stopLoading();

    if (result.success) {
      // Asumimos que el backend envía el token en result.data.token
      if (result.user?.token) {
        localStorage.setItem('session_token', result.user.token);
      }
      onLoginSuccess();
    } else {
      setErrors({ global: 'Usuario o contraseña incorrectos.' });
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
    backgroundColor: 'var(--color-background)',
    fontFamily: 'sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-background)',
    padding: '1.5rem',
    borderRadius: '20px',
    boxShadow:
      '6px 6px 12px rgba(0, 0, 0, 0.1), -6px -6px 12px rgba(255, 255, 255, 0.5)',
    width: '90%',
    maxWidth: '300px',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem',
    margin: '0.4rem 0',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    fontSize: '0.8rem',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1
          style={{
            textAlign: 'center',
            marginBottom: '0.5rem',
            color: 'var(--color-text)',
            fontSize: '1.5rem',
          }}
        >
          Bienvenido
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-secondary)',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          Inicia sesión para continuar.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
          {errors.username && (
            <p style={{ color: 'var(--color-error)', fontSize: '0.8rem' }}>
              {errors.username}
            </p>
          )}
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {errors.password && (
            <p style={{ color: 'var(--color-error)', fontSize: '0.8rem' }}>
              {errors.password}
            </p>
          )}
          <button type="submit" className="btn-primary">
            Entrar
          </button>
        </form>
        {errors.global && (
          <p
            style={{
              color: 'var(--color-error)',
              textAlign: 'center',
              marginTop: '1rem',
            }}
          >
            {errors.global}
          </p>
        )}
        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.9rem',
            color: 'var(--color-text)',
          }}
        >
          ¿No tienes cuenta?{' '}
          <button onClick={() => onNavigate('register')} className="btn-text">
            Regístrate aquí
          </button>
        </p>
      </div>
    </div>
  );
}
