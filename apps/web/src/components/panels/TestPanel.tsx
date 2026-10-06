'use client';

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';
import { useUserSession } from '@/lib/userSession';

interface MenuOption {
  number: string;
  label: string;
  response: string;
  subOptions?: MenuOption[];
}

export default function TestPanel() {
  const { userPhone, isLoggedIn, logout } = useUserSession();
  const [userBots, setUserBots] = useState<any[]>([]);

  const [botName, setBotName] = useState('Asistente Comercial Pro');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('¡Hola! Bienvenido al asistente virtual. Responde con el número de la opción deseada:');
  
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar bots del usuario si tiene sesión iniciada
  useEffect(() => {
    if (isLoggedIn && userPhone) {
      setPhoneNumber(userPhone);
      fetch(`http://localhost:4000/bot/profiles?phoneNumber=${encodeURIComponent(userPhone)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setUserBots(data.data);
            if (data.data.length > 0) {
              const latest = data.data[0];
              setBotName(latest.name);
              const primaryFlow = latest.flows?.find((f: any) => f.triggerKeyword === 'menu');
              if (primaryFlow) {
                setWelcomeMessage(primaryFlow.responseMessage);
                try {
                  const parsedOptions = JSON.parse(primaryFlow.content);
                  if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
                    setOptions(
                      parsedOptions.map((o: any, idx: number) => ({
                        number: String(o.option || idx + 1),
                        label: o.label,
                        response: o.response || `Respuesta para ${o.label}`,
                        subOptions: o.subOptions || [],
                      }))
                    );
                  }
                } catch (e) {}
              }
            }
          }
        })
        .catch((err) => logger.error({ err }, 'Error cargando bots del usuario'));
    }
  }, [isLoggedIn, userPhone]);
  
  // Sistema de menú numérico y submenús
  const [options, setOptions] = useState<MenuOption[]>([
    { 
      number: '1', 
      label: '📦 Consultar estado de mi pedido', 
      response: 'Por favor, indícame tu número de seguimiento o DNI para verificar el envío.',
      subOptions: [
        { number: '1', label: '🔍 Rastrear por DNI', response: 'Por favor, ingresa tu número de DNI.' },
        { number: '2', label: '📦 Rastrear por Código de Envío', response: 'Por favor, ingresa tu código de seguimiento.' }
      ]
    },
    { number: '2', label: '🛠️ Soporte técnico y garantías', response: 'Por favor, descríbenos brevemente el problema técnico o adjunta foto/video de garantía.' },
    { number: '3', label: '💰 Ver catálogos y precios', response: 'Puedes ver nuestro catálogo actualizado y lista de precios en nuestra web.' },
    { number: '4', label: '🕒 Horarios de atención y ubicación', response: 'Atendemos de lunes a viernes de 9:00 a 18:00 hrs.' },
    { number: '5', label: '👤 Hablar con un asesor humano', response: 'Derivando con un operador humano. En breve un asesor te atenderá...' },
  ]);

  // Estados de navegación inline y modo edición por ítem
  const [activeParentNumber, setActiveParentNumber] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');

  // Generar texto completo del menú principal
  const generateMenuText = (currentOptions: MenuOption[], currentWelcome: string) => {
    const menuItems = currentOptions.map((opt) => `${opt.number}. ${opt.label}`).join('\n');
    return `${currentWelcome}\n\n${menuItems}\n\nResponde con el número de tu opción:`;
  };

  const generateSubMenuText = (parent: MenuOption) => {
    const subs = parent.subOptions || [];
    const items = subs.map((s) => `${s.number}. ${s.label}`).join('\n');
    return `${parent.response}\n\n${items}\n\nResponde con el número de la opción o 0 para volver al menú principal:`;
  };

  // Simulador interactivo en tiempo real con soporte de submenús
  const [chatLog, setChatLog] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    { sender: 'bot', text: generateMenuText([
      { 
        number: '1', 
        label: '📦 Consultar estado de mi pedido', 
        response: 'Por favor, indícame tu número de seguimiento o DNI para verificar el envío.',
        subOptions: [
          { number: '1', label: '🔍 Rastrear por DNI', response: 'Por favor, ingresa tu número de DNI.' },
          { number: '2', label: '📦 Rastrear por Código de Envío', response: 'Por favor, ingresa tu código de seguimiento.' }
        ]
      },
      { number: '2', label: '🛠️ Soporte técnico y garantías', response: 'Por favor, descríbenos brevemente el problema técnico o adjunta foto/video de garantía.' },
      { number: '3', label: '💰 Ver catálogos y precios', response: 'Puedes ver nuestro catálogo actualizado y lista de precios en nuestra web.' },
      { number: '4', label: '🕒 Horarios de atención y ubicación', response: 'Atendemos de lunes a viernes de 9:00 a 18:00 hrs.' },
      { number: '5', label: '👤 Hablar con un asesor humano', response: 'Derivando con un operador humano. En breve un asesor te atenderá...' },
    ], '¡Hola! Bienvenido al asistente virtual. Responde con el número de la opción deseada:') },
  ]);

  const [chatParentNumber, setChatParentNumber] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    if (activeParentNumber === null) {
      const nextNumber = (options.length + 1).toString();
      const newOpt: MenuOption = {
        number: nextNumber,
        label: newLabel.trim(),
        response: `Respuesta automática para ${newLabel.trim()}`,
        subOptions: [],
      };

      const updatedOptions = [...options, newOpt];
      setOptions(updatedOptions);
      setNewLabel('');

      setChatLog([
        { sender: 'bot', text: generateMenuText(updatedOptions, welcomeMessage) },
      ]);
      setChatParentNumber(null);
      logger.info({ number: nextNumber, label: newOpt.label }, 'Nueva opción de menú principal añadida');
    } else {
      const updatedOptions = options.map((opt) => {
        if (opt.number === activeParentNumber) {
          const subs = opt.subOptions || [];
          const nextNum = (subs.length + 1).toString();
          const newSub: MenuOption = {
            number: nextNum,
            label: newLabel.trim(),
            response: `Respuesta automática para ${newLabel.trim()}`,
          };
          return { ...opt, subOptions: [...subs, newSub] };
        }
        return opt;
      });
      setOptions(updatedOptions);
      setNewLabel('');
      logger.info({ parent: activeParentNumber, label: newLabel.trim() }, 'Nueva opción de submenú añadida');
    }
  };

  const handleDeleteOption = (number: string) => {
    if (activeParentNumber === null) {
      const remaining = options.filter((o) => o.number !== number);
      const reindexed = remaining.map((o, idx) => ({ ...o, number: (idx + 1).toString() }));
      setOptions(reindexed);
      setChatLog([
        { sender: 'bot', text: generateMenuText(reindexed, welcomeMessage) },
      ]);
      setChatParentNumber(null);
      logger.info({ number }, 'Opción de menú principal eliminada y renumerada');
    } else {
      const updatedOptions = options.map((opt) => {
        if (opt.number === activeParentNumber) {
          const subs = opt.subOptions || [];
          const remaining = subs.filter((s) => s.number !== number);
          const reindexed = remaining.map((s, idx) => ({ ...s, number: (idx + 1).toString() }));
          return { ...opt, subOptions: reindexed };
        }
        return opt;
      });
      setOptions(updatedOptions);
      logger.info({ parent: activeParentNumber, number }, 'Opción de submenú eliminada y renumerada');
    }
  };

  const handleUpdateMainLabel = (number: string, newLabelText: string) => {
    const updatedOptions = options.map((opt) => {
      if (opt.number === number) {
        return { ...opt, label: newLabelText, response: `Respuesta automática para ${newLabelText}` };
      }
      return opt;
    });
    setOptions(updatedOptions);
    setChatLog([
      { sender: 'bot', text: generateMenuText(updatedOptions, welcomeMessage) },
    ]);
    logger.info({ number, newLabelText }, 'Menú principal actualizado');
  };

  const handleUpdateParentResponse = (parentNumber: string, newResponseText: string) => {
    const updatedOptions = options.map((opt) => {
      if (opt.number === parentNumber) {
        return { ...opt, response: newResponseText };
      }
      return opt;
    });
    setOptions(updatedOptions);
    logger.info({ parentNumber, newResponseText }, 'Respuesta del menú principal/submenú actualizada');
  };

  const handleUpdateSubLabel = (subNumber: string, newLabelText: string) => {
    if (!activeParentNumber) return;
    const updatedOptions = options.map((opt) => {
      if (opt.number === activeParentNumber) {
        const subs = opt.subOptions || [];
        const updatedSubs = subs.map((sub) => {
          if (sub.number === subNumber) {
            return { ...sub, label: newLabelText, response: `Respuesta automática para ${newLabelText}` };
          }
          return sub;
        });
        return { ...opt, subOptions: updatedSubs };
      }
      return opt;
    });
    setOptions(updatedOptions);
    logger.info({ parent: activeParentNumber, subNumber, newLabelText }, 'Submenú actualizado');
  };

  const handleSaveBotToBackend = async () => {
    const targetPhone = isLoggedIn && userPhone ? userPhone : phoneNumber;
    if (!targetPhone.trim()) {
      setSaveStatus('Redirigiendo al inicio de sesión con WhatsApp...');
      window.location.href = '/';
      return;
    }
    if (!botName.trim()) {
      setSaveStatus('Error: El nombre del bot es obligatorio.');
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await fetch('http://localhost:4000/bot/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: targetPhone.trim(),
          name: botName.trim(),
          welcomeMessage,
          menuOptions: options.map(opt => ({ label: opt.label, option: opt.number, subOptions: opt.subOptions || [] })),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSaveStatus(`¡Bot "${botName}" guardado con éxito para el número ${targetPhone}!\nID único: ${data.data.botId}`);
        logger.info({ botId: data.data.botId, targetPhone }, 'Bot guardado en base de datos');
      } else {
        const errorMsg = data.error?.technicalMessage || data.error?.message || 'Error desconocido';
        setSaveStatus(`Error al guardar: ${errorMsg}`);
      }
    } catch (err: any) {
      setSaveStatus(`Error de conexión con el backend: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetChat = () => {
    setChatParentNumber(null);
    setChatLog([
      { sender: 'bot', text: generateMenuText(options, welcomeMessage) },
    ]);
    logger.info('Reiniciando simulador de menú numérico');
  };

  const handleTestSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    const userText = testInput.trim();
    const newChatLog = [...chatLog, { sender: 'user' as const, text: userText }];

    let botReply = '';

    if (chatParentNumber === null) {
      const matchedOption = options.find((opt) => opt.number === userText);
      if (matchedOption) {
        if (matchedOption.subOptions && matchedOption.subOptions.length > 0) {
          setChatParentNumber(matchedOption.number);
          botReply = generateSubMenuText(matchedOption);
        } else {
          botReply = matchedOption.response;
        }
      } else {
        botReply = `Opción no válida. Por favor, responde con un número del 1 al ${options.length}.`;
      }
    } else {
      const parentOpt = options.find((opt) => opt.number === chatParentNumber);
      if (userText === '0') {
        setChatParentNumber(null);
        botReply = generateMenuText(options, welcomeMessage);
      } else if (parentOpt && parentOpt.subOptions) {
        const matchedSub = parentOpt.subOptions.find((s) => s.number === userText);
        if (matchedSub) {
          botReply = matchedSub.response;
        } else {
          botReply = `Opción no válida. Responde con un número del 1 al ${parentOpt.subOptions.length} o 0 para volver.`;
        }
      } else {
        setChatParentNumber(null);
        botReply = generateMenuText(options, welcomeMessage);
      }
    }

    setTimeout(() => {
      setChatLog((prev) => [...prev, { sender: 'bot', text: botReply }]);
    }, 400);

    setChatLog(newChatLog);
    setTestInput('');
    logger.info({ input: userText, parent: chatParentNumber }, 'Entrada de usuario en simulador con submenús');
  };

  const handleSelectNumber = (opt: MenuOption) => {
    let newLog = [...chatLog, { sender: 'user' as const, text: `${opt.number} (${opt.label})` }];
    let botReply = '';

    if (chatParentNumber === null) {
      if (opt.subOptions && opt.subOptions.length > 0) {
        setChatParentNumber(opt.number);
        botReply = generateSubMenuText(opt);
      } else {
        botReply = opt.response;
      }
    } else {
      botReply = opt.response;
    }

    newLog.push({ sender: 'bot' as const, text: botReply });
    setChatLog(newLog);
    logger.info({ number: opt.number }, 'Usuario seleccionó opción en simulador');
  };

  const activeParentOpt = activeParentNumber !== null ? options.find(o => o.number === activeParentNumber) : null;
  const currentSubList = activeParentOpt?.subOptions || [];

  return (
    <div style={{ padding: '8px 24px 24px 24px', textAlign: 'left' }}>
      <h1 style={{ marginTop: '8px', marginBottom: '8px' }}>Asistente de Menú Numérico y Submenús</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
        Diseña tus bots y pruébalos en tiempo real con el simulador interactivo.
      </p>

      {/* Banner de Sesión de Usuario (WhatsApp Auth) */}
      <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-lg)', backgroundColor: isLoggedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${isLoggedIn ? '#10b981' : '#ef4444'}`, marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
          {isLoggedIn ? (
            <span>🟢 <strong>Sesión Iniciada por WhatsApp</strong> — Teléfono: <span style={{ color: 'var(--color-primary)' }}>{userPhone}</span> ({userBots.length} bots cargados de tu base de datos)</span>
          ) : (
            <span>🔴 <strong>Modo Anónimo</strong> — Puedes usar el simulador y diseñar bots libremente. Para guardar tus bots en la base de datos y cargar tus diseños guardados, inicia sesión enviando <strong>"1"</strong> al bot de WhatsApp y abriendo tu enlace mágico.</span>
          )}
        </div>
        {isLoggedIn && (
          <button
            onClick={logout}
            style={{ background: 'none', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: '16px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Cerrar Sesión
          </button>
        )}
      </div>

      {/* Grid de Configuración y Simulador */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Columna Izquierda: Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Configuración General */}
          <div style={{ padding: '20px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="settings" style={{ width: '20px', height: '20px', color: 'var(--color-primary)' }} />
              <span>1. Configuración del Bot</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {!isLoggedIn && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Número de Teléfono (Modo Anónimo)</label>
                  <input
                    type="text"
                    placeholder="ej: +5491112345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', marginTop: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                  />
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Nombre del Bot</label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', marginTop: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Mensaje de Saludo Inicial</label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => {
                    setWelcomeMessage(e.target.value);
                    if (activeParentNumber === null) {
                      setChatLog([{ sender: 'bot', text: generateMenuText(options, e.target.value) }]);
                    }
                  }}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', marginTop: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', resize: 'none' }}
                />
              </div>

              {/* Botón Guardar en Backend */}
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      window.location.href = '/';
                      return;
                    }
                    handleSaveBotToBackend();
                  }}
                  disabled={isSaving}
                  style={{ width: '100%', padding: '12px', backgroundColor: isLoggedIn ? 'var(--color-primary)' : '#2563eb', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}
                >
                  {isSaving ? 'Guardando en Base de Datos...' : isLoggedIn ? '💾 Guardar Bot en mi Base de Datos' : '📲 Iniciar Sesión con WhatsApp para Guardar'}
                </button>
                {saveStatus && (
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: saveStatus.startsWith('Error') ? 'var(--color-error)' : '#2ecc71', whiteSpace: 'pre-line' }}>
                    {saveStatus}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor de Menú */}
          <div style={{ padding: '20px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
            {/* Cabecera dinámica */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Icon name="chat" style={{ width: '20px', height: '20px', color: 'var(--color-secondary)' }} />
                <span>
                  {activeParentNumber === null 
                    ? '2. Menú Principal' 
                    : `Submenús de: [${activeParentOpt?.number}] ${activeParentOpt?.label}`}
                </span>
              </h3>
              {activeParentNumber !== null && (
                <button
                  onClick={() => setActiveParentNumber(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  ← Volver al Menú Principal
                </button>
              )}
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              {activeParentNumber === null 
                ? 'Usa el botón "✏️ Editar" para modificar un ítem o "✕" para borrarlo.' 
                : 'Usa el botón "✏️ Editar" en el submenú o "✕" para borrarlo.'}
            </p>

            {/* Nivel 1: Menú Principal */}
            {activeParentNumber === null && (
              <>
                <div style={{ marginTop: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {options.map((opt) => (
                    <div
                      key={opt.number}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Parte Superior: Título y número */}
                      <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)', minWidth: '16px' }}>{opt.number}.</span>
                        {editingId === opt.number ? (
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => handleUpdateMainLabel(opt.number, e.target.value)}
                            autoFocus
                            style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                          />
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--color-text)', flex: 1, wordBreak: 'break-word' }}>{opt.label}</span>
                        )}
                      </div>

                      {/* Parte Inferior: Botones que bajan ordenados en horizontal */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', width: '100%', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setActiveParentNumber(opt.number)}
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          Submenús ({opt.subOptions?.length || 0}) &rarr;
                        </button>
                        <button
                          onClick={() => setEditingId(editingId === opt.number ? null : opt.number)}
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          {editingId === opt.number ? '✓ Listo' : '✏️ Editar'}
                        </button>
                        <button
                          onClick={() => handleDeleteOption(opt.number)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontWeight: 'bold', padding: '4px 8px', fontSize: '1rem' }}
                          title="Borrar opción"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulario Agregar Ítem Principal */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <form onSubmit={handleAddOption} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nuevo ítem..."
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                    />
                    <button
                      type="submit"
                      style={{ padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Agregar
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* Nivel 2: Listado de Submenús */}
            {activeParentNumber !== null && (
              <>
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>
                    Mensaje del bot al abrir este menú:
                  </label>
                  <textarea
                    value={activeParentOpt?.response || ''}
                    onChange={(e) => handleUpdateParentResponse(activeParentNumber, e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem', resize: 'none', outline: 'none' }}
                  />
                </div>

                <div style={{ marginTop: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentSubList.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                      No hay submenús creados. Agrega uno abajo.
                    </div>
                  ) : (
                    currentSubList.map((sub) => (
                      <div
                        key={sub.number}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        {/* Parte Superior: Título y número */}
                        <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-primary)', minWidth: '16px' }}>{sub.number}.</span>
                          {editingId === sub.number ? (
                            <input
                              type="text"
                              value={sub.label}
                              onChange={(e) => handleUpdateSubLabel(sub.number, e.target.value)}
                              autoFocus
                              style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                            />
                          ) : (
                            <span style={{ fontWeight: 600, color: 'var(--color-text)', flex: 1, wordBreak: 'break-word' }}>{sub.label}</span>
                          )}
                        </div>

                        {/* Parte Inferior: Botones que bajan ordenados en horizontal */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', width: '100%', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setEditingId(editingId === sub.number ? null : sub.number)}
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            {editingId === sub.number ? '✓ Listo' : '✏️ Editar'}
                          </button>
                          <button
                            onClick={() => handleDeleteOption(sub.number)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontWeight: 'bold', padding: '4px 8px', fontSize: '1rem' }}
                            title="Borrar submenú"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Formulario Agregar Submenú */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <form onSubmit={handleAddOption} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nuevo submenú..."
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                    />
                    <button
                      type="submit"
                      style={{ padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Agregar
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Columna Derecha: Simulador en Vivo */}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)', overflow: 'hidden', height: '560px' }}>
          <div style={{ padding: '16px 20px', backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Simulador: {botName}</h3>
            </div>
            <button
              onClick={handleResetChat}
              style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
            >
              Reiniciar Menú
            </button>
          </div>

          {/* Mensajes de chat */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--color-background)' }}>
            {chatLog.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.sender === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: msg.sender === 'user' ? 'white' : 'var(--color-text)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  fontSize: '0.9rem',
                  whiteSpace: 'pre-line',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Botones de acceso rápido numéricos + Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {chatParentNumber === null ? (
                options.map((opt) => (
                  <button
                    key={opt.number}
                    onClick={() => handleSelectNumber(opt)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Marcar [{opt.number}]
                  </button>
                ))
              ) : (
                <>
                  <button
                    onClick={() => {
                      setChatParentNumber(null);
                      setChatLog((prev) => [...prev, { sender: 'bot', text: generateMenuText(options, welcomeMessage) }]);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-error)',
                      border: '1px solid var(--color-error)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Volver [0]
                  </button>
                  {options.find(o => o.number === chatParentNumber)?.subOptions?.map((sub) => (
                    <button
                      key={sub.number}
                      onClick={() => handleSelectNumber(sub)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-primary)',
                        border: '1px solid var(--color-primary)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Sub [{sub.number}]
                    </button>
                  ))}
                </>
              )}
            </div>

            <form onSubmit={handleTestSend} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder={chatParentNumber === null ? "Escribe el número de la opción (ej: 1)..." : "Escribe submenú (ej: 1 o 0 para volver)..."}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', outline: 'none' }}
              />
              <button
                type="submit"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Icon name="chat" style={{ width: '18px', height: '18px', color: 'white' }} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
