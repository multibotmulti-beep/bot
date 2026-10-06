'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

export default function StockControlWidget() {
  const [totalValue, setTotalValue] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      // Obtener valor total real del patrimonio en stock
      const valueRes = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'stock.get_total_value', params: {} }),
      });
      const valueData = await valueRes.json();
      if (valueData.success) setTotalValue(valueData.data.totalStockValue);

      // Obtener lista de compras (bajo stock) real
      const alertsRes = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'stock.get_reorder_needs',
          params: { threshold: 5 },
        }),
      });
      const alertsData = await alertsRes.json();
      if (alertsData.success) setAlerts(alertsData.data);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando listado de compras...</div>;

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3>Patrimonio en Stock</h3>
      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: 'var(--space-md)',
          color: 'var(--color-primary)',
        }}
      >
        ${totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
      </div>

      <h4
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-md)',
          marginTop: 'var(--space-md)',
        }}
      >
        Listado de Compras (Stock Bajo)
      </h4>
      {alerts.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {alerts.map((alert: any) => (
            <li
              key={alert.productId}
              style={{
                padding: 'var(--space-sm) 0',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{alert.productName}</span>
              <span style={{ fontWeight: '600', color: 'var(--color-error)' }}>
                Queda: {alert.currentQty}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          El stock está completo.
        </p>
      )}
    </div>
  );
}
