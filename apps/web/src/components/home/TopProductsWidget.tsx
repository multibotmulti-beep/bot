'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import SkeletonWidget from './SkeletonWidget';

export default function TopProductsWidget() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiClient('/execute', {
          method: 'POST',
          body: JSON.stringify({ cmd: 'stock.list', params: {} }),
        });
        const data = await res.json();
        if (data.success) setProducts(data.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <SkeletonWidget title="Top Productos" height="150px" />;
  if (products.length === 0) return null;

  const topProducts = [...products]
    .sort((a, b) => (b.qty || 0) - (a.qty || 0))
    .slice(0, 5);

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-soft)',
        marginTop: '2rem',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        Productos más vendidos
      </div>
      <div style={{ marginTop: '0.5rem' }}></div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {topProducts.map((p: any) => (
          <li
            key={p.code}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span>{p.name}</span>
            <strong>{p.qty} un.</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
