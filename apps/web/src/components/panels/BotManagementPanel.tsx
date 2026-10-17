'use client';

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';
import { BotApiClient, apiFetch } from '@/lib/apiClient';
import { useToast } from '@/components/toast/ToastProvider';

interface MenuOption {
  id: string;
  number: string;
  label: string;
  actionKey?: string;
  customResponse?: string;
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
  { key: 'custom.messages', label: '💬 Banco de Mensajes y Menús Personalizados' },
  { key: 'custom.free_menu', label: '🎛️ Menú Libre y Respuesta Personalizada' },
  { key: 'custom.menu_builder', label: '📂 Creador de Menús Dinámicos (Texto + Menú)' },
];

const COUNTRIES = [
  { name: '🇦🇷 Argentina', code: '+54' },
  { name: '🇲🇽 México', code: '+52' },
  { name: '🇪🇸 España', code: '+34' },
  { name: '🇨🇱 Chile', code: '+56' },
  { name: '🇨🇴 Colombia', code: '+57' },
  { name: '🇵🇪 Perú', code: '+51' },
  { name: '🇺🇾 Uruguay', code: '+598' },
  { name: '🇺🇸 Estados Unidos', code: '+1' },
  { name: '🇧🇷 Brasil', code: '+55' },
  { name: '🇪🇨 Ecuador', code: '+593' },
  { name: '🇻🇪 Venezuela', code: '+58' },
  { name: '🇧🇴 Bolivia', code: '+591' },
  { name: '🇵🇾 Paraguay', code: '+595' },
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
  edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
};

