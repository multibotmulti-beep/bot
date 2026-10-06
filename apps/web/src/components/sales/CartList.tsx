'use client';

interface CartItem {
  code: string;
  name: string;
  price: number;
  qty: number;
  stock?: number;
}

export default function CartList({
  items,
  onUpdateQty,
  products,
}: {
  items: CartItem[];
  onUpdateQty: (code: string, delta: number) => void;
  products: any[];
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
      {items.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-secondary)' }}>
          Carrito vacío
        </p>
      ) : (
        items.map((item) => {
          const product = products.find((p) => p.code === item.code);
          const maxStock = product
            ? product.stock != null
              ? product.stock
              : Infinity
            : item.stock || 0;
          const isDisabled = maxStock != null && item.qty >= maxStock;

          return (
            <div
              key={item.code}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                <span
                  style={{
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                >
                  {item.name}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 30px 32px',
                  alignItems: 'center',
                  justifyItems: 'center',
                  gap: '4px',
                  width: '100px',
                }}
              >
                <button
                  onClick={() => onUpdateQty(item.code, -1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: 0,
                  }}
                >
                  -
                </button>
                <span style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {item.qty}
                </span>
                <button
                  onClick={() => onUpdateQty(item.code, 1)}
                  disabled={isDisabled}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isDisabled
                      ? 'var(--color-border)'
                      : 'var(--color-primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.6 : 1,
                    fontSize: '1rem',
                    padding: 0,
                  }}
                >
                  +
                </button>
              </div>

              <span
                style={{
                  fontWeight: 600,
                  minWidth: '60px',
                  textAlign: 'right',
                }}
              >
                ${(item.price * item.qty).toFixed(2)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
