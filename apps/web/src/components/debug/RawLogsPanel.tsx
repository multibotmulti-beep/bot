'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

export default function RawLogsPanel({ onClose }: { onClose: () => void }) {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.get_employee_activity',
          params: {},
        }),
      });
      const result = await response.json();
      setResponse(result);
    } catch (error) {
      setResponse({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        width: 'min(90vw, 350px)',
        maxHeight: '50vh',
        backgroundColor: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        boxShadow: 'var(--shadow-soft)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <h3>Logs Crudos (Respuesta Completa)</h3>
        <button onClick={onClose} style={{ cursor: 'pointer' }}>
          X
        </button>
      </div>
      <button
        onClick={fetchLogs}
        style={{ marginBottom: '1rem', cursor: 'pointer' }}
      >
        {loading ? 'Cargando...' : 'Recargar Logs'}
      </button>
      <pre
        style={{
          fontSize: '0.7rem',
          overflow: 'auto',
          flex: 1,
          backgroundColor: 'var(--color-code-bg)',
          padding: '0.5rem',
          borderRadius: '4px',
        }}
      >
        {JSON.stringify(response, null, 2)}
      </pre>
    </div>
  );
}
