'use client';

import { useState, useEffect, useCallback } from 'react';
import { registerUser, loginUser } from '../../lib/auth';

// Función auxiliar para slugificar (debe ser idéntica a la del backend)
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Reemplazar espacios por guiones
    .replace(/[^\w-]+/g, '') // Eliminar caracteres no-palabra (excepto guiones)
    .replace(/--+/g, '-') // Reemplazar múltiples guiones por uno solo
    .replace(/^-+/, '') // Eliminar guiones al inicio
    .replace(/-+$/, ''); // Eliminar guiones al final
}

// Función debounce
const debounce = (func: Function, delay: number) => {
  let timeout: NodeJS.Timeout;
  return function (...args: any[]) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

export default function RegisterPage({
  onNavigate,
  onLoginSuccess,
}: {
  onNavigate: (view: 'home' | 'login' | 'register') => void;
  onLoginSuccess: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [storeDisplayName, setStoreDisplayName] = useState(''); // Nombre visible de la tienda
  const [storeSlug, setStoreSlug] = useState(''); // Slug para la URL
  const [isStoreNameAvailable, setIsStoreNameAvailable] = useState<
    boolean | null
  >(null);
  const [storeNameCheckMessage, setStoreNameCheckMessage] = useState('');

  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    storeDisplayName?: string;
    global?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  // Debounce para la verificación de disponibilidad del nombre
  const debouncedCheckStoreName = useCallback(
    debounce(async (slug: string) => {
      if (slug.length < 3) {
        setIsStoreNameAvailable(null);
        setStoreNameCheckMessage('');
        return;
      }
      setStoreNameCheckMessage('Verificando disponibilidad...');
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005';
        const response = await fetch(
          `${apiBase}/api/public/store/check-name/${slug}`
        );
        const data = await response.json();
        setIsStoreNameAvailable(data.isAvailable);
        setStoreNameCheckMessage(data.message);
      } catch (err) {
        setIsStoreNameAvailable(false);
        setStoreNameCheckMessage('Error al verificar disponibilidad.');
        console.error('Error checking store name:', err);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (storeSlug) {
      debouncedCheckStoreName(storeSlug);
    } else {
      setIsStoreNameAvailable(null);
      setStoreNameCheckMessage('');
    }
  }, [storeSlug, debouncedCheckStoreName]);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!username) newErrors.username = 'Falta este campo';
    if (password.length < 6)
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    if (!storeDisplayName)
      newErrors.storeDisplayName = 'El nombre de tu tienda es obligatorio.';

    // Solo si el slug no está vacío y la verificación ya se realizó (no es null)
    if (storeSlug && isStoreNameAvailable === false) {
      newErrors.storeDisplayName = 'Nombre de tienda ya en uso. Prueba otro.';
    } else if (!storeSlug || storeSlug.length < 3) {
      newErrors.storeDisplayName =
        'El nombre de tu tienda debe tener al menos 3 caracteres válidos para la URL.';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    // Enviamos el SLUG de la tienda como nombreCliente al backend
    const result = await registerUser(username, password, storeSlug);

    if (result.success) {
      // Auto-login post-registro
      const loginResult = await loginUser(username, password);
      if (loginResult.success) {
        if (loginResult.user?.token) {
          localStorage.setItem('session_token', loginResult.user.token);
        }
        onLoginSuccess();
      } else {
        onNavigate('login');
      }
    } else {
      let globalError = 'Error en registro. Intenta de nuevo.';
      if (
        result.message &&
        typeof result.message === 'string' &&
        result.message.includes('already exists')
      )
        globalError = 'El usuario ya existe.';
      setErrors({ global: globalError });
    }
    setLoading(false);
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
    boxSizing: 'border-box', // Importante para que el padding no afecte el ancho
  };

  const storeUrlStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color:
      isStoreNameAvailable === true
        ? '#2ecc71'
        : isStoreNameAvailable === false
          ? '#e74c3c'
          : '#888',
    marginTop: '0.2rem',
    marginBottom: '0.8rem',
    wordBreak: 'break-all',
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
          Crear cuenta
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-secondary)',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          Regístrate para empezar.
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
            <p
              style={{
                color: 'var(--color-error)',
                fontSize: '0.8rem',
                marginTop: '-0.4rem',
              }}
            >
              {errors.username}
            </p>
          )}
          <input
            type="password"
            placeholder="Contraseña (mín 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {errors.password && (
            <p
              style={{
                color: 'var(--color-error)',
                fontSize: '0.8rem',
                marginTop: '-0.4rem',
              }}
            >
              {errors.password}
            </p>
          )}
          <input
            type="text"
            placeholder="Nombre de tu Tienda Online"
            value={storeDisplayName}
            onChange={(e) => {
              setStoreDisplayName(e.target.value);
              setStoreSlug(slugify(e.target.value));
            }}
            style={inputStyle}
          />
          {storeDisplayName && (
            <p
              style={{
                ...storeUrlStyle,
                color:
                  isStoreNameAvailable === true
                    ? '#2ecc71'
                    : isStoreNameAvailable === false
                      ? '#e74c3c'
                      : '#888',
              }}
            >
              www.web.com/{storeSlug}
            </p>
          )}
          {errors.storeDisplayName && (
            <p
              style={{
                color: 'var(--color-error)',
                fontSize: '0.8rem',
                marginTop: '-0.4rem',
              }}
            >
              {errors.storeDisplayName}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !isStoreNameAvailable}
            className="btn-primary"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
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
          ¿Ya tienes cuenta?{' '}
          <button onClick={() => onNavigate('login')} className="btn-text">
            Inicia sesión aquí
          </button>
        </p>
      </div>
    </div>
  );
}
