'use client';

import { useState } from 'react';
import { useCart } from '../lib/CartContext';
import logger from '@/lib/logger';

const CartIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

const HandleIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {expanded ? (
      <polyline points="6 9 12 15 18 9"></polyline>
    ) : (
      <polyline points="6 15 12 9 18 15"></polyline>
    )}
  </svg>
);

export const CartFloatingWidget = ({
  phoneNumber,
}: {
  phoneNumber: string;
}) => {
  const {
    items,
    isExpanded,
    setIsExpanded,
    updateQuantity,
    paymentMethod,
    setPaymentMethod,
    shippingOption,
    setShippingOption,
  } = useCart();

  const [view, setView] = useState<'cart' | 'checkout'>('cart');
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (items.length === 0) return null;

  const generateWhatsAppLink = () => {
    const phone = phoneNumber.replace(/[^0-9]/g, '');
    const MAX_WIDTH = 33;

    const formatItem = (item: any) => {
      const priceStr = `$${(item.price * item.qty).toFixed(2)}`;

      let title =
        item.name.length > MAX_WIDTH
          ? item.name.substring(0, MAX_WIDTH - 3) + '...'
          : item.name;
      title = `*${title}*`;

      let metaLines = '';
      let metadataObj = item.metadata;
      if (typeof metadataObj === 'string') {
        try {
          metadataObj = JSON.parse(metadataObj.replace(/'/g, '"'));
        } catch (e) {
          metadataObj = null;
        }
      }
      const technicalKeys = [
        'images',
        'is_offer',
        'discount_percent',
        'discountpercent',
        'offer',
      ];

      if (metadataObj && typeof metadataObj === 'object') {
        const filteredMeta = Object.entries(metadataObj).filter(
          ([k, v]) =>
            v !== null &&
            v !== undefined &&
            v.toString().trim() !== '' &&
            !technicalKeys.includes(k.toLowerCase())
        );
        if (filteredMeta.length > 0) {
          metaLines = filteredMeta
            .map(([k, v]) => {
              const line = `${k}: ${v}`;
              return line.length > MAX_WIDTH
                ? line.substring(0, MAX_WIDTH - 3) + '...'
                : line;
            })
            .join('%0a');
        }
      }

      const category = item.category
        ? item.category.split('/').pop()
        : 'Sin cat';
      const leftPart = `(x${item.qty}) ${category}`;
      const availableSpace = MAX_WIDTH - priceStr.length;
      const leftLine =
        leftPart.length > availableSpace
          ? leftPart.substring(0, Math.max(0, availableSpace - 3)) + '...'
          : leftPart;
      const padding = ' '.repeat(
        Math.max(0, MAX_WIDTH - leftLine.length - priceStr.length)
      );
      const footerLine = `*${leftLine}${padding}${priceStr}*`;

      return `${title}${metaLines ? '%0a' + metaLines : ''}%0a${footerLine}`;
    };

    const ticket = items.map(formatItem).join('%0a%0a');
    const totalLabel = 'Total:';
    const totalVal = `$${total.toFixed(2)}`;
    const totalLine = `${totalLabel}${' '.repeat(MAX_WIDTH - totalLabel.length - totalVal.length)}${totalVal}`;

    const message = `*Nuevo Pedido*%0a%0a${ticket}%0a${'-'.repeat(MAX_WIDTH)}%0a${totalLine}%0a%0aPago: ${paymentMethod || 'No especificado'}%0aEnvío: ${shippingOption === 'envio' ? 'Sí' : 'No'}`;
    return `https://wa.me/${phone}?text=${message}`;
  };

  const handleSendWhatsApp = () => {
    logger.info({ total, itemCount: items.length }, 'Generando enlace y enviando pedido por WhatsApp');
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 2000,
        width: '90%',
        maxWidth: '400px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
        border: '1px solid var(--color-border)',
        transition: 'transform 0.3s ease-out',
        transform: isExpanded
          ? 'translateY(0)'
          : 'translateY(calc(100% - 60px))',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          cursor: 'pointer',
          backgroundColor: 'var(--color-background)',
          borderBottom: '1px solid var(--color-border)',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text)' }}>
          <CartIcon />
          <strong>Carrito ({items.length})</strong>
        </div>
        <HandleIcon expanded={isExpanded} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', color: 'var(--color-text)' }}>
        {view === 'cart' ? (
          <>
            {items.map((item) => (
              <div
                key={item.code}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    ${item.price} x {item.qty} = ${(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => updateQuantity(item.code, -1)}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    -
                  </button>
                  <span style={{ minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                  <button
                    onClick={() => updateQuantity(item.code, 1)}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setView('checkout')}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Finalizar Compra ($ {total.toFixed(2)})
            </button>
          </>
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem' }}>
              Resumen del pedido (WhatsApp):
            </p>
            <div
              style={{
                backgroundColor: '#DCF8C6',
                color: '#111',
                padding: '1rem',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-line',
              }}
            >
              {generateWhatsAppLink()
                .split('text=')[1]
                .replace(/%0a/g, '\n')
                .replace(/\*/g, '')
                .replace(/%20/g, ' ')}
            </div>
            <select
              value={paymentMethod || ''}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              style={{ padding: '0.8rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              <option value="">Seleccionar Pago</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <select
              value={shippingOption || ''}
              onChange={(e) => setShippingOption(e.target.value as any)}
              style={{ padding: '0.8rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              <option value="">Seleccionar Envío</option>
              <option value="retiro">Retiro en local</option>
              <option value="envio">Envío</option>
            </select>
            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSendWhatsApp}
              style={{
                textAlign: 'center',
                padding: '0.8rem',
                backgroundColor: '#25D366',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
              }}
            >
              Enviar Pedido por WhatsApp
            </a>
            <button
              onClick={() => setView('cart')}
              style={{
                background: 'none',
                border: '1px solid var(--color-border)',
                padding: '0.8rem',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              Volver al carrito
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
