'use client';

import { useState } from 'react';
import Icon from './Icon';
import logger from '@/lib/logger';

export default function WizardModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', plan: 'standard' });

  const handleOpen = () => {
    setIsOpen(true);
    setStep(1);
    logger.info('Abriendo Wizard Modal (Paso a paso)');
  };

  const handleClose = () => {
    setIsOpen(false);
    logger.info('Cerrando Wizard Modal');
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    logger.info({ formData }, 'Wizard completado con éxito');
    alert('¡Configuración completada con éxito!');
    handleClose();
  };

  return (
    <>
      {/* Botón de activación en panel de recursos */}
      <button
        onClick={handleOpen}
        style={{
          backgroundColor: 'var(--color-secondary)',
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
        <Icon name="help" style={{ width: '18px', height: '18px', color: 'white' }} />
        <span>Abrir Asistente Guiado</span>
      </button>

      {/* Modal Wizard con zIndex superior al Dock (1000) */}
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
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 500, color: 'var(--color-text)' }}>
                Asistente (Paso {step} de 3)
              </h3>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Contenido del Paso */}
            <div style={{ padding: '24px', minHeight: '180px' }}>
              {step === 1 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0' }}>1. Información Personal</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>Ingresa tus datos principales.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', outline: 'none' }}
                    />
                    <input
                      type="email"
                      placeholder="Correo"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', outline: 'none' }}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0' }}>2. Selección de Plan</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>Elige el plan que prefieras.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="plan"
                        checked={formData.plan === 'standard'}
                        onChange={() => setFormData({ ...formData, plan: 'standard' })}
                      />
                      <span>Plan Estándar</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="plan"
                        checked={formData.plan === 'pro'}
                        onChange={() => setFormData({ ...formData, plan: 'pro' })}
                      />
                      <span>Plan Profesional</span>
                    </label>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0' }}>3. Confirmación</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>Revisa tus datos:</p>
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--color-background)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
                    <div><strong>Nombre:</strong> {formData.name || '(No especificado)'}</div>
                    <div><strong>Correo:</strong> {formData.email || '(No especificado)'}</div>
                    <div><strong>Plan:</strong> {formData.plan.toUpperCase()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Pie */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              {step > 1 ? (
                <button
                  onClick={handlePrev}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Anterior
                </button>
              ) : <div />}

              {step < 3 ? (
                <button
                  onClick={handleNext}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Finalizar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
