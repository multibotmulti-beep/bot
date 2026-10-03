'use client';

import { useState, Suspense } from 'react';
import Dock from '@/components/Dock';
import { panelRegistry } from '@/lib/panelRegistry';

type View = keyof typeof panelRegistry;

export default function Page() {
  const [currentView, setCurrentView] = useState<View>('home');

  const ActivePanel = panelRegistry[currentView] || panelRegistry['home'];

  return (
    <main
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          overflowY: 'auto',
          paddingBottom: '90px', // Margen seguro para el Dock flotante
        }}
      >
        <Suspense
          fallback={
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Cargando panel de forma optimizada...
            </div>
          }
        >
          <ActivePanel />
        </Suspense>
      </div>
      <Dock onNavigate={(view) => setCurrentView(view as View)} activeView={currentView} />
    </main>
  );
}
