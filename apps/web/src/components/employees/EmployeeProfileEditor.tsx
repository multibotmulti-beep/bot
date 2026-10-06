'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api';

interface EmployeeProfileEditorProps {
  employee: any;
  onUpdate: () => void;
}

export default function EmployeeProfileEditor({
  employee,
  onUpdate,
}: EmployeeProfileEditorProps) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword) return;
    setLoading(true);
    try {
      await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.change_password',
          params: { userId: employee.id, newPassword },
        }),
      });
      alert('Contraseña cambiada exitosamente.');
      setNewPassword('');
      setShowPasswordInput(false);
      onUpdate();
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    console.log(
      '[DEBUG] Eliminando empleado, ID:',
      employee.id,
      'Tipo:',
      typeof employee.id
    );
    if (!confirm(`¿Estás seguro de eliminar a ${employee.name}?`)) return;
    setDeleteLoading(true);
    try {
      await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.delete',
          params: { userId: String(employee.id) },
        }),
      });
      alert('Empleado eliminado exitosamente.');
      onUpdate(); // Para refrescar la lista y deseleccionar al empleado
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Error al eliminar el empleado.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <h4 style={{ margin: '0 0 var(--space-md) 0' }}>
        Perfil de {employee.name}
      </h4>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-xs)',
          marginBottom: 'var(--space-md)',
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>ID:</strong> {employee.id}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Usuario:</strong> {employee.username}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Rol:</strong> {employee.role}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Fecha de Ingreso:</strong>{' '}
          {new Date(employee.joinedAt).toLocaleDateString()}
        </p>
      </div>

      <div
        style={{
          marginTop: 'var(--space-md)',
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-md)',
        }}
      >
        <h5 style={{ margin: '0 0 var(--space-sm) 0' }}>
          Acciones de Seguridad
        </h5>
        <button
          onClick={() => setShowPasswordInput(!showPasswordInput)}
          className="btn-secondary"
          style={{ width: '100%', padding: '0.5rem', fontWeight: 'bold' }}
        >
          {showPasswordInput ? 'Cancelar' : 'Cambiar Contraseña'}
        </button>

        {showPasswordInput && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-sm)',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="password"
              placeholder="Nueva Contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                flex: '1 1 200px',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="btn-primary"
              style={{ padding: '0.5rem var(--space-md)' }}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}

        <button
          onClick={handleDeleteEmployee}
          disabled={deleteLoading}
          className="btn-danger"
          style={{
            width: '100%',
            padding: 'var(--space-sm)',
            marginTop: 'var(--space-md)',
            fontWeight: 'bold',
          }}
        >
          {deleteLoading ? 'Eliminando...' : 'Eliminar Empleado'}
        </button>
      </div>
    </div>
  );
}
