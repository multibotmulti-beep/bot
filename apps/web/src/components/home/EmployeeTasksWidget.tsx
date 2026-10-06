'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import SkeletonWidget from './SkeletonWidget';

export default function EmployeeTasksWidget({ user }: { user: any }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'staff.get_task_completion_status',
          params: { employeeId: user.id },
        }),
      });
      const result = await response.json();
      if (result.success) setTasks(result.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <SkeletonWidget title="Mis Tareas Operativas" height="150px" />;

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
        Mis Tareas Operativas
      </div>
      <div style={{ marginTop: '0.5rem' }}></div>
      {tasks.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          {tasks.map((task: any, index: number) => (
            <div
              key={index}
              style={{
                padding: 'var(--space-sm)',
                background: 'var(--color-background)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                borderLeft: `4px solid ${task.status === 'completed' ? '#166534' : '#ca8a04'}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>
                    {task.taskName}
                  </strong>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--color-text-muted)',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {task.details}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background:
                      task.status === 'completed' ? '#dcfce7' : '#fef9c3',
                    color: task.status === 'completed' ? '#166534' : '#854d0e',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {task.status === 'completed' ? 'Completada' : 'Pendiente'}
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
          <p>No tienes tareas asignadas por ahora.</p>
          <small>¡Excelente trabajo manteniendo el local al día!</small>
        </div>
      )}
    </div>
  );
}
