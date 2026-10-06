'use client';

import { useState } from 'react';

// Configuración centralizada de los pasos del flujo
const FLUX_STEPS = [
  {
    id: 'create_product',
    title: 'Agrega tu primer producto',
    description: 'Empieza organizando tu inventario.',
    action: 'stock',
    icon: '📦',
  },
  {
    id: 'make_sale',
    title: '¡Haz tu primera venta!',
    description: 'Registra tus movimientos comerciales.',
    action: 'sales',
    icon: '💰',
  },
  {
    id: 'view_reports',
    title: 'Revisa tus reportes',
    description: 'Analiza el crecimiento de tu negocio.',
    action: 'home',
    icon: '📈',
  },
];

interface GuidedActionWidgetProps {
  user: any;
  onNavigate?: (view: any) => void;
}

export default function GuidedActionWidget({
  user,
  onNavigate,
}: GuidedActionWidgetProps) {
  // En un entorno real, este índice se obtendría del backend o localStorage
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = FLUX_STEPS[currentStepIndex];

  if (!step) return null; // Tour completado

  const handleAction = () => {
    onNavigate?.(step.action);
    // Lógica para avanzar al siguiente paso tras realizar la acción
    if (currentStepIndex < FLUX_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        background: 'var(--color-primary-soft)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-primary)',
        marginBottom: 'var(--space-md)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>
        {step.icon}
      </div>
      <h3
        style={{
          color: 'var(--color-primary)',
          margin: '0 0 var(--space-xs) 0',
        }}
      >
        {step.title}
      </h3>
      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--color-text)',
          marginBottom: 'var(--space-md)',
        }}
      >
        {step.description}
      </p>

      <button
        onClick={handleAction}
        style={{
          padding: 'var(--space-sm) var(--space-lg)',
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Continuar
      </button>
    </div>
  );
}
