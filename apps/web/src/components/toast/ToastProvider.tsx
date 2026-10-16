'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';

type ToastType = 'info' | 'success' | 'error' | 'warn';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3500) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  useEffect(() => {
    const handleAuditEvent = (event: any) => {
      const { message, type } = event.detail || {};
      if (message) {
        addToast(message, type || 'info', 5000);
      }
    };

    window.addEventListener('audit-event', handleAuditEvent);
    return () => window.removeEventListener('audit-event', handleAuditEvent);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor:
                toast.type === 'error'
                  ? 'var(--color-error-bg)'
                  : toast.type === 'warn'
                    ? 'var(--color-warning-bg)'
                    : toast.type === 'success'
                      ? 'var(--color-success-bg)'
                      : 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid',
              borderColor:
                toast.type === 'error'
                  ? 'var(--color-error)'
                  : toast.type === 'warn'
                    ? 'var(--color-warning)'
                    : toast.type === 'success'
                      ? 'var(--color-success)'
                      : 'var(--color-border)',
              boxShadow: 'var(--shadow-card)',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: '300px',
              maxWidth: '420px',
              transition: 'all 0.2s ease-out',
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warn' ? '⚠️' : 'ℹ️'}
            </span>
            <span style={{ flex: 1, wordBreak: 'break-word' }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
