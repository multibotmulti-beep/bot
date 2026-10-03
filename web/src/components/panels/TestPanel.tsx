'use client';

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  messages: { sender: string; text: string; time: string }[];
}

export default function TestPanel() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>('1');
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [inputText, setInputText] = useState('');

  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      name: 'Bot Asistente Comercial (Pruebas)',
      lastMessage: 'Hola, bienvenido al entorno de pruebas del bot.',
      time: '10:45 AM',
      messages: [
        { sender: 'client', text: 'Hola, prueba de comando bot.', time: '10:45 AM' },
        { sender: 'me', text: '¡Hola! Entorno de pruebas operativo.', time: '10:46 AM' },
      ],
    },
    {
      id: '2',
      name: 'Bot de Inventario (Pruebas)',
      lastMessage: 'Sincronización de prueba completada.',
      time: '09:20 AM',
      messages: [
        { sender: 'client', text: 'Ver estado de stock en sandbox.', time: '09:20 AM' },
        { sender: 'me', text: 'Stock simulado: 100 unidades.', time: '09:21 AM' },
      ],
    },
  ]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeChat = chats.find((c) => c.id === selectedChatId);

  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    if (isMobileView) {
      setMobileShowChat(true);
    }
    logger.info({ chatId: id }, 'Seleccionando bot de pruebas en TestPanel');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const newMessage = {
      sender: 'me',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id
          ? { ...chat, messages: [...chat.messages, newMessage], lastMessage: inputText }
          : chat
      )
    );
    setInputText('');
    logger.info({ chatId: activeChat.id }, 'Mensaje enviado en simulador de bot (TestPanel)');
  };

  return (
    <div style={{ padding: '8px 24px 24px 24px', textAlign: 'left' }}>
      <h1 style={{ marginTop: '8px', marginBottom: '12px' }}>Panel de Pruebas: Simulador Bots WhatsApp</h1>

      {/* Contenedor principal del simulador de bots integrado en pruebas */}
      <div
        style={{
          height: 'calc(100vh - 180px)',
          minHeight: '480px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)',
          display: 'grid',
          gridTemplateColumns: isMobileView ? '1fr' : '300px 1fr',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Panel izquierdo: Lista de Bots */}
        {(!isMobileView || !mobileShowChat) && (
          <div
            style={{
              borderRight: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--color-background)',
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="chat" style={{ width: '20px', height: '20px', color: 'var(--color-primary)' }} />
              <span>Bots en Sandbox</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: selectedChatId === chat.id ? 'var(--color-surface)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{chat.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{chat.time}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {chat.lastMessage}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel derecho / Vista unificada: Conversación Activa */}
        {(!isMobileView || mobileShowChat) && (
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', height: '100%', overflow: 'hidden' }}>
            {activeChat ? (
              <>
                {/* Cabecera del chat */}
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'var(--color-background)',
                  }}
                >
                  {isMobileView && (
                    <button
                      onClick={() => setMobileShowChat(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }}
                    >
                      &larr; Volver
                    </button>
                  )}
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{activeChat.name}</div>
                </div>

                {/* Historial de mensajes */}
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--color-background)' }}>
                  {activeChat.messages.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                        backgroundColor: msg.sender === 'me' ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: msg.sender === 'me' ? 'white' : 'var(--color-text)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        maxWidth: '75%',
                        boxShadow: 'var(--shadow-soft)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <div>{msg.text}</div>
                      <div style={{ fontSize: '0.7rem', textAlign: 'right', marginTop: '4px', opacity: 0.8 }}>{msg.time}</div>
                    </div>
                  ))}
                </div>

                {/* Input de envío */}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    gap: '10px',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Enviar mensaje de prueba al bot..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '20px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text)',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name="chat" style={{ width: '18px', height: '18px', color: 'white' }} />
                  </button>
                </form>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                Selecciona un bot para probar
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
