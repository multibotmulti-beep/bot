'use client';

import { useState, useEffect } from 'react';
import { configureGateway, getGatewayConfig } from '../../lib/billing';
import { useToast } from '../toast/ToastProvider';

export default function MercadoPagoConfigPanel({
  tenantId,
}: {
  tenantId: number;
}) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { addToast } = useToast();

  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/billing/webhook/${tenantId}`;

  useEffect(() => {
    fetchConfig();
  }, [tenantId]);

  const fetchConfig = async () => {
    setFetching(true);
    try {
      const res = await getGatewayConfig(tenantId, 'mercadopago');
      if (res.success && res.data && res.data.length > 0) {
        setConfig(res.data[0]);
      } else {
        setConfig(null);
      }
    } catch (e) {
      addToast('Error al cargar configuración', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      access_token: formData.get('accessToken'),
      public_key: formData.get('publicKey'),
      webhook_secret: formData.get('webhookSecret'),
    };

    try {
      const res = await configureGateway(
        tenantId,
        'mercadopago',
        data,
        'production'
      );
      if (res.success) {
        addToast('Configuración guardada exitosamente', 'success');
        setIsEditing(false);
        fetchConfig();
      } else {
        addToast('Error: ' + res.message, 'error');
      }
    } catch (e) {
      addToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div>Cargando...</div>;

  return (
    <div
      style={{
        padding: 'var(--space-md)',
        maxWidth: '600px',
        margin: '2rem auto',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-soft)',
        position: 'relative',
        marginTop: '3rem',
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
          padding: '0.5rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '1rem',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        Mercado Pago
      </div>

      <div style={{ marginTop: '1rem' }}></div>

      {config && !isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              background: 'rgba(var(--color-success-rgb), 0.1)',
              border: '1px solid var(--color-success)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-success)',
              textAlign: 'center',
            }}
          >
            <strong>✅ Pasarela Activa</strong>
            <p style={{ margin: '0.5rem 0 0' }}>
              Entorno: {config.environment}
            </p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary"
            style={{ fontWeight: 'bold' }}
          >
            Editar Credenciales
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
          }}
        >
          <div
            style={{
              padding: '1rem',
              background: 'var(--color-background)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
              URL de Webhook:
            </p>
            <code
              style={{
                display: 'block',
                background: 'var(--color-surface)',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                wordBreak: 'break-all',
                fontSize: '0.85rem',
              }}
            >
              {webhookUrl}
            </code>
          </div>
          <input
            name="accessToken"
            placeholder="Access Token"
            defaultValue={config?.config_data?.access_token}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
            }}
          />
          <input
            name="publicKey"
            placeholder="Public Key"
            defaultValue={config?.config_data?.public_key}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
            }}
          />
          <input
            name="webhookSecret"
            placeholder="Webhook Secret"
            defaultValue={config?.config_data?.webhook_secret}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ fontWeight: 'bold' }}
          >
            {loading ? 'Guardando...' : 'Guardar Credenciales'}
          </button>
          {config && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
          )}
        </form>
      )}
    </div>
  );
}
