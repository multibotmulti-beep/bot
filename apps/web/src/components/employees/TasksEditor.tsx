'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api';

interface TasksEditorProps {
  employee: any;
  onUpdate: () => void;
}

export default function TasksEditor({ employee, onUpdate }: TasksEditorProps) {
  const [taskName, setTaskName] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const addTask = async () => {
    if (!taskName) return;
    setLoading(true);
    try {
      await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.set_goal',
          params: {
            employeeId: employee.id,
            goalType: 'task',
            target: { task: taskName, details: taskDetails, status: 'pending' },
          },
        }),
      });
      setTaskName('');
      setTaskDetails('');
      onUpdate();
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <h4 style={{ margin: '0 0 var(--space-md) 0' }}>
        Tareas de {employee.name}
      </h4>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
        }}
      >
        <input
          placeholder="Nombre de la tarea (ej: Prender luces)"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        />
        <input
          placeholder="Detalles"
          value={taskDetails}
          onChange={(e) => setTaskDetails(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={addTask}
          disabled={loading}
          className="btn-primary"
          style={{ padding: '0.5rem', fontWeight: 'bold' }}
        >
          {loading ? 'Asignando...' : 'Asignar Tarea'}
        </button>
      </div>

      <div
        style={{
          marginTop: 'var(--space-md)',
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-md)',
        }}
      >
        <h5 style={{ margin: '0 0 var(--space-sm) 0' }}>Tareas Pendientes:</h5>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            margin: 'var(--space-sm) 0',
          }}
        >
          No hay tareas pendientes asignadas.
        </p>
      </div>
    </div>
  );
}
