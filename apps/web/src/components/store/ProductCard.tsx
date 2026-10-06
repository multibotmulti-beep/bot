'use client';
import React, { useState, useMemo, memo } from 'react';
import { ImageWithFallback } from '../ImageWithFallback';

export const ProductCard = memo(
  ({
    product,
    toggleExpand,
    expanded,
    addToCart,
    editable = false,
    onDiscountChange,
  }: {
    product: any;
    toggleExpand: (id: string) => void;
    expanded: boolean;
    addToCart: any;
    editable?: boolean;
    onDiscountChange?: (discount: string) => void;
  }) => {
    const images = useMemo(() => {
      let imgs = [];
      try {
        if (product.metadata && product.metadata.images) {
          if (typeof product.metadata.images === 'string') {
            imgs = JSON.parse(product.metadata.images);
          } else if (Array.isArray(product.metadata.images)) {
            imgs = product.metadata.images;
          }
        }
        if (imgs.length === 0 && product.images) {
          if (typeof product.images === 'string') {
            imgs = JSON.parse(product.images);
          } else if (Array.isArray(product.images)) {
            imgs = product.images;
          }
        }
      } catch (e) {
        console.error('Error parsing images', e);
      }
      return imgs;
    }, [product.metadata, product.images]);

    const [currentImgIndex, setCurrentImgIndex] = useState(0);

    const nextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentImgIndex((prev) => (prev + 1) % (images.length || 1));
    };

    const prevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentImgIndex(
        (prev) => (prev - 1 + (images.length || 1)) % (images.length || 1)
      );
    };

    return (
      <div
        className="card"
        style={{
          padding: '1rem',
          cursor: 'pointer',
          border:
            product.metadata?.is_offer === 'true'
              ? '2px solid var(--color-secondary)'
              : '1px solid var(--color-border)',
          animation:
            product.metadata?.is_offer === 'true'
              ? 'offer-glow 3s infinite alternate'
              : 'none',
        }}
        onClick={() => toggleExpand(product.id)}
      >
        {/* Banner Oferta */}
        {product.metadata?.is_offer === 'true' && (
          <div
            style={{
              background: 'var(--color-secondary)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              marginBottom: '8px',
            }}
          >
            {editable ? (
              <input
                type="number"
                value={product.metadata.discount_percent || '10'}
                onChange={(e) => onDiscountChange?.(e.target.value)}
                style={{
                  width: '40px',
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontWeight: 'bold',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              `OFERTA: ${product.metadata.discount_percent}% OFF`
            )}
          </div>
        )}

        {/* Foto */}
        <div style={{ position: 'relative', width: '100%', height: '150px' }}>
          <ImageWithFallback
            src={images[currentImgIndex] || undefined}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                style={{
                  position: 'absolute',
                  left: '5px',
                  top: '50%',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  padding: '5px 10px',
                }}
              >
                &lt;
              </button>
              <button
                onClick={nextImage}
                style={{
                  position: 'absolute',
                  right: '5px',
                  top: '50%',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  padding: '5px 10px',
                }}
              >
                &gt;
              </button>
            </>
          )}
        </div>

        {/* Título debajo de la foto */}
        <h3 style={{ margin: '10px 0 10px 0', fontSize: '1.1rem' }}>
          {product.name}
        </h3>

        {/* Sección dividida: Detalles (izq) | Precio + Carrito (der) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginTop: '5px',
          }}
        >
          {/* Detalles (Etiquetas/Metadata) a la izquierda */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              flex: 1,
              marginRight: '15px',
            }}
          >
            {product.category && (
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  background: 'var(--color-background-muted)',
                }}
              >
                {product.category.split('/').pop()}
              </span>
            )}
            {product.metadata &&
              Object.entries(product.metadata)
                .filter(([key, value]) => {
                  const lowerKey = key.toLowerCase();
                  const valStr = String(value);
                  return (
                    !lowerKey.includes('image') &&
                    !lowerKey.includes('offer') &&
                    !lowerKey.includes('discount') &&
                    !valStr.toLowerCase().includes('http') &&
                    !valStr.startsWith('[') &&
                    valStr.trim() !== ''
                  );
                })
                .slice(0, 3)
                .map(([key, value], i: number) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.65rem',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      background: 'var(--color-primary-light)',
                    }}
                  >
                    {String(value).split(',')[0]}
                  </span>
                ))}
          </div>

          {/* Precio y Carrito a la derecha */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '5px',
            }}
          >
            <p style={{ margin: 0, fontWeight: 'bold' }}>${product.price}</p>
            {product.qty > 0 && (
              <button
                style={{
                  padding: '8px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart({
                    code: product.id,
                    name: product.name,
                    price: product.price,
                    qty: product.qty,
                    category: product.category,
                    metadata: product.metadata,
                  });
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  <line x1="16" y1="2" x2="22" y2="2"></line>
                  <line x1="19" y1="0" x2="19" y2="4"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Detalles Expandidos */}
        {expanded && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #eee',
              fontSize: '0.85rem',
              textAlign: 'left',
            }}
          >
            {images.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '5px',
                  marginBottom: '10px',
                  overflowX: 'auto',
                }}
              >
                {images.map((img: string, idx: number) => (
                  <img
                    key={idx}
                    src={img}
                    style={{
                      width: '50px',
                      height: '50px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                    }}
                  />
                ))}
              </div>
            )}
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Detalles completos:
            </p>
            <p style={{ margin: '0.2rem 0' }}>
              <strong>Categoría:</strong> {product.category}
            </p>
            {product.metadata &&
              Object.entries(product.metadata).map(([key, value]) => {
                const lowerKey = key.toLowerCase();
                const technicalKeys = [
                  'images',
                  'is_offer',
                  'discount_percent',
                  'discountpercent',
                ];

                if (technicalKeys.includes(lowerKey)) return null;
                if (value === '' || value === null || value === undefined)
                  return null;

                return (
                  <p key={key} style={{ margin: '0.2rem 0' }}>
                    <strong>
                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                    </strong>{' '}
                    {String(value)}
                  </p>
                );
              })}
          </div>
        )}
      </div>
    );
  }
);

ProductCard.displayName = 'ProductCard';
