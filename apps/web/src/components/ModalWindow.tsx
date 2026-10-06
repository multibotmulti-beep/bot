'use client';

import { useState } from 'react';
import Icon from './Icon';
import logger from '@/lib/logger';

interface Item {
  id: string;
  title: string;
  description: string;
  status: string;
}

export default function ModalWindow() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'detail'>('list');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const items: Item[] = [
    { id: '1', title: 'Módulo Central Alpha', description: 'Configuración de parámetros y control general del sistema.', status: 'Activo' },
    { id: '2', title: 'Módulo Beta', description: 'Monitoreo de rendimiento y recursos en tiempo real.', status: 'En espera' },
    { id: '3', title: 'Módulo Gamma', description: 'Registro de auditoría y eventos recientes de seguridad.', status: 'Sincronizado' },
  ];

  const handleOpen = () => {
    setIsOpen(true);
    logger.info('Abriendo ventana modal central (Material Design)');
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveTab('list');
    setSelectedItem(null);
    logger.info('Cerrando ventana modal central');
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setActiveTab('detail');
    logger.info({ itemId: item.id }, 'Navegando a detalle dentro de la ventana modal');
  };

  const handleBackToList = () => {
    setActiveTab('list');
    setSelectedItem(null);
  };

  return (
    <>
      {/* Botón de activación en panel de recursos */}
      <button
        onClick={handleOpen}
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: 'var(--shadow-soft)',
          cursor: 'pointer',
          fontWeight: 600,
          width: '100%',
          transition: 'background 0.2s',
        }}
      >
        <Icon name="settings" style={{ width: '18px', height: '18px', color: 'white' }} />
        <span>Abrir Modal con Navegación</span>
      </button>

      {/* Ventana Modal con zIndex superior al Dock (1000) */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Cabecera */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 500, color: 'var(--color-text)' }}>
                {activeTab === 'list' ? 'Gestión de Elementos' : 'Detalle del Módulo'}
              </h2>
              <button
                onClick={handleClose}
                aria-label="Cerrar"
                style={{
                  background: 'none',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Contenido con navegación interna */}
            <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {activeTab === 'list' ? (
                <div>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                    Selecciona un módulo para inspeccionar su configuración sin abandonar la ventana:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        style={{
                          padding: '16px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-background)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text)' }}>{item.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{item.status}</div>
                        </div>
                        <span style={{ fontSize: '1rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>&rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={handleBackToList}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      padding: '0 0 16px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    &larr; Volver al listado
                  </button>

                  {selectedItem && (
                    <div
                      style={{
                        padding: '20px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                        {selectedItem.title}
                      </h3>
                      <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                        {selectedItem.description}
                      </p>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Estado:</span>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(26, 115, 232, 0.1)', color: 'var(--color-primary)' }}>
                          {selectedItem.status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pie */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleClose}
                style={{
                  padding: '10px 20px',
                  borderRadius: '20px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
