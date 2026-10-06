'use client';

import { useState, useEffect } from 'react';
import SalesStatsWidget from './SalesStatsWidget';
import EmployeeTasksWidget from './EmployeeTasksWidget';
import BusinessAlertsWidget from './BusinessAlertsWidget';
import TopProductsWidget from './TopProductsWidget';
import PurchasesListWidget from './PurchasesListWidget';
import Icon from '../Icon';

interface HomePageProps {
  user: any;
  onNavigate?: (view: any) => void;
}

export default function HomePage({ user, onNavigate }: HomePageProps) {
  return (
    <div
      style={{
        padding: 'var(--space-md)',
        height: 'calc(100vh - 80px)',
        overflowY: 'auto',
        textAlign: 'left',
      }}
    >
      <h1>¡Hola, {user.username}!</h1>
      <p
        style={{
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-md)',
        }}
      >
        Rol: {user.role_name}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--space-md)',
        }}
      >
        {/* Lógica para el DUEÑO */}
        {user.role_name === 'DUEÑO' && (
          <>
            <SalesStatsWidget />
            <TopProductsWidget />
            <PurchasesListWidget />
            <BusinessAlertsWidget />

            <div
              style={{
                padding: 'var(--space-md)',
                background:
                  'linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                marginTop: 'var(--space-sm)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  marginBottom: '1rem',
                }}
              >
                <Icon
                  name="settings"
                  style={{
                    width: '24px',
                    height: '24px',
                    color: 'var(--color-primary)',
                  }}
                />
                <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>
                  Aplicación Oficial - Gestión Inteligente
                </h3>
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  marginBottom: '1.5rem',
                  color: 'var(--color-text)',
                }}
              >
                <strong>
                  Obtén la máxima productividad con nuestra App nativa:
                </strong>
                <ul
                  style={{
                    paddingLeft: '1.5rem',
                    marginTop: '0.5rem',
                    listStyleType: 'disc',
                  }}
                >
                  <li>Escáner integrado.</li>
                  <li>Mayor velocidad que los navegadores.</li>
                  <li>Rendimiento de aplicación dedicada.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <a
                  href="/downloads/app-armeabi-v7a-release.apk"
                  download
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    borderRadius: '20px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-soft)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Icon
                    name="download"
                    style={{ width: '16px', height: '16px' }}
                  />
                  Gama Baja
                </a>
                <a
                  href="/downloads/app-arm64-v8a-release.apk"
                  download
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: '20px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    boxShadow: 'var(--shadow-soft)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Icon
                    name="download"
                    style={{ width: '16px', height: '16px', color: 'white' }}
                  />
                  Gama Media/Alta
                </a>
              </div>
            </div>
          </>
        )}

        {/* Lógica para el EMPLEADO */}
        {user.role_name === 'EMPLEADO' && (
          <>
            <EmployeeTasksWidget user={user} />
          </>
        )}
      </div>
    </div>
  );
}