export default function BotManagementPanel() {
  const { addToast } = useToast();

  // Bot Data State
  const [botName, setBotName] = useState('Asistente Comercial');
  const [botPhone, setBotPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bot_user_phone');
      if (stored && !stored.startsWith('guest_')) return stored;
    }
    return '+549' + Math.floor(1000000000 + Math.random() * 9000000000);
  });
  const [welcomeMessage, setWelcomeMessage] = useState('¡Hola! Bienvenido a nuestro asistente virtual. ¿En qué podemos ayudarte hoy?');
  const [invalidOptionMessage, setInvalidOptionMessage] = useState("⚠️ Opción incorrecta. Por favor, elige una de las opciones presentes en el menú o escribe '0' para volver.");
  
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

  const [previewChat, setPreviewChat] = useState<{ id: string; sender: 'user' | 'bot'; text: string }[]>([]);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [lastRawResponse, setLastRawResponse] = useState<any>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [isEditingWelcome, setIsEditingWelcome] = useState(false);
  const [tempWelcomeText, setTempWelcomeText] = useState(welcomeMessage);
  const [tempMenuTitleText, setTempMenuTitleText] = useState(menuTitle);
  const [allBots, setAllBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);

  // Sincronizar y cargar perfil activo desde la base de datos real al montar el panel
  useEffect(() => {
    BotApiClient.getProfiles()
      .then((profiles) => {
        if (profiles && profiles.length > 0) {
          setAllBots(profiles);
          const activeSessionBot = typeof window !== 'undefined' ? sessionStorage.getItem('active_bot_id') : null;
          const matched = activeSessionBot ? profiles.find((p: any) => (p.botId || p.id) === activeSessionBot) : profiles[0];
          if (matched) {
            setSelectedBotId(matched.botId || matched.id);
            setBotName(matched.name || 'Asistente Comercial');
            setBotPhone(matched.botId || matched.phoneNumber || '');
            if (matched.welcomeMessage) setWelcomeMessage(matched.welcomeMessage);
            if (matched.invalidOptionMessage) setInvalidOptionMessage(matched.invalidOptionMessage);
            if (matched.isActive !== undefined) setIsOnline(matched.isActive);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('active_bot_id', matched.botId || matched.id);
            }
          }
        }
      })
      .catch((err) => {
        logger.error({ err }, 'Error cargando perfiles en BotManagementPanel');
      });
  }, []);

  const handleSelectBot = (botId: string) => {
    setSelectedBotId(botId);
    const matched = allBots.find((p: any) => (p.botId || p.id) === botId);
    if (matched) {
      setBotName(matched.name || 'Asistente Comercial');
      setBotPhone(matched.botId || matched.phoneNumber || '');
      if (matched.welcomeMessage) setWelcomeMessage(matched.welcomeMessage);
      if (matched.invalidOptionMessage) setInvalidOptionMessage(matched.invalidOptionMessage);
      if (matched.isActive !== undefined) setIsOnline(matched.isActive);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('active_bot_id', matched.botId || matched.id);
      }
      addToast(`Cambiado al bot: ${matched.name}`, 'success');
    }
  };

  const handleInteractOption = async (opt: MenuOption) => {
    const userMsg = `${opt.number}. ${opt.label}`;
    const uniqueId = () => Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    setPreviewChat(prev => [...prev, { id: uniqueId(), sender: 'user', text: userMsg }]);

    if (opt.customResponse !== undefined) {
      setPreviewChat(prev => [...prev, { id: uniqueId(), sender: 'bot', text: opt.customResponse }]);
    } else if (opt.actionKey) {
      setIsExecutingAction(true);
      try {
        const activeBotId = typeof window !== 'undefined' ? sessionStorage.getItem('active_bot_id') || undefined : undefined;
        const currentPhone = typeof window !== 'undefined' ? localStorage.getItem('bot_user_phone') || undefined : undefined;
        const dynamicPhone = currentPhone || ('+549' + Math.floor(1000000000 + Math.random() * 9000000000));
        const data = await BotApiClient.executeFunction(opt.actionKey, dynamicPhone, activeBotId);
        setLastRawResponse({ actionKey: opt.actionKey, label: opt.label, response: data, timestamp: new Date().toISOString() });
        logger.info({ actionKey: opt.actionKey, rawResponse: data }, 'Ejecución de función en simulador y respuesta RAW capturada');
        const botReply = data.success ? data.message : `Error ejecutando función: ${data.message}`;
        setPreviewChat(prev => [...prev, { id: uniqueId(), sender: 'bot', text: botReply }]);
      } catch (err: any) {
        setLastRawResponse({ actionKey: opt.actionKey, label: opt.label, error: err.message, timestamp: new Date().toISOString() });
        logger.error({ actionKey: opt.actionKey, err }, 'Error ejecutando función en simulador');
        setPreviewChat(prev => [...prev, { id: uniqueId(), sender: 'bot', text: `Error de conexión al ejecutar la función: ${err.message}` }]);
      } finally {
        setIsExecutingAction(false);
      }
    } else {
      setPreviewChat(prev => [...prev, { id: uniqueId(), sender: 'bot', text: `Has seleccionado: ${opt.label}` }]);
    }
  };

  const handleAddOption = () => {
    const nextNum = String(options.length + 1);
    setOptions([...options, { id: Math.random().toString(36).substring(2, 9) + '-' + Date.now(), number: nextNum, label: 'Nueva Opción' }]);
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
        description: 'Bot gestionado desde Bot Manager',
        welcomeMessage,
        invalidOptionMessage,
        options,
      });
      const activeId = createdBot?.botId || createdBot?.id;
      if (activeId && typeof window !== 'undefined') {
        sessionStorage.setItem('active_bot_id', activeId);
      }
      addToast('¡Cambios guardados exitosamente en la base de datos!', 'success');
      logger.info({ botName, botPhone, welcomeMessage, menuTitle, optionsCount: options.length, activeId }, 'Bot sincronizado con base de datos');
    } catch (err: any) {
      logger.error({ err }, 'Error al guardar bot en BotManagementPanel');
      addToast(`Error al guardar bot: ${err.message}`, 'error');
    } finally {
      setIsExecutingAction(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Superior con Selector de Bots y Estado Online */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: '24px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', display: 'flex' }}>
            <SvgIcons.bot />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{botName}</h2>
              <span style={{
                background: isOnline ? '#dcfce7' : '#fee2e2',
                color: isOnline ? '#166534' : '#991b1b',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444' }}></span>
                {isOnline ? 'Online (Activo)' : 'Offline'}
              </span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: '2px 0 0 0' }}>WhatsApp ID: {botPhone}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '2px', color: 'var(--color-text-muted)' }}>
              Seleccionar Bot:
            </label>
            <select
              value={selectedBotId}
              onChange={(e) => handleSelectBot(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: '13px',
                fontWeight: '600',
                minWidth: '220px',
              }}
            >
              {allBots.map((b: any) => (
                <option key={b.botId || b.id} value={b.botId || b.id}>
                  🤖 {b.name} ({b.botId || b.phoneNumber})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              const name = prompt('Nombre del nuevo bot:', 'Mi Nuevo Bot');
              if (name) {
                setBotName(name);
                setBotPhone('+549' + Math.floor(1000000000 + Math.random() * 9000000000));
                addToast('Nuevo bot creado en el editor.', 'success');
              }
            }}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
            }}
          >
            <SvgIcons.plus /> Nuevo Bot
          </button>
        </div>
      </div>

      {/* Dashboard Unificado: Simulador en Vivo como Único Editor Exclusivo */}
      <form onSubmit={handleFinish} style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SvgIcons.smartphone /> Simulador y Editor Visual en Vivo
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
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            maxHeight: '650px',
            overflowY: 'auto',
          }}>
            {/* Mensaje de Bienvenida estilo WhatsApp con Edición In-Place */}
            <div style={{
              alignSelf: 'flex-start',
              background: '#ffffff',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-soft)',
              color: '#111b21',
              fontSize: '14px',
              lineHeight: '1.4',
              width: '100%',
              maxWidth: '100%',
              position: 'relative',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: '600', color: '#00a884', fontSize: '12px' }}>{botName}</span>
                <button
                  type="button"
                  title="Editar mensaje y menú en línea"
                  onClick={() => setIsEditingWelcome(!isEditingWelcome)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#555' }}
                >
                  <SvgIcons.edit />
                </button>
              </div>

              {!isEditingWelcome ? (
                <div>
                  <div style={{ marginBottom: '10px', whiteSpace: 'pre-line' }}>{welcomeMessage}</div>
                  <div style={{ fontWeight: '600', marginBottom: '10px', color: '#2563eb' }}>{menuTitle}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {options.map((opt) => (
                      <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={isExecutingAction}
                            onClick={() => handleInteractOption(opt)}
                            style={{
                              flex: 1,
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
                            }}
                          >
                            <span style={{ fontWeight: '700' }}>{opt.number}.</span> {opt.label}
                          </button>
                          <button
                            type="button"
                            title="Editar opción"
                            onClick={() => setEditingOptionId(editingOptionId === opt.id ? null : opt.id)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #d1d7db',
                              borderRadius: '50%',
                              width: '28px',
                              height: '28px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#005c4b',
                              flexShrink: 0,
                            }}
                          >
                            <SvgIcons.edit />
                          </button>
                        </div>

                        {editingOptionId === opt.id && (
                          <div style={{
                            background: '#f8fafc',
                            border: '1px solid #00a884',
                            borderRadius: '8px',
                            padding: '10px',
                            fontSize: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            marginTop: '2px',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', color: '#00a884' }}>
                              <span>✏️ Editar Opción {opt.number}</span>
                              <button type="button" onClick={() => setEditingOptionId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#667' }}>✕</button>
                            </div>
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => handleUpdateOption(opt.id, { label: e.target.value })}
                              placeholder="Título de la opción"
                              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', color: '#111' }}
                            />
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateOption(opt.id, { customResponse: undefined, actionKey: opt.actionKey || 'stock.check' })}
                                style={{ background: opt.customResponse === undefined ? '#00a884' : '#e2e8f0', color: opt.customResponse === undefined ? '#fff' : '#333', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                              >
                                ⚡ Función
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateOption(opt.id, { customResponse: opt.customResponse || 'Respuesta...', actionKey: undefined })}
                                style={{ background: opt.customResponse !== undefined ? '#00a884' : '#e2e8f0', color: opt.customResponse !== undefined ? '#fff' : '#333', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                              >
                                💬 Texto Libre
                              </button>
                            </div>
                            {opt.customResponse !== undefined ? (
                              <textarea
                                value={opt.customResponse}
                                onChange={(e) => handleUpdateOption(opt.id, { customResponse: e.target.value })}
                                rows={2}
                                placeholder="Respuesta de texto libre..."
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', background: '#fff', color: '#111' }}
                              />
                            ) : (
                              <select
                                value={opt.actionKey || ''}
                                onChange={(e) => handleUpdateOption(opt.id, { actionKey: e.target.value })}
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', background: '#fff', color: '#111' }}
                              >
                                {AVAILABLE_FUNCTIONS.map((fn) => (
                                  <option key={fn.key} value={fn.key}>{fn.label}</option>
                                ))}
                              </select>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                              <button type="button" onClick={() => handleDeleteOption(opt.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Eliminar</button>
                              <button type="button" onClick={() => setEditingOptionId(null)} style={{ background: '#00a884', color: '#fff', border: 'none', padding: '3px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Listo</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddOption}
                    style={{ background: '#f0f2f5', border: '1px dashed #00a884', color: '#00a884', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '10px', width: '100%', textAlign: 'center' }}
                  >
                    + Agregar nueva opción de menú
                  </button>
                </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#00a884', display: 'block', marginBottom: '4px' }}>Editar Mensaje de Bienvenida:</label>
                  <textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #00a884', fontSize: '13px', background: '#fff', color: '#111' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#00a884', display: 'block', marginBottom: '4px' }}>Editar Título del Menú:</label>
                  <input
                    type="text"
                    value={menuTitle}
                    onChange={(e) => setMenuTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #00a884', fontSize: '13px', background: '#fff', color: '#111' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingWelcome(false)}
                  style={{ background: '#00a884', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                >
                  ✓ Listo / Guardar
                </button>
              </div>
            )}

            <div style={{ fontSize: '10px', color: '#667781', textAlign: 'right', marginTop: '4px' }}>12:01 PM</div>
          </div>

            {/* Historial de Chat */}
            {previewChat.map((msg) => (
              <div
                key={msg.id}
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
                  position: 'relative',
                }}
              >
                {msg.sender === 'bot' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
                    <button
                      type="button"
                      title="Editar respuesta"
                      onClick={() => {
                        const updated = prompt('✏️ Editar respuesta:', msg.text);
                        if (updated !== null) {
                          setPreviewChat(prev => prev.map(m => m.id === msg.id ? { ...m, text: updated } : m));
                          addToast('Actualizado.', 'success');
                        }
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#555' }}
                    >
                      <SvgIcons.edit />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => {
                        setPreviewChat(prev => prev.filter(m => m.id !== msg.id));
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#e11d48' }}
                    >
                      <SvgIcons.trash />
                    </button>
                  </div>
                )}
                {msg.text}
              </div>
            ))}

            {isExecutingAction && (
              <div style={{ alignSelf: 'flex-start', background: '#ffffff', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#667781', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SvgIcons.spinner /> Ejecutando...
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isExecutingAction}
            style={{
              width: '100%',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              cursor: isExecutingAction ? 'wait' : 'pointer',
              boxShadow: 'var(--shadow-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '15px',
              marginTop: '16px',
            }}
          >
            {isExecutingAction ? <SvgIcons.spinner /> : <SvgIcons.check />} Guardar Cambios del Bot en la Base de Datos
          </button>
        </div>
      </form>
    </div>
  );
}
