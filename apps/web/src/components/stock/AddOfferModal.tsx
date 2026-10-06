import React, { useState } from 'react';
import { useLoading } from '../loading/LoadingProvider';
import { apiClient } from '../../lib/api';

export default function AddOfferModal({
  onClose,
  products,
  onSave,
}: {
  onClose: () => void;
  products: any[];
  onSave: () => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discount, setDiscount] = useState('');
  const { startLoading, stopLoading } = useLoading();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !discount) return;

    startLoading();
    // Encontrar el producto seleccionado
    const product = products.find((p) => p.code === selectedProductId);

    // Actualizar metadatos
    const newMetadata = {
      ...(product.metadata || {}),
      is_offer: 'true',
      discount_percent: discount,
    };

    try {
      await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'stock.update',
          params: {
            code: product.code,
            ...product,
            metadata: newMetadata,
          },
        }),
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving offer', error);
    } finally {
      stopLoading();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
    >
      <form
        onSubmit={handleSave}
        style={{
          backgroundColor: 'var(--color-surface)',
          padding: '1rem',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h2>Crear Nueva Oferta</h2>

        <label>Producto:</label>
        <select
          onChange={(e) => setSelectedProductId(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
        >
          <option value="">Selecciona un producto</option>
          {products.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>

        <label>Descuento (%):</label>
        <input
          type="number"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn-primary">
            Guardar Oferta
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
