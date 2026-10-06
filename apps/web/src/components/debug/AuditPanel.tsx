'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

/**
 * AuditPanel: Muestra los logs de auditoría recibidos del backend.
 */
export default function AuditPanel({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Usamos staff.get_employee_activity porque parece contener los eventos detallados
      // que vimos en la respuesta RAW del usuario.
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.get_employee_activity',
          params: { userId: 205 },
        }), // ID detectado en los logs
      });
      const result = await response.json();
      if (result.success) {
        setLogs(result.data || []);
      }
    } catch (error) {
      console.error('Error cargando logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div style={panelContainerStyle}>
      <header style={headerStyle}>
        <h2>Auditoría de Eventos</h2>
        <button onClick={onClose} style={closeButtonStyle}>
          X
        </button>
      </header>

      <div style={contentStyle}>
        {loading ? (
          <p>Cargando...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={itemCardStyle}>
              <div style={fieldStyle}>
                <strong>ID:</strong> {log.id}
              </div>
              <div style={fieldStyle}>
                <strong>Comando:</strong> {log.command}
              </div>
              <div style={fieldStyle}>
                <strong>Status:</strong> {log.status}
              </div>
              <div style={fieldStyle}>
                <strong>Fecha:</strong> {JSON.stringify(log.created_at)}
              </div>
              <div style={fieldStyle}>
                <strong>Payload:</strong>{' '}
                <pre style={preStyle}>
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Estilos
const panelContainerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 15px)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90vw',
  maxWidth: '450px',
  height: '70vh',
  backgroundColor: '#fff',
  border: '1px solid #ddd',
  borderRadius: '12px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  padding: '1rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
};

const closeButtonStyle: React.CSSProperties = {
  background: '#eee',
  border: 'none',
  padding: '5px 10px',
  borderRadius: '50%',
  cursor: 'pointer',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
};

const itemCardStyle: React.CSSProperties = {
  border: '1px solid #eee',
  borderRadius: '8px',
  padding: '10px',
  marginBottom: '10px',
  fontSize: '0.85rem',
  backgroundColor: '#f9f9f9',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: '4px',
};

const preStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  background: '#eee',
  padding: '5px',
  borderRadius: '4px',
  marginTop: '5px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
};
