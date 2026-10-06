'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api';

export default function CreateEmployeeModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLEADO');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!username || username.trim().length < 3) {
      alert('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }

    // Construir el payload solo con valores definidos
    const params: any = { nombre, role, password, type: 'human' };
    if (username && username.trim() !== '') {
      params.username = username;
    }

    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.create',
          params,
        }),
      });
      const result = await response.json();

      if (result.success) {
        alert('Empleado creado correctamente.');
        onAdd();
        onClose();
      } else {
        alert(
          `Error al crear empleado: ${result.message || 'Error desconocido'}`
        );
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Ocurrió un error al conectar con el servidor.');
    }
  };

  return (
    <div
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
        zIndex: 1000,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: 'var(--color-surface)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
          width: '90%',
          maxWidth: '400px',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 var(--space-sm) 0' }}>
          Nuevo Empleado
        </h2>

        <input
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        />
        <input
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <option value="EMPLEADO">EMPLEADO</option>
          {/* Restringido: <option value="DUEÑO">DUEÑO</option> */}
        </select>

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: 'var(--space-sm)',
          }}
        >
          <button type="submit" className="btn-primary" style={{ flex: 1 }}>
            Crear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
