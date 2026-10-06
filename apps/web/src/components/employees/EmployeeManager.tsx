'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api';

interface EmployeeManagerProps {
  onUpdate: () => void;
}

export default function EmployeeManager({ onUpdate }: EmployeeManagerProps) {
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const addEmployee = async () => {
    if (!nombre || !username || !password) return;
    setLoading(true);
    try {
      await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.create',
          params: { nombre, username, password, role: 'EMPLEADO' },
        }),
      });
      setNombre('');
      setUsername('');
      setPassword('');
      onUpdate();
    } catch (error) {
      console.error('Error creating employee:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        background: 'var(--color-background)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h4>Agregar Nuevo Empleado</h4>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-sm)',
        }}
      >
        <input
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={addEmployee} disabled={loading}>
          {loading ? 'Creando...' : 'Crear Empleado'}
        </button>
      </div>
    </div>
  );
}
