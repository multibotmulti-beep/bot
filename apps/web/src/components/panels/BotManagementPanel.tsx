'use client';

import { useState } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';
import { BotApiClient } from '@/lib/apiClient';

interface MenuOption {
  id: string;
  number: string;
  label: string;
  actionKey?: string;
}

const AVAILABLE_FUNCTIONS = [
  { key: '', label: '⚡ Ninguna (Navegación estándar)' },
  { key: 'stock.manage', label: '📦 Gestión de Stock (Aislado por Negocio)' },
  { key: 'turnos.book', label: '📅 Reserva de Turnos y Citas' },
  { key: 'pedidos.create', label: '🛍️ Creación de Pedidos y Compras' },
  { key: 'business.payment_info', label: '💳 Datos de Cobro (CBU / Alias / Banco)' },
  { key: 'payments.checkout', label: '🛒 Checkout y Enlace de Pago' },
  { key: 'faq.query', label: 'ℹ️ Preguntas Frecuentes y Horarios' },
  { key: 'mis.reservas', label: '📋 Consultar Mis Turnos y Pedidos' },
  { key: 'support.human', label: '👤 Derivar a Asesor Humano' },
  { key: 'auth.login', label: '🔑 Autenticación / Magic Link' },
];

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

  const handleInteractOption = async (opt: MenuOption) => {
    const userMsg = `${opt.number}. ${opt.label}`;
    setPreviewChat(prev => [...prev, { sender: 'user', text: userMsg }]);

    if (opt.actionKey) {
      setIsExecutingAction(true);
      try {
        const data = await BotApiClient.executeFunction(opt.actionKey, botPhone || '+5491155556666', botPhone || 'admin');
        setLastRawResponse({ actionKey: opt.actionKey, label: opt.label, response: data, timestamp: new Date().toISOString() });
        logger.info({ actionKey: opt.actionKey, rawResponse: data }, 'Ejecución de función en simulador y respuesta RAW capturada');
        const botReply = data.success ? data.message : `❌ Error ejecutando función: ${data.message}`;
        setPreviewChat(prev => [...prev, { sender: 'bot', text: botReply }]);
      } catch (err: any) {
        const errObj = { error: err.message };
        setLastRawResponse({ actionKey: opt.actionKey, label: opt.label, error: err.message, timestamp: new Date().toISOString() });
        logger.error({ actionKey: opt.actionKey, err }, 'Error ejecutando función en simulador');
        setPreviewChat(prev => [...prev, { sender: 'bot', text: `❌ Error de conexión al ejecutar la función: ${err.message}` }]);
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

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreated(true);
    logger.info({ botName, botPhone, welcomeMessage, menuTitle, layoutType, optionsCount: options.length }, 'Nuevo bot creado mediante flujo asistido');
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
      <div style={{ padding: '40px 24px', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: 'var(--shadow-soft)',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            fontSize: '32px',
          }}>
            ✓
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>¡Bot Creado Exitosamente!</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', marginBottom: '24px' }}>
            El bot <strong>{botName}</strong> (ID: <code>{botPhone}</code>) ha sido configurado con su mensaje de bienvenida y listado de menús con diseño <strong>{layoutType}</strong>.
          </p>
          <button
            onClick={handleReset}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            Crear Otro Bot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', textAlign: 'left', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>🤖 Crear Nuevo Bot (Flujo Asistido)</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
          Configura paso a paso el perfil, mensaje de bienvenida y el listado de menús con vista previa en tiempo real.
        </p>
      </div>

      {/* Stepper Indicator */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          flex: 1,
          padding: '12px 16px',
          borderRadius: '10px',
          background: step === 1 ? 'var(--color-primary)' : 'var(--color-surface)',
          color: step === 1 ? '#fff' : 'var(--color-text)',
          border: '1px solid var(--color-border)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: step === 1 ? 'rgba(255,255,255,0.2)' : 'var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
          }}>1</span>
          Paso 1: Mensaje de Bienvenida
        </div>
        <div style={{
          flex: 1,
          padding: '12px 16px',
          borderRadius: '10px',
          background: step === 2 ? 'var(--color-primary)' : 'var(--color-surface)',
          color: step === 2 ? '#fff' : 'var(--color-text)',
          border: '1px solid var(--color-border)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: step === 2 ? 'rgba(255,255,255,0.2)' : 'var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
          }}>2</span>
          Paso 2: Listado de Menús y Diseño
        </div>
      </div>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Configuración del Paso 1 */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Configuración General y Bienvenida</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Nombre del Bot</label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Ej: Asistente Comercial"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Teléfono / Bot ID</label>
                <input
                  type="text"
                  value={botPhone}
                  onChange={(e) => setBotPhone(e.target.value)}
                  placeholder="Ej: 5491155556666"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Mensaje de Bienvenida</label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
                placeholder="Escribe el mensaje inicial que recibirá el usuario..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          {/* Ejemplo en tiempo real abajo */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)',
          }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text-muted)' }}>
              📱 Vista Previa en Tiempo Real (Bienvenida)
            </h4>
            <div style={{
              background: '#efeae2',
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '400px',
            }}>
              <div style={{
                background: '#ffffff',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                color: '#111b21',
                fontSize: '14px',
                lineHeight: '1.4',
                position: 'relative',
              }}>
                <div style={{ fontWeight: '600', color: '#00a884', fontSize: '12px', marginBottom: '4px' }}>{botName}</div>
                <div>{welcomeMessage || 'Escribe un mensaje de bienvenida...'}</div>
                <div style={{ fontSize: '10px', color: '#667781', textAlign: 'right', marginTop: '4px' }}>12:00 PM</div>
              </div>
            </div>
          </div>

          {/* Botón Siguiente */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              Siguiente: Configurar Menús ➔
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleFinish} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Configuración del Paso 2 */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Listado de Menús y Diseño de Opciones</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Título del Menú</label>
                <input
                  type="text"
                  value={menuTitle}
                  onChange={(e) => setMenuTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Disposición de Opciones (Layout)</label>
                <select
                  value={layoutType}
                  onChange={(e) => setLayoutType(e.target.value as 'vertical' | 'horizontal')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                >
                  <option value="vertical">Vertical (Abajo / Columna)</option>
                  <option value="horizontal">Horizontal (Al costado / Fila)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Opciones del Menú</label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  style={{
                    background: 'none',
                    border: '1px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  + Agregar Opción
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {options.map((opt) => (
                  <div key={opt.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        background: 'var(--color-border)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontWeight: '600',
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
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(opt.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '8px',
                          fontWeight: 'bold',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-text-muted)' }}>
                        Función Vinculada (Acción Automática):
                      </label>
                      <select
                        value={opt.actionKey || ''}
                        onChange={(e) => handleUpdateOption(opt.id, { actionKey: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '12px',
                          borderRadius: '6px',
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

          {/* Ejemplo en tiempo real e interactivo */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: 'var(--color-text-muted)' }}>
                📱 Simulador Interactivo en Vivo ({layoutType === 'horizontal' ? 'Horizontal' : 'Vertical'})
              </h4>
              <button
                type="button"
                onClick={() => setPreviewChat([])}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Limpiar Chat
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
              💡 Haz clic en cualquier opción del menú para interactuar con la función real del sistema en tiempo real.
            </p>

            <div style={{
              background: '#efeae2',
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '550px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              {/* Mensaje de Bienvenida inicial */}
              <div style={{
                background: '#ffffff',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                color: '#111b21',
                fontSize: '14px',
                lineHeight: '1.4',
              }}>
                <div style={{ fontWeight: '600', color: '#00a884', fontSize: '12px', marginBottom: '4px' }}>{botName}</div>
                <div style={{ marginBottom: '8px' }}>{welcomeMessage}</div>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#3b82f6' }}>📋 {menuTitle}</div>
                
                {/* Opciones interactivas */}
                <div style={{
                  display: 'flex',
                  flexDirection: layoutType === 'horizontal' ? 'row' : 'column',
                  flexWrap: 'wrap',
                  gap: '6px',
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
                        padding: '8px 14px',
                        borderRadius: '16px',
                        fontSize: '13px',
                        color: '#005c4b',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isExecutingAction ? 'wait' : 'pointer',
                        transition: 'background 0.2s',
                        textAlign: 'left',
                        ...(layoutType === 'horizontal' ? { flex: '0 0 auto' } : { width: '100%' }),
                      }}
                    >
                      <span style={{ fontWeight: '700' }}>{opt.number}.</span> {opt.label} {opt.actionKey ? '⚡' : ''}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '10px', color: '#667781', textAlign: 'right', marginTop: '8px' }}>12:01 PM</div>
              </div>

              {/* Historial de Chat Interactivo */}
              {previewChat.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.sender === 'user' ? '#d9fdd3' : '#ffffff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
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
                <div style={{ alignSelf: 'flex-start', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', color: '#667781' }}>
                  ⏳ Ejecutando función en tiempo real...
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'none',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ⬅️ Anterior
            </button>
            <button
              type="submit"
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              🚀 Finalizar y Crear Bot
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
