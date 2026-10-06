'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api';

export default function DebugLogPanel() {
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = async () => {
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.get_employee_activity',
          params: {},
        }),
      });
      const result = await response.json();
      if (result.success) setLogs(result.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  return (
    <div
      style={{
        padding: '1rem',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        margin: '1rem',
      }}
    >
      <button onClick={fetchLogs} className="btn-secondary">
        Recargar Logs Crudos
      </button>
      <pre style={{ fontSize: '0.7rem', overflowX: 'auto', marginTop: '1rem' }}>
        {JSON.stringify(logs, null, 2)}
      </pre>
    </div>
  );
}
