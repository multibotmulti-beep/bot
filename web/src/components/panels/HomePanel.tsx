'use client';

import { useState } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';

type SubView = 'overview' | 'orders' | 'shipping';

export default function HomePanel() {
  const [subView, setSubView] = useState<SubView>('overview');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const handleSubNavigate = (view: SubView) => {
    logger.info({ subView: view }, 'Navegación interna en ventana de HomePanel');
    setSubView(view);
    setSelectedOrder(null);
  };

  return (
    <div style={{ padding: '24px', textAlign: 'left' }}>
      <h1>Panel de Inicio</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Bienvenido a la plantilla modular con Dock y sistema de paneles unificados (100% SVG).
      </p>

      {/* Widget principal unificado */}
      <div style={{ marginTop: '24px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)', overflow: 'hidden' }}>
        {/* Barra de menú interna con SVG */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <button
            onClick={() => handleSubNavigate('overview')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: subView === 'overview' ? 'var(--color-surface)' : 'transparent',
              color: subView === 'overview' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: subView === 'overview' ? '2px solid var(--color-primary)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Icon name="chart" style={{ width: '18px', height: '18px' }} />
            <span>Resumen General</span>
          </button>
          <button
            onClick={() => handleSubNavigate('orders')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: subView === 'orders' ? 'var(--color-surface)' : 'transparent',
              color: subView === 'orders' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: subView === 'orders' ? '2px solid var(--color-primary)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Icon name="shopping" style={{ width: '18px', height: '18px' }} />
            <span>Órdenes Activas</span>
          </button>
          <button
            onClick={() => handleSubNavigate('shipping')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: subView === 'shipping' ? 'var(--color-surface)' : 'transparent',
              color: subView === 'shipping' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: subView === 'shipping' ? '2px solid var(--color-primary)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Icon name="shipping" style={{ width: '18px', height: '18px' }} />
            <span>Configuración de Envío</span>
          </button>
        </div>

        {/* Contenido dinámico */}
        <div style={{ padding: '24px' }}>
          {subView === 'overview' && (
            <div>
              <h3>Resumen de Actividad</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Estado del sistema: <strong>Operacional</strong>. Sistema gráfico 100% basado en SVG.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginTop: '16px',
                }}
              >
                <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                  <h4>Ventas Hoy</h4>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'var(--color-primary)' }}>$1,245.00</p>
                </div>
                <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                  <h4>Pedidos Pendientes</h4>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'var(--color-primary)' }}>3</p>
                </div>
              </div>
            </div>
          )}

          {subView === 'orders' && (
            <div>
              <h3>Listado de Órdenes</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Selecciona una orden para ver los detalles de envío y contacto:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {['Pedido #101 - Juan Pérez', 'Pedido #102 - María Gómez', 'Pedido #103 - Carlos Ruiz'].map((order) => (
                  <div
                    key={order}
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: selectedOrder === order ? 'var(--color-background)' : 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{order}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>Ver Detalle &rarr;</span>
                  </div>
                ))}
              </div>

              {selectedOrder && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-primary)',
                  }}
                >
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>Detalle de: {selectedOrder}</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Método de Pago: Transferencia | Envío a domicilio
                  </p>
                  <button
                    onClick={() => alert(`Enviando notificación para ${selectedOrder}`)}
                    style={{
                      padding: '10px 18px',
                      background: 'var(--color-secondary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Icon name="chat" style={{ width: '18px', height: '18px', color: 'white' }} />
                    <span>Enviar Comprobante</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {subView === 'shipping' && (
            <div>
              <h3>Configuración de Envíos y Retiros</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Establece las opciones disponibles para tus clientes.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
                  <span>Habilitar Retiro en Local</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
                  <span>Habilitar Envío a Domicilio</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
