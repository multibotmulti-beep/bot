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

export default function CollapsibleDrawer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'detail'>('list');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const items: Item[] = [
    { id: '1', title: 'Elemento Modular A', description: 'Configuración y parámetros avanzados del módulo.', status: 'Activo' },
    { id: '2', title: 'Elemento Modular B', description: 'Control de recursos y métricas de rendimiento.', status: 'Pendiente' },
    { id: '3', title: 'Elemento Modular C', description: 'Auditoría de eventos y registros del sistema.', status: 'Optimizado' },
  ];

  const handleToggle = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    logger.info({ expanded: nextState }, 'Cambio de estado en ventana retráctil (Drawer)');
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setActiveTab('detail');
    logger.info({ itemId: item.id }, 'Navegando a detalle interno en ventana retráctil');
  };

  const handleBackToList = () => {
    setActiveTab('list');
    setSelectedItem(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '360px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-soft)',
        zIndex: 1000,
        overflow: 'hidden',
        transition: 'transform 0.3s ease-in-out',
        transform: isExpanded ? 'translateY(0)' : 'translateY(calc(100% - 56px))',
      }}
    >
      {/* Barra de cabecera / Manija retráctil */}
      <div
        onClick={handleToggle}
        style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: 'var(--color-background)',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="menu" style={{ width: '20px', height: '20px', color: 'var(--color-primary)' }} />
          <strong style={{ fontSize: '0.95rem' }}>Ventana Retráctil Interactiva</strong>
        </div>
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--color-text)',
          }}
          aria-label={isExpanded ? 'Minimizar' : 'Maximizar'}
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {/* Contenido deslizable de la ventana con navegación interna */}
      <div style={{ padding: '16px', maxHeight: '350px', overflowY: 'auto' }}>
        {activeTab === 'list' ? (
          <div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Selecciona un elemento para navegar en el detalle sin salir de esta ventana:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.status}</div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>&rarr;</span>
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
                fontSize: '0.85rem',
                padding: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              &larr; Volver al listado
            </button>

            {selectedItem && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--color-primary)' }}>{selectedItem.title}</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  {selectedItem.description}
                </p>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                  Estado actual: <span style={{ color: 'var(--color-secondary)' }}>{selectedItem.status}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
