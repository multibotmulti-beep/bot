'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api';

export default function CreateEmployeeForm({
  onEmployeeCreated,
  onClose,
}: {
  onEmployeeCreated: () => void;
  onClose?: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    nombre?: string;
    global?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!username) newErrors.username = 'Falta el nombre de usuario';
    if (password.length < 6)
      newErrors.password = 'Contraseña (mín 6 caracteres)';
    if (!nombre) newErrors.nombre = 'Falta el nombre del empleado';
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
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.create',
          params: {
            username,
            password,
            nombre: nombre,
            role: 'EMPLEADO',
            type: 'human',
          },
        }),
      });
      const result = await response.json();

      if (result.success) {
        setUsername('');
        setPassword('');
        setNombre('');
        onEmployeeCreated();
      } else {
        let globalError = 'Error al crear empleado.';
        if (
          result.message &&
          typeof result.message === 'string' &&
          result.message.includes('already exists')
        ) {
          globalError = 'El usuario ya existe.';
        }
        setErrors({ global: globalError });
      }
    } catch (err) {
      setErrors({ global: 'Error de conexión.' });
    }
    setLoading(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
          width: '100%',
          maxWidth: '400px',
          margin: '0',
          position: 'relative',
          // Sombra de luz intensa en lugar de borde rígido
          boxShadow:
            '0 0 20px 5px rgba(var(--color-primary-rgb, 37, 99, 235), 0.3)',
          border: '1px solid var(--color-border)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '1rem',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          Nuevo Empleado
        </div>

        <div style={{ marginTop: '1rem' }}></div>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        />
        {errors.username && (
          <p
            style={{
              color: 'var(--color-error)',
              fontSize: '0.8rem',
              margin: 0,
            }}
          >
            {errors.username}
          </p>
        )}

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        />
        {errors.password && (
          <p
            style={{
              color: 'var(--color-error)',
              fontSize: '0.8rem',
              margin: 0,
            }}
          >
            {errors.password}
          </p>
        )}

        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        />
        {errors.nombre && (
          <p
            style={{
              color: 'var(--color-error)',
              fontSize: '0.8rem',
              margin: 0,
            }}
          >
            {errors.nombre}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ marginTop: '0.5rem', padding: '0.5rem' }}
        >
          {loading ? 'Creando...' : 'Crear Empleado'}
        </button>
        {errors.global && (
          <p
            style={{
              color: 'var(--color-error)',
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            {errors.global}
          </p>
        )}
      </form>
    </div>
  );
}
