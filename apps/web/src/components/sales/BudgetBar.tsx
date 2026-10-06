'use client';

export default function BudgetBar({
  total,
  onCheckout,
}: {
  total: number;
  onCheckout: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '5rem',
        left: 0,
        width: '100%',
        padding: '1rem',
        backgroundColor: 'var(--color-background)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
        Total: ${total.toFixed(2)}
      </span>
      <button onClick={onCheckout}>Finalizar Venta</button>
    </div>
  );
}
