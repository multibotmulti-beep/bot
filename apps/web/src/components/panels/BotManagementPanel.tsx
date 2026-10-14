'use client';

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';
import { BotApiClient } from '@/lib/apiClient';

interface MenuOption {
  id: string;
  number: string;
  label: string;
  actionKey?: string;
}

const AVAILABLE_FUNCTIONS = [
  { key: '', label: 'Sin función automática (Navegación estándar)' },
  { key: 'stock.manage', label: 'Gestión de Stock e Inventario' },
  { key: 'turnos.book', label: 'Reserva de Turnos y Citas' },
  { key: 'pedidos.create', label: 'Creación de Pedidos y Compras' },
  { key: 'business.payment_info', label: 'Datos de Cobro (CBU / Alias / Banco)' },
  { key: 'payments.checkout', label: 'Checkout y Enlace de Pago' },
  { key: 'faq.query', label: 'Preguntas Frecuentes y Horarios' },
  { key: 'mis.reservas', label: 'Consultar Mis Turnos y Pedidos' },
  { key: 'support.human', label: 'Derivar a Asesor Humano' },
  { key: 'auth.login', label: 'Autenticación / Magic Link' },
];

const SvgIcons = {
  bot: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="9" cy="16" r="1" />
      <circle cx="15" cy="16" r="1" />
      <path d="M12 2v9" />
      <path d="M12 2a3 3 0 0 0-3 3" />
    </svg>
  ),
  check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  arrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  arrowLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  spinner: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  ),
  smartphone: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  lightning: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
};

