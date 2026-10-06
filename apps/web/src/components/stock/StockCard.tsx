'use client';

import { useState } from 'react';
import AddProductModal from './AddProductModal';

export default function StockCard({
  product,
  onUpdate,
  onDelete,
  products,
}: {
  product: any;
  onUpdate: (product: any) => void;
  onDelete: (code: string) => void;
  products: any[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <div
        className="masonry-item"
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
          backgroundColor: 'var(--color-background)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-soft)',
          transition: 'transform 0.2s',
          color: 'var(--color-text)',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-xs)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          textAlign: 'left', // Alineación base
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Fila 1: Título */}
        <div style={{ width: '100%' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 800,
              color: 'var(--color-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Fila 2: Código y Stock */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: '#888' }}>
            {product.code}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Stock: {product.qty}
          </span>
        </div>

        {/* Precio */}
        <div
          style={{
            fontWeight: 700,
            color: 'var(--color-primary)',
            fontSize: '0.9rem',
          }}
        >
          ${Number(product.price).toFixed(2)}
        </div>

        {isExpanded && (
          <div
            style={{
              marginTop: 'var(--space-sm)',
              paddingTop: 'var(--space-sm)',
              borderTop: '1px solid #eee',
              fontSize: '0.8rem',
              color: '#666',
            }}
          >
            <div style={{ marginBottom: '0.25rem' }}>
              Cat: <strong>{product.category || 'N/A'}</strong>
            </div>
            {Object.entries(product).map(([key, value]) => {
              if (
                [
                  'code',
                  'name',
                  'price',
                  'qty',
                  'category',
                  'metadata',
                ].includes(key)
              )
                return null;
              return (
                <div key={key} style={{ marginBottom: '0.1rem' }}>
                  {key}: <strong>{String(value)}</strong>
                </div>
              );
            })}
            {/* Metadatos como sub-detalles */}
            {product.metadata &&
              Object.entries(product.metadata).map(([key, value]) => {
                const lowerKey = key.toLowerCase();
                const technicalKeys = [
                  'images',
                  'is_offer',
                  'discount_percent',
                  'discountpercent',
                ];

                // Deny list estricta
                if (technicalKeys.includes(lowerKey)) return null;
                if (value === '' || value === null || value === undefined)
                  return null;

                return (
                  <div
                    key={key}
                    style={{ marginBottom: '0.1rem', color: '#999' }}
                  >
                    {key}: {String(value)}
                  </div>
                );
              })}

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                marginTop: 'var(--space-xs)',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-primary)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Editar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(product.code);
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-error)',
                  backgroundColor: 'var(--color-error-bg)',
                  color: 'var(--color-error)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
      {isEditing && (
        <AddProductModal
          productToEdit={product}
          onClose={() => setIsEditing(false)}
          onAdd={(updatedProduct) => {
            onUpdate(updatedProduct);
            setIsEditing(false);
          }}
          products={products}
        />
      )}
    </>
  );
}
