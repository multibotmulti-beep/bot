'use client';

export default function QuickActionsWidget({
  onNavigate,
}: {
  onNavigate?: (view: any) => void;
}) {
  const actions = [
    { label: 'Nueva Venta', icon: '💰', view: 'sales' },
    { label: 'Añadir Stock', icon: '📦', view: 'stock' },
    { label: 'Gestionar Personal', icon: '👥', view: 'employees' },
  ];

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3>Acciones Rápidas</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-sm)',
        }}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => onNavigate?.(action.view as any)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              padding: 'var(--space-sm)',
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{action.icon}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
