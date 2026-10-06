'use client';

import React, { useEffect, useState } from 'react';
import { getProfile } from '../../lib/auth';

interface ProfilePanelProps {
  user: any;
  onUpdateUser: (user: any) => void;
  onClose?: () => void;
}

import { createPaymentPreference } from '../../lib/billing';

// ... (dentro de PaymentMethods)
const PaymentMethods = ({
  clienteId,
  targetPlan,
  amount,
  onPaymentSuccess,
}: {
  clienteId: number;
  targetPlan: string;
  amount: number;
  onPaymentSuccess: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const generatePaymentLink = async () => {
    setLoading(true);
    try {
      const res = await createPaymentPreference(clienteId, targetPlan, amount);
      if (res.success && res.data?.init_point) {
        setLink(res.data.init_point);
      } else {
        alert('Error: ' + (res.message || 'No se pudo generar el link'));
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
      {!link ? (
        <button
          onClick={generatePaymentLink}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.8rem',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading
            ? 'Generando...'
            : `Obtener Pago ${targetPlan.toUpperCase()}`}
        </button>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`}
            alt="QR de Pago"
            style={{
              border: '2px solid var(--color-border)',
              borderRadius: '8px',
            }}
          />
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-primary)',
              fontWeight: 'bold',
              textDecoration: 'none',
            }}
          >
            o click aquí para pagar
          </a>
        </div>
      )}
    </div>
  );
};

const PricingCard = ({
  clienteId,
  title,
  price,
  amount,
  features,
  isPro,
  isCurrent,
  onPaymentSuccess,
}: {
  clienteId: number;
  title: string;
  price: string;
  amount: number;
  features: string[];
  isPro?: boolean;
  isCurrent?: boolean;
  onPaymentSuccess: () => void;
}) => {
  return (
    <div
      style={{
        padding: '1.5rem',
        border: `1px solid ${isPro ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isPro ? 'var(--shadow-card)' : 'none',
        position: 'relative',
      }}
    >
      {isPro && (
        <span
          style={{
            position: 'absolute',
            top: '-10px',
            right: '10px',
            background: 'var(--color-primary)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
          }}
        >
          POPULAR
        </span>
      )}
      <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0.5rem 0' }}>
        {price}
      </p>
      <ul
        style={{
          fontSize: '0.85rem',
          paddingLeft: '1rem',
          flexGrow: 1,
          color: 'var(--color-text-muted)',
        }}
      >
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
      {!isCurrent && title !== 'Free' && (
        <PaymentMethods
          clienteId={clienteId}
          targetPlan={title.toLowerCase()}
          amount={amount}
          onPaymentSuccess={onPaymentSuccess}
        />
      )}
    </div>
  );
};

const PricingComparison = ({
  clienteId,
  currentPlan,
  isTrial,
  onPaymentSuccess,
}: {
  clienteId: number;
  currentPlan: string;
  isTrial: boolean;
  onPaymentSuccess: () => void;
}) => (
  <div style={{ marginTop: '2rem' }}>
    <h3 style={{ marginBottom: '1rem' }}>Planes Disponibles</h3>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
      }}
    >
      {isTrial && (
        <PricingCard
          clienteId={clienteId}
          title="Trial"
          price="30 días"
          amount={0}
          isCurrent={true}
          onPaymentSuccess={onPaymentSuccess}
          features={['Todo lo de Free', 'Prueba total del sistema']}
        />
      )}
      <PricingCard
        clienteId={clienteId}
        title="Free"
        price="$0"
        amount={0}
        isCurrent={currentPlan === 'free' && !isTrial}
        onPaymentSuccess={onPaymentSuccess}
        features={['Stock básico', 'Ventas básicas']}
      />
      <PricingCard
        clienteId={clienteId}
        title="Pro"
        price="$500/mes"
        amount={500}
        isPro
        isCurrent={currentPlan === 'pro' && !isTrial}
        onPaymentSuccess={onPaymentSuccess}
        features={[
          'Todo lo de Free/Trial',
          'Gestión de empleados',
          'Reportes avanzados',
          'Soporte dedicado 24/7',
          'Solicitud de nuevas funciones',
        ]}
      />
    </div>
  </div>
);

const OwnerSubscriptionView = ({ subscription }: { subscription: any }) => {
  console.log('Subscription Data Received:', subscription);
  const expiryDate =
    subscription.trial_end_date || subscription.subscription_end;
  const daysRemaining = subscription.days_remaining;

  return (
    <div
      style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'var(--color-background-secondary)',
        borderRadius: '8px',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Gestión de Suscripción</h3>
      <p>
        <strong>Plan:</strong> {subscription.plan?.toUpperCase() || 'N/A'}
      </p>
      <p>
        <strong>Estado:</strong>{' '}
        {subscription.is_trial ? 'Periodo de Prueba' : 'Activo'}
      </p>
      <p>
        <strong>Expira:</strong>{' '}
        {expiryDate
          ? new Date(expiryDate).toLocaleDateString()
          : daysRemaining !== undefined
            ? `En ${daysRemaining} días`
            : 'N/A'}
      </p>
      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: '0.5rem' }}
      >
        Gestionar Pagos
      </button>
    </div>
  );
};

const EmployeeView = ({ ownerInfo }: { ownerInfo: any }) => (
  <div
    style={{
      marginTop: '1.5rem',
      padding: '1rem',
      background: 'var(--color-background-secondary)',
      borderRadius: '8px',
    }}
  >
    <h3 style={{ marginTop: 0 }}>Información de la Empresa</h3>
    <p>
      <strong>Dueño:</strong> {ownerInfo?.name || 'No disponible'}
    </p>
    <p>Si tienes problemas, contacta al dueño.</p>
  </div>
);

export default function ProfilePanel({
  user,
  onUpdateUser,
}: ProfilePanelProps) {
  useEffect(() => {
    const refreshData = async () => {
      const result = await getProfile();
      if (result.success) {
        onUpdateUser(result.profile);
      }
    };
    refreshData();
  }, [onUpdateUser]);

  console.log('ProfilePanel received user:', user);

  const isOwner = user.role_name === 'DUEÑO';
  const currentPlan = user.subscription?.plan || 'free';
  const clienteId = user.cliente_id;

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'left',
        color: 'var(--color-text)',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Mi Perfil</h2>
      <div style={{ marginBottom: '1.5rem' }}>
        <p>
          <strong>Usuario:</strong> {user.username}
        </p>
        <p>
          <strong>Empresa:</strong> {user.cliente_nombre}
        </p>
        <p>
          <strong>Rol:</strong> {user.role_name}
        </p>
      </div>

      {isOwner ? (
        <>
          <OwnerSubscriptionView subscription={user.subscription || {}} />
          <PricingComparison
            clienteId={clienteId}
            currentPlan={currentPlan}
            isTrial={user.subscription?.is_trial || false}
            onPaymentSuccess={() => {
              window.location.reload();
            }}
          />
        </>
      ) : (
        <EmployeeView ownerInfo={user.ownerContact} />
      )}
    </div>
  );
}
