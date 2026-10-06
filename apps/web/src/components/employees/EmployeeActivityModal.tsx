'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

export default function EmployeeActivityModal({
  employee,
  onClose,
}: {
  employee: any;
  onClose: () => void;
}) {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, [employee.id]);

  const fetchActivity = async () => {
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.get_employee_activity',
          params: { userId: employee.id, limit: 50 },
        }),
      });
      const result = await response.json();
      if (result.success) setTimeline(result.data || []);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
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
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          minWidth: '500px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <h2>Actividad: {employee.username}</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {timeline.map((evento: any, index: number) => {
              const esFechaValida =
                typeof evento.fecha === 'string' &&
                !isNaN(Date.parse(evento.fecha));
              const fechaHumana = esFechaValida
                ? new Date(evento.fecha).toLocaleString('es-ES')
                : 'Fecha no disponible';

              return (
                <li
                  key={index}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    padding: '0.5rem 0',
                    color:
                      evento.estatus === 'SUCCESS'
                        ? 'inherit'
                        : 'var(--color-error)',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {evento.comando === 'Venta realizada'
                      ? '🛒 Venta'
                      : '⚙️ Sistema'}
                  </div>
                  <small>{fechaHumana}</small>
                  <p style={{ margin: '0.2rem 0', fontWeight: 'bold' }}>
                    {evento.resumen}
                  </p>
                  <details
                    style={{
                      fontSize: '0.8rem',
                      color: 'gray',
                      cursor: 'pointer',
                    }}
                  >
                    <summary>Ver detalles técnicos</summary>
                    <pre>{JSON.stringify(evento.detalle, null, 2)}</pre>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <button
          onClick={onClose}
          className="btn-secondary"
          style={{ marginTop: '1rem' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
