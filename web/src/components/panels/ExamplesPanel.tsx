'use client';

import { useState } from 'react';
import ModalWindow from '@/components/ModalWindow';
import WizardModal from '@/components/WizardModal';
import Icon from '@/components/Icon';

export default function ExamplesPanel() {
  return (
    <div style={{ padding: '24px', textAlign: 'left' }}>
      <h1>Panel de Recursos y Ejemplos de Ventanas</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Aquí puedes probar los diferentes patrones de ventanas modulares, asistentes (wizards) y flujos interactivos sin obstruir las vistas principales.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '24px',
        }}
      >
        {/* Tarjeta de Ejemplo 1: Modal Central */}
        <div
          style={{
            padding: '24px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="settings" style={{ width: '24px', height: '24px', color: 'var(--color-primary)' }} />
            <h3 style={{ margin: 0 }}>Ventana Modal con Navegación</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Abre una ventana centralizada con fondo difuminado y pestañas internas de listado y detalle.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <ModalWindow />
          </div>
        </div>

        {/* Tarjeta de Ejemplo 2: Asistente Wizard */}
        <div
          style={{
            padding: '24px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="help" style={{ width: '24px', height: '24px', color: 'var(--color-secondary)' }} />
            <h3 style={{ margin: 0 }}>Asistente Guiado (Wizard)</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Flujo paso a paso con validación de datos, selección de planes y confirmación.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <WizardModal />
          </div>
        </div>
      </div>
    </div>
  );
}