export default function BotManagementPanel() {
  const [step, setStep] = useState<1 | 2>(1);

  // Bot Data State
  const [botName, setBotName] = useState('Asistente Comercial');
  const [botPhone, setBotPhone] = useState('5491155556666');
  const [welcomeMessage, setWelcomeMessage] = useState('¡Hola! Bienvenido a nuestro asistente virtual. ¿En qué podemos ayudarte hoy?');
  
  // Menu Data State
  const [menuTitle, setMenuTitle] = useState('Menú Principal');
  const [layoutType, setLayoutType] = useState<'vertical' | 'horizontal'>('vertical');
  const [options, setOptions] = useState<MenuOption[]>([
    { id: '1', number: '1', label: 'Ver Catálogo y Stock', actionKey: 'stock.check' },
    { id: '2', number: '2', label: 'Horarios y Ubicación', actionKey: 'faq.query' },
    { id: '3', number: '3', label: 'Datos de Cobro y Pagos', actionKey: 'business.payment_info' },
    { id: '4', number: '4', label: 'Reservar Turno', actionKey: 'turnos.book' },
    { id: '5', number: '5', label: 'Hablar con Asesor', actionKey: 'support.human' },
  ]);

  const [isCreated, setIsCreated] = useState(false);
  const [previewChat, setPreviewChat] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [lastRawResponse, setLastRawResponse] = useState<any>(null);

  // Sincronizar y cargar perfil activo desde la base de datos real al montar el panel
  useEffect(() => {
    BotApiClient.getProfiles()
      .then((profiles) => {
        if (profiles && profiles.length > 0) {
          const activeSessionBot = typeof window !== 'undefined' ? sessionStorage.getItem('active_bot_id') : null;
          const matched = profiles.find((p: any) => (p.botId || p.id) === activeSessionBot) || profiles[profiles.length - 1];
          if (matched) {
            setBotName(matched.name || 'Asistente Comercial');
            setBotPhone(matched.botId || matched.phoneNumber || '5491155556666');
            if (matched.welcomeMessage) setWelcomeMessage(matched.welcomeMessage);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('active_bot_id', matched.botId || matched.id);
            }
          }
        }
      })
      .catch((err) => {
        logger.error({ err }, 'Error cargando perfil en BotManagementPanel');
      });
  }, []);

  const handleInteractOption = async (opt: MenuOption) => {
    const userMsg = `${opt.number}. ${opt.label}`;
    setPreviewChat(prev => [...prev, { sender: 'user', text: userMsg }]);

    if (opt.actionKey) {
      setIsExecutingAction(true);
      try {
        const data = await BotApiClient.executeFunction(opt.actionKey, botPhone ? `+${botPhone.replace(/[^0-9]/g, '')}` : '+5491155556666', botPhone ? botPhone.replace(/[^0-9]/g, '') : 'admin');
        setLastRawResponse({ actionKey: opt.actionKey, label: opt.label, response: data, timestamp: new Date().toISOString() });
        logger.info({ actionKey: opt.actionKey, rawResponse: data }, 'Ejecución de función en simulador y respuesta RAW capturada');
        const botReply = data.success ? data.message : `Error ejecutando función: ${data.message}`;
        setPreviewChat(prev => [...prev, { sender: 'bot', text: botReply }]);
      } catch (err: any) {
        setLastRawResponse({ actionKey: opt.actionKey, label: opt.label, error: err.message, timestamp: new Date().toISOString() });
        logger.error({ actionKey: opt.actionKey, err }, 'Error ejecutando función en simulador');
        setPreviewChat(prev => [...prev, { sender: 'bot', text: `Error de conexión al ejecutar la función: ${err.message}` }]);
      } finally {
        setIsExecutingAction(false);
      }
    } else {
      setPreviewChat(prev => [...prev, { sender: 'bot', text: `Has seleccionado: ${opt.label}` }]);
    }
  };

  const handleAddOption = () => {
    const nextNum = String(options.length + 1);
    setOptions([...options, { id: Date.now().toString(), number: nextNum, label: 'Nueva Opción' }]);
  };

  const handleUpdateOption = (id: string, fields: Partial<MenuOption>) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, ...fields } : opt));
  };

  const handleDeleteOption = (id: string) => {
    setOptions(options.filter(opt => opt.id !== id));
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecutingAction(true);
    try {
      const createdBot = await BotApiClient.createBotWithMenus({
        name: botName,
        description: 'Bot creado desde Bot Manager',
        welcomeMessage,
        options,
      });
      const activeId = createdBot?.botId || createdBot?.id;
      if (activeId && typeof window !== 'undefined') {
        sessionStorage.setItem('active_bot_id', activeId);
      }
      setIsCreated(true);
      logger.info({ botName, botPhone, welcomeMessage, menuTitle, layoutType, optionsCount: options.length, activeId }, 'Nuevo bot creado mediante flujo asistido y sincronizado con base de datos');
    } catch (err: any) {
      logger.error({ err }, 'Error al crear bot en BotManagementPanel');
      alert(`Error al crear bot: ${err.message}`);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setIsCreated(false);
    setBotName('Asistente Comercial');
    setBotPhone('5491155556666');
    setWelcomeMessage('¡Hola! Bienvenido a nuestro asistente virtual. ¿En qué podemos ayudarte hoy?');
    setOptions([
      { id: '1', number: '1', label: 'Ver Catálogo' },
      { id: '2', number: '2', label: 'Horarios y Ubicación' },
      { id: '3', number: '3', label: 'Hablar con Asesor' },
    ]);
  };

  if (isCreated) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 32px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}>
            <SvgIcons.check />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Bot Creado Exitosamente</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', marginBottom: '28px', lineHeight: '1.6' }}>
            El bot <strong>{botName}</strong> (ID: <code>{botPhone}</code>) ha sido configurado en la base de datos real con su mensaje de bienvenida y menús interactivos. Ya puedes configurarlo en el panel de funciones.
          </p>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-soft)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <SvgIcons.refresh /> Crear Otro Bot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', display: 'flex' }}>
          <SvgIcons.bot />
        </div>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Gestión y Creación de Bots</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Configura perfiles, menús y automatizaciones en tiempo real.</p>
        </div>
      </div>

      {/* Stepper Moderno */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <div style={{
          flex: 1,
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          background: step === 1 ? 'var(--color-primary)' : 'var(--color-surface)',
          color: step === 1 ? '#fff' : 'var(--color-text)',
          border: '1px solid var(--color-border)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <span style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: step === 1 ? 'rgba(255,255,255,0.25)' : 'var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
          }}>1</span>
          Paso 1: Bienvenida
        </div>
        <div style={{
          flex: 1,
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          background: step === 2 ? 'var(--color-primary)' : 'var(--color-surface)',
          color: step === 2 ? '#fff' : 'var(--color-text)',
          border: '1px solid var(--color-border)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <span style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: step === 2 ? 'rgba(255,255,255,0.25)' : 'var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
          }}>2</span>
          Paso 2: Menús y Chat
        </div>
      </div>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', margin: '0 0 20px 0' }}>Información General</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text-muted)' }}>Nombre del Bot</label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Ej: Asistente Comercial"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text-muted)' }}>Teléfono / Bot ID</label>
                <input
                  type="text"
                  value={botPhone}
                  onChange={(e) => setBotPhone(e.target.value)}
                  placeholder="Ej: 5491155556666"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text-muted)' }}>Mensaje de Bienvenida</label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
                placeholder="Escribe el mensaje inicial..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Vista Previa */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
              <SvgIcons.smartphone /> Vista Previa del Saludo
            </h4>
            <div style={{
              background: '#075e54',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              maxWidth: '380px',
            }}>
              <div style={{
                background: '#ffffff',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-soft)',
                color: '#111b21',
                fontSize: '14px',
                lineHeight: '1.5',
              }}>
                <div style={{ fontWeight: '600', color: '#00a884', fontSize: '12px', marginBottom: '4px' }}>{botName}</div>
                <div>{welcomeMessage || 'Escribe un mensaje de bienvenida...'}</div>
                <div style={{ fontSize: '10px', color: '#667781', textAlign: 'right', marginTop: '6px' }}>12:00 PM</div>
              </div>
            </div>
          </div>

          {/* Botón Siguiente */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
            {isExecutingAction && (
              <span style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <SvgIcons.spinner /> Guardando perfil en base de datos real...
              </span>
            )}
            <button
              type="button"
              disabled={isExecutingAction}
              onClick={async () => {
                setIsExecutingAction(true);
                try {
                  const createdBot = await BotApiClient.createBotWithMenus({
                    name: botName,
                    description: 'Bot creado desde Bot Manager',
                    welcomeMessage,
                    options,
                  });
                  const activeId = createdBot?.botId || createdBot?.id;
                  if (activeId && typeof window !== 'undefined') {
                    sessionStorage.setItem('active_bot_id', activeId);
                  }
                } catch (err: any) {
                  logger.warn({ err }, 'Aviso: No se pudo pre-crear el bot, continuando al paso 2');
                } finally {
                  setIsExecutingAction(false);
                  setStep(2);
                }
              }}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                cursor: isExecutingAction ? 'wait' : 'pointer',
                boxShadow: 'var(--shadow-soft)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              Siguiente: Configurar Menús <SvgIcons.arrowRight />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleFinish} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', margin: '0 0 20px 0' }}>Estructura de Menú y Funciones</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text-muted)' }}>Título del Menú</label>
                <input
                  type="text"
                  value={menuTitle}
                  onChange={(e) => setMenuTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text-muted)' }}>Diseño de Opciones</label>
                <select
                  value={layoutType}
                  onChange={(e: any) => setLayoutType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '14px',
                  }}
                >
                  <option value="vertical">Vertical (Lista en Columna)</option>
                  <option value="horizontal">Horizontal (Fila)</option>
                </select>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' }}>Opciones y Automatizaciones</label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <SvgIcons.plus /> Agregar Opción
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {options.map((opt) => (
                  <div key={opt.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: '700',
                        fontSize: '13px',
                        textAlign: 'center',
                        minWidth: '40px',
                      }}>
                        {opt.number}
                      </span>
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => handleUpdateOption(opt.id, { label: e.target.value })}
                        placeholder="Texto de la opción"
                        style={{
                          flex: 1,
                          padding: '9px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          fontSize: '14px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(opt.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-error)',
                          cursor: 'pointer',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SvgIcons.trash />
                      </button>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-text-muted)' }}>
                        Función Vinculada Automática:
                      </label>
                      <select
                        value={opt.actionKey || ''}
                        onChange={(e) => handleUpdateOption(opt.id, { actionKey: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '13px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)',
                        }}
                      >
                        {AVAILABLE_FUNCTIONS.map((fn) => (
                          <option key={fn.key} value={fn.key}>
                            {fn.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Simulador Interactivo */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SvgIcons.smartphone /> Simulador en Vivo ({layoutType})
              </h4>
              <button
                type="button"
                onClick={() => setPreviewChat([])}
                style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <SvgIcons.refresh /> Limpiar Chat
              </button>
            </div>

            <div style={{
              background: '#075e54',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              maxWidth: '550px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '420px',
              overflowY: 'auto',
            }}>
              {/* Mensaje de Bienvenida */}
              <div style={{
                background: '#ffffff',
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-soft)',
                color: '#111b21',
                fontSize: '14px',
                lineHeight: '1.4',
              }}>
                <div style={{ fontWeight: '600', color: '#00a884', fontSize: '12px', marginBottom: '4px' }}>{botName}</div>
                <div style={{ marginBottom: '10px' }}>{welcomeMessage}</div>
                <div style={{ fontWeight: '600', marginBottom: '10px', color: '#2563eb' }}>{menuTitle}</div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: layoutType === 'horizontal' ? 'row' : 'column',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isExecutingAction}
                      onClick={() => handleInteractOption(opt)}
                      style={{
                        background: '#f0f2f5',
                        border: '1px solid #d1d7db',
                        padding: '10px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        color: '#005c4b',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isExecutingAction ? 'wait' : 'pointer',
                        textAlign: 'left',
                        ...(layoutType === 'horizontal' ? { flex: '0 0 auto' } : { width: '100%' }),
                      }}
                    >
                      <span style={{ fontWeight: '700' }}>{opt.number}.</span> {opt.label} {opt.actionKey ? <SvgIcons.lightning /> : ''}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '10px', color: '#667781', textAlign: 'right', marginTop: '8px' }}>12:01 PM</div>
              </div>

              {/* Historial de Chat */}
              {previewChat.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.sender === 'user' ? '#d9fdd3' : '#ffffff',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-soft)',
                    color: '#111b21',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    maxWidth: '85%',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {msg.text}
                </div>
              ))}

              {isExecutingAction && (
                <div style={{ alignSelf: 'flex-start', background: '#ffffff', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#667781', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcons.spinner /> Ejecutando función en tiempo real...
                </div>
              )}
            </div>
          </div>

          {/* Botones finales */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              <SvgIcons.arrowLeft /> Anterior
            </button>
            <button
              type="submit"
              disabled={isExecutingAction}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                cursor: isExecutingAction ? 'wait' : 'pointer',
                boxShadow: 'var(--shadow-soft)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              {isExecutingAction ? <SvgIcons.spinner /> : <SvgIcons.check />} Guardar Bot en BD Real
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
