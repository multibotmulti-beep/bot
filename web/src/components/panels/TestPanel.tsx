'use client';

import { useState } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';

interface MenuOption {
  number: string;
  label: string;
  response: string;
  subOptions?: MenuOption[];
}

export default function TestPanel() {
  const [botName, setBotName] = useState('Asistente Comercial Pro');
  const [welcomeMessage, setWelcomeMessage] = useState('¡Hola! Bienvenido a nuestro asistente virtual. Por favor, responde con el número de la opción deseada:');
  
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
    { number: '2', label: '🛠️ Soporte técnico y garantías', response: 'Por favor, descríbenos brevemente el problema técnico o adjunta foto/video de tu garantía.' },
    { number: '3', label: '💰 Ver catálogos y precios', response: 'Puedes ver nuestro catálogo actualizado y lista de precios en nuestra web o solicitar el PDF aquí.' },
    { number: '4', label: '🕒 Horarios de atención y ubicación', response: 'Atendemos de lunes a viernes de 9:00 a 18:00 hrs. Estamos ubicados en Av. Principal #123.' },
    { number: '5', label: '👤 Hablar con un asesor humano', response: 'Derivando con un operador humano. En breve un asesor te atenderá...' },
  ]);

  // Estados de navegación inline (Listado / Detalle sin modal)
  const [activeParentNumber, setActiveParentNumber] = useState<string | null>(null);
  const [selectedSubNumber, setSelectedSubNumber] = useState<string | null>(null);

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
      { number: '2', label: '🛠️ Soporte técnico y garantías', response: 'Por favor, descríbenos brevemente el problema técnico o adjunta foto/video de tu garantía.' },
      { number: '3', label: '💰 Ver catálogos y precios', response: 'Puedes ver nuestro catálogo actualizado y lista de precios en nuestra web o solicitar el PDF aquí.' },
      { number: '4', label: '🕒 Horarios de atención y ubicación', response: 'Atendemos de lunes a viernes de 9:00 a 18:00 hrs. Estamos ubicados en Av. Principal #123.' },
      { number: '5', label: '👤 Hablar con un asesor humano', response: 'Derivando con un operador humano. En breve un asesor te atenderá...' },
    ], '¡Hola! Bienvenido a nuestro asistente virtual. Por favor, responde con el número de la opción deseada:') },
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
      if (selectedSubNumber === number) {
        setSelectedSubNumber(null);
      }
      logger.info({ parent: activeParentNumber, number }, 'Opción de submenú eliminada y renumerada');
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

  // Objetos activos para navegación inline
  const activeParentOpt = activeParentNumber !== null ? options.find(o => o.number === activeParentNumber) : null;
  const currentSubList = activeParentOpt?.subOptions || [];
  const selectedSubOpt = selectedSubNumber !== null ? currentSubList.find(s => s.number === selectedSubNumber) : null;

  return (
    <div style={{ padding: '8px 24px 24px 24px', textAlign: 'left' }}>
      <h1 style={{ marginTop: '8px', marginBottom: '8px' }}>Asistente de Menú Numérico y Submenús</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        Configura menús interactivos y submenús con navegación inline (Listado / Detalle) sin descripciones ni ventanas emergentes.
      </p>

      {/* Grid de Configuración y Simulador */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Columna Izquierda: Editor con Navegación Inline (Listado / Detalle) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Configuración General */}
          <div style={{ padding: '20px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="settings" style={{ width: '20px', height: '20px', color: 'var(--color-primary)' }} />
              <span>1. Configuración del Bot</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
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
            </div>
          </div>

          {/* Editor de Menú con Navegación Inline (Listado / Detalle) */}
          <div style={{ padding: '20px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
            {/* Cabecera dinámica según nivel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Icon name="chat" style={{ width: '20px', height: '20px', color: 'var(--color-secondary)' }} />
                <span>
                  {activeParentNumber === null 
                    ? '2. Menú Principal' 
                    : selectedSubNumber === null 
                      ? `Submenús de: [${activeParentOpt?.number}] ${activeParentOpt?.label}` 
                      : `Detalle del Submenú`}
                </span>
              </h3>
              {activeParentNumber !== null && (
                <button
                  onClick={() => {
                    if (selectedSubNumber !== null) {
                      setSelectedSubNumber(null);
                    } else {
                      setActiveParentNumber(null);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  {selectedSubNumber !== null ? '← Volver al listado' : '← Volver al Menú Principal'}
                </button>
              )}
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              {activeParentNumber === null 
                ? 'Toca cualquier ítem del menú para entrar y gestionar sus submenús.' 
                : selectedSubNumber === null 
                  ? 'Toca un submenú para ver su detalle o agrega uno nuevo abajo.' 
                  : 'Detalle e información del submenú seleccionado.'}
            </p>

            {/* Nivel 1: Menú Principal */}
            {activeParentNumber === null && (
              <>
                <div style={{ marginTop: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {options.map((opt) => (
                    <div
                      key={opt.number}
                      onClick={() => {
                        setActiveParentNumber(opt.number);
                        setSelectedSubNumber(null);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', flex: 1 }}>
                        <strong style={{ color: 'var(--color-primary)' }}>{opt.number}. {opt.label} (+)</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px', fontWeight: 600 }}>
                          Submenús anidados: {opt.subOptions?.length || 0} (Toca para entrar &rarr;)
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOption(opt.number);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontWeight: 'bold', padding: '4px 8px' }}
                        title="Eliminar opción"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Formulario con un solo campo y botón Agregar debajo */}
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
            {activeParentNumber !== null && selectedSubNumber === null && (
              <>
                <div style={{ marginTop: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentSubList.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                      No hay submenús creados. Agrega uno abajo.
                    </div>
                  ) : (
                    currentSubList.map((sub) => (
                      <div
                        key={sub.number}
                        onClick={() => setSelectedSubNumber(sub.number)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', flex: 1 }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{sub.number}. {sub.label}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px', fontWeight: 600 }}>
                            Ver detalle (Toca aquí &rarr;)
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOption(sub.number);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontWeight: 'bold', padding: '4px 8px' }}
                          title="Eliminar submenú"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Formulario con un solo campo y botón Agregar debajo */}
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

            {/* Nivel 3: Detalle del Submenú */}
            {activeParentNumber !== null && selectedSubNumber !== null && selectedSubOpt && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                <div style={{ padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Número de Opción: [{selectedSubOpt.number}]
                  </div>
                  <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                    {selectedSubOpt.label}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      onClick={() => handleDeleteOption(selectedSubOpt.number)}
                      style={{ padding: '8px 14px', backgroundColor: 'var(--color-error)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      Eliminar este Submenú
                    </button>
                  </div>
                </div>
              </div>
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
