'use client';

import { useState } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';

interface Item {
  id: string;
  title: string;
  description: string;
  status: string;
}

export default function ResourcesPanel() {
  // Estado para la Modal de Ejemplo 1
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'detail'>('list');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Estado para el Wizard de Ejemplo 2
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', plan: 'standard' });

  // Estado para el Drawer Retráctil de Ejemplo 3
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  const items: Item[] = [
    { id: '1', title: 'Módulo Central Alpha', description: 'Configuración de parámetros y control general del sistema.', status: 'Activo' },
    { id: '2', title: 'Módulo Beta', description: 'Monitoreo de rendimiento y recursos en tiempo real.', status: 'En espera' },
    { id: '3', title: 'Módulo Gamma', description: 'Registro de auditoría y eventos recientes de seguridad.', status: 'Sincronizado' },
  ];

  return (
    <div style={{ padding: '24px', textAlign: 'left' }}>
      <h1>Panel Dedicado a Recursos y Ventanas</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Aquí se centralizan todos los componentes interactivos, modales, asistentes y flujos de ventanas sin saturar la interfaz principal.
      </p>

      {/* Grid de Ejemplos de Recursos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '24px',
        }}
      >
        {/* Recurso 1: Ventana Modal con Navegación Interna */}
        <div style={{ padding: '24px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Icon name="settings" style={{ width: '24px', height: '24px', color: 'var(--color-primary)' }} />
            <h3 style={{ margin: 0 }}>1. Ventana Modal (Listado / Detalle)</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
            Abre una ventana flotante central con navegación interna entre listas y detalles sin salir de la vista.
          </p>
          <button
            onClick={() => {
              setIsModalOpen(true);
              logger.info('Abriendo modal desde Panel de Recursos');
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Abrir Modal Central
          </button>
        </div>

        {/* Recurso 2: Asistente Paso a Paso (Wizard) */}
        <div style={{ padding: '24px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Icon name="help" style={{ width: '24px', height: '24px', color: 'var(--color-secondary)' }} />
            <h3 style={{ margin: 0 }}>2. Asistente (Wizard Multipasos)</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
            Abre un asistente guiado de configuración de múltiples pasos con validación y confirmación.
          </p>
          <button
            onClick={() => {
              setIsWizardOpen(true);
              setStep(1);
              logger.info('Abriendo Wizard desde Panel de Recursos');
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Iniciar Asistente
          </button>
        </div>

        {/* Recurso 3: Ventana Retráctil (Drawer) */}
        <div style={{ padding: '24px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Icon name="menu" style={{ width: '24px', height: '24px', color: 'var(--color-primary)' }} />
            <h3 style={{ margin: 0 }}>3. Ventana Retráctil (Drawer)</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
            Despliega un panel retráctil inferior que se expande y contrae fluidamente.
          </p>
          <button
            onClick={() => {
              setIsDrawerExpanded(!isDrawerExpanded);
              logger.info({ expanded: !isDrawerExpanded }, 'Toggle Drawer desde Panel de Recursos');
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
              borderRadius: '20px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isDrawerExpanded ? 'Ocultar Drawer' : 'Mostrar Drawer'}
          </button>
        </div>
      </div>

      {/* --- MODAL 1 --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: '0 24px 38px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{activeTab === 'list' ? 'Gestión de Elementos' : 'Detalle'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>✕</button>
            </div>
            <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {activeTab === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map((item) => (
                    <div key={item.id} onClick={() => { setSelectedItem(item); setActiveTab('detail'); }} style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.status}</div>
                      </div>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>&rarr;</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setActiveTab('list')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, paddingBottom: '12px' }}>&larr; Volver</button>
                  {selectedItem && (
                    <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                      <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>{selectedItem.title}</h3>
                      <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{selectedItem.description}</p>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Estado: <span style={{ color: 'var(--color-secondary)' }}>{selectedItem.status}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-border)', cursor: 'pointer', fontWeight: 600 }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- WIZARD MODAL 2 --- */}
      {isWizardOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: '0 24px 38px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Asistente (Paso {step} de 3)</h2>
              <button onClick={() => setIsWizardOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>✕</button>
            </div>
            <div style={{ padding: '24px', minHeight: '160px' }}>
              {step === 1 && (
                <div>
                  <h4>1. Datos Básicos</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <input type="text" placeholder="Nombre" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }} />
                  </div>
                </div>
              )}
              {step === 2 && (
                <div>
                  <h4>2. Plan</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer' }}>
                    <input type="radio" checked={formData.plan === 'standard'} onChange={() => setFormData({ ...formData, plan: 'standard' })} />
                    <span>Estándar</span>
                  </label>
                </div>
              )}
              {step === 3 && (
                <div>
                  <h4>3. Confirmación</h4>
                  <p>Nombre: {formData.name || '-'}</p>
                  <p>Plan: {formData.plan}</p>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              {step > 1 ? <button onClick={() => setStep(step - 1)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>Anterior</button> : <div />}
              {step < 3 ? <button onClick={() => setStep(step + 1)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}>Siguiente</button> : <button onClick={() => { alert('¡Completado!'); setIsWizardOpen(false); }} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer' }}>Finalizar</button>}
            </div>
          </div>
        </div>
      )}

      {/* --- DRAWER RETRÁCTIL 3 --- */}
      {isDrawerExpanded && (
        <div style={{ position: 'fixed', bottom: '80px', right: '24px', width: '340px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)', zIndex: 1050, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0 }}>Panel Retráctil Activo</h4>
            <button onClick={() => setIsDrawerExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Este componente demuestra una ventana flotante retráctil controlada desde el panel de recursos.
          </p>
        </div>
      )}
    </div>
  );
}
