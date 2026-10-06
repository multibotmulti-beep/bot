'use client';

import React from 'react';
import { useTour } from '../tour/TourProvider';
import { guides } from '../../lib/guides';

export default function HelpSupportPanel({ onClose }: { onClose: () => void }) {
  const { startTour } = useTour();

  const categories = [
    {
      title: 'Inventario',
      guides: [{ name: 'Guía de Stock', id: 'newUser' }], // Ejemplo
    },
    {
      title: 'Ventas',
      guides: [{ name: 'Guía de Ventas', id: 'salesTour' }],
    },
    {
      title: 'Empleados',
      guides: [{ name: 'Gestión de Empleados', id: 'employeeTour' }], // A definir en guides.ts
    },
  ];

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        maxWidth: '600px',
        margin: '2rem auto',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-soft)',
        position: 'relative',
        marginTop: '3rem',
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
          padding: '0.5rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '1rem',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        Ayuda y Soporte
      </div>

      <div
        style={{
          marginTop: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {categories.map((cat) => (
          <div key={cat.title}>
            <h4 style={{ marginBottom: '0.5rem' }}>{cat.title}</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {cat.guides.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    const flow = guides[g.id];
                    if (flow) {
                      startTour(flow);
                      onClose();
                    }
                  }}
                  className="btn-secondary"
                  style={{ textAlign: 'left', padding: '0.8rem' }}
                >
                  ▶ Ejecutar {g.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Próximamente: Videotutoriales y capturas de pantalla integradas.
        </p>
      </div>
    </div>
  );
}
