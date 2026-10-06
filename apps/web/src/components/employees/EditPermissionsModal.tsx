'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api';

export default function EditPermissionsModal({
  employee,
  onClose,
  onUpdate,
}: {
  employee: any;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [permissions, setPermissions] = useState<string>(
    employee.permissions ? employee.permissions.join(', ') : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const permArray = permissions.split(',').map((p) => p.trim());

    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.update_permissions',
          params: { userId: employee.id, permissions: permArray },
        }),
      });
      const result = await response.json();
      if (result.success) {
        onUpdate();
        onClose();
      } else {
        alert(`Error al actualizar permisos: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
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
          backgroundColor: 'var(--color-background)',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          minWidth: '300px',
        }}
      >
        <h2>Permisos: {employee.username}</h2>
        <input
          placeholder="Permisos (separados por coma)"
          value={permissions}
          onChange={(e) => setPermissions(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit">Guardar</button>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
