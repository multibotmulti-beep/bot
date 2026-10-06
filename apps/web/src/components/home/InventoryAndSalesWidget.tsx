'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

export default function InventoryAndSalesWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const stockRes = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'stock.list', params: {} }),
      });
      const salesRes = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'sales.summary', params: {} }),
      });

      const stockData = await stockRes.json();
      const salesData = await salesRes.json();

      if (stockData.success && salesData.success) {
        const patrimonio = stockData.data.reduce(
          (acc: number, p: any) => acc + p.price * p.qty,
          0
        );
        setData({ patrimonio, sales: salesData.data });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!data) return null;

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3>Patrimonio y Ventas</h3>
      <p>
        Patrimonio en Stock:{' '}
        <strong>${data.patrimonio.toLocaleString('es-AR')}</strong>
      </p>
      <p>
        Ventas Totales:{' '}
        <strong>${data.sales.total?.toLocaleString('es-AR') || 0}</strong>
      </p>
    </div>
  );
}
