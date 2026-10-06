import { useState } from 'react';

interface QuickProductModalProps {
  product: { name: string; price: number; unit: string } | null;
  onClose: () => void;
  onAdd: (qty: number) => void;
}

export default function QuickProductModal({
  product,
  onClose,
  onAdd,
}: QuickProductModalProps) {
  const [qty, setQty] = useState('1');

  if (!product) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 'var(--space-md)',
      }}
    >
      <div
        style={{
          background: 'var(--color-background)',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>{product.name}</h2>
        <p>
          Precio: ${product.price} por {product.unit}
        </p>

        <label style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>
          Cantidad ({product.unit}):
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-sm)',
              marginTop: 'var(--space-xs)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
            }}
          />
        </label>

        <div
          style={{
            display: 'flex',
            gap: 'var(--space-md)',
            marginTop: 'var(--space-lg)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onAdd(parseFloat(qty))}
            style={{
              flex: 1,
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'white',
            }}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
