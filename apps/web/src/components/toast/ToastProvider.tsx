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
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
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
      console.log('Evento de auditoría recibido:', event.detail);
      const { message, type } = event.detail;
      addToast(message, type, 5000);
    };

    window.addEventListener('audit-event', handleAuditEvent);
    return () => window.removeEventListener('audit-event', handleAuditEvent);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 2000 }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '1rem',
              marginBottom: '0.5rem',
              borderRadius: '4px',
              backgroundColor:
                toast.type === 'error'
                  ? '#ffcccc'
                  : toast.type === 'warn'
                    ? '#fff3cd'
                    : toast.type === 'success'
                      ? '#ccffcc'
                      : '#e0e0e0',
              color: 'var(--color-text)',
              border: toast.type === 'warn' ? '1px solid #ffeeba' : 'none',
            }}
          >
            {toast.message}
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
