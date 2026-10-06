'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import SkeletonWidget from './SkeletonWidget';

export default function BusinessAlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'business.get_business_alerts',
          params: {},
        }),
      });
      const result = await response.json();
      if (result.success) setAlerts(result.data);
    } catch (error) {
      console.error('Error fetching business alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <SkeletonWidget title="Alertas Críticas" height="100px" />;

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
        Alertas Críticas
      </div>
      <div style={{ marginTop: '0.5rem' }}></div>
      {alerts.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              style={{
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                borderLeft: `4px solid ${alert.severity === 'high' ? 'var(--color-error)' : 'var(--color-warning)'}`,
                background: 'var(--color-background)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {alert.message}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <small
                  style={{
                    color: 'var(--color-text-muted)',
                    fontSize: '0.75rem',
                  }}
                >
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </small>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background:
                      alert.severity === 'high'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    color:
                      alert.severity === 'high'
                        ? 'var(--color-error)'
                        : 'var(--color-warning)',
                    fontWeight: 700,
                  }}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-md)',
            color: 'var(--color-text-muted)',
          }}
        >
          <p>No hay alertas operativas.</p>
          <small>El negocio está funcionando sin contratiempos.</small>
        </div>
      )}
    </div>
  );
}
