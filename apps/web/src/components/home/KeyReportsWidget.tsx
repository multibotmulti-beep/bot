'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

export default function KeyReportsWidget() {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'business.get_key_reports', params: {} }),
      });
      const result = await response.json();
      if (result.success) setReports(result.data);
    } catch (error) {
      console.error('Error fetching key reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Calculando reportes reales...</div>;
  if (!reports) return null;

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3>Reportes de Negocio</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-sm)',
        }}
      >
        <div
          style={{
            padding: 'var(--space-sm)',
            background: 'var(--color-background)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          <small
            style={{
              color: 'var(--color-text-muted)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Ventas Totales (Histórico)
          </small>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            ${reports.dailySummary.totalSales.toLocaleString('es-AR')}
          </div>
        </div>
        <div
          style={{
            padding: 'var(--space-sm)',
            background: 'var(--color-background)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          <small
            style={{
              color: 'var(--color-text-muted)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Ticket Promedio
          </small>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            ${reports.dailySummary.avgTicket.toFixed(2)}
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 'var(--space-sm)',
          padding: 'var(--space-md)',
          background: 'var(--color-background)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <small
              style={{ color: 'var(--color-text-muted)', display: 'block' }}
            >
              Estado de Crecimiento
            </small>
            <div style={{ fontWeight: 600, color: '#166534' }}>
              {reports.monthlyGrowth}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <small
              style={{ color: 'var(--color-text-muted)', display: 'block' }}
            >
              Tickets Emitidos
            </small>
            <div style={{ fontWeight: 700 }}>
              {reports.dailySummary.totalTickets}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
