'use client';

import { useState } from 'react';
import Icon from '../Icon';

export default function EmployeeCard({
  employee,
  onDelete,
  onUpdatePermissions,
  onShowActivity,
}: {
  employee: any;
  onDelete: (userId: number) => void;
  onUpdatePermissions: (employee: any) => void;
  onShowActivity: (employee: any) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="masonry-item"
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md)',
        backgroundColor: 'var(--color-background)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-soft)',
        marginBottom: 'var(--space-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}
        >
          <Icon name="manager" />
          <h3>{employee.username}</h3>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>
          {employee.role_name}
        </span>
      </div>

      {isExpanded && (
        <div
          style={{
            marginTop: 'var(--space-md)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-md)',
          }}
        >
          <p style={{ fontSize: '0.85rem' }}>
            ID: <strong>{employee.id}</strong>
          </p>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-md)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(employee.id);
              }}
              style={{
                backgroundColor: 'var(--color-error-bg)',
                color: 'var(--color-error)',
                border: 'none',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              Eliminar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdatePermissions(employee);
              }}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              Permisos
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowActivity(employee);
              }}
              style={{
                backgroundColor: 'var(--color-secondary)',
                color: 'white',
                border: 'none',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              Actividad
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
