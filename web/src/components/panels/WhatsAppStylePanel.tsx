'use client';

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';

interface Conversation {
  senderPhone: string;
  lastMessage: string;
  lastAt: string;
  totalMessages: number;
  botId: string;
}

interface Message {
  id: string;
  senderPhone: string;
  botId: string;
  direction: 'incoming' | 'outgoing';
  message: string;
  createdAt: string;
}

export default function WhatsAppStylePanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Polling para actualizar lista de conversaciones y mensajes en tiempo real
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const userPhone = typeof window !== 'undefined' ? localStorage.getItem('bot_user_phone') || '' : '';
        const query = userPhone ? `?phoneNumber=${encodeURIComponent(userPhone)}` : '';
        const res = await fetch(`/api/chats${query}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setConversations(data.data);
          if (!selectedPhone && data.data.length > 0) {
            setSelectedPhone(data.data[0].senderPhone);
          }
        }
      } catch (err) {
        // Silenciar errores de red
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, [selectedPhone]);

  // Cargar mensajes del chat seleccionado
  useEffect(() => {
    if (!selectedPhone) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chats/${encodeURIComponent(selectedPhone)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setMessages(data.data);
        }
      } catch (err) {
        // Silenciar errores de red
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedPhone]);

  const handleSelectChat = (phone: string) => {
    setSelectedPhone(phone);
    if (isMobileView) {
      setMobileShowChat(true);
    }
    logger.info({ phone }, 'Seleccionando conversación de chat');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPhone || isSending) return;

    setIsSending(true);
    const messageToSend = inputText.trim();
    setInputText('');

    try {
      const res = await fetch('/api/chats/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderPhone: selectedPhone,
          message: messageToSend,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Recargar mensajes inmediatamente
        const msgRes = await fetch(`/api/chats/${encodeURIComponent(selectedPhone)}`);
        const msgData = await msgRes.json();
        if (msgData.success && Array.isArray(msgData.data)) {
          setMessages(msgData.data);
        }
        logger.info({ phone: selectedPhone }, 'Respuesta enviada con éxito');
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error al enviar respuesta al chat');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteChat = async (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de eliminar el historial de chat para ${phone}?`)) return;

    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(phone)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.senderPhone !== phone));
        if (selectedPhone === phone) {
          setSelectedPhone(null);
          setMessages([]);
        }
        logger.info({ phone }, 'Historial de chat eliminado');
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error al eliminar chat');
    }
  };

  const activeConv = conversations.find((c) => c.senderPhone === selectedPhone);

  return (
    <div style={{ padding: '8px 24px 16px 24px', textAlign: 'left', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ marginTop: '4px', marginBottom: '8px', fontSize: '1.4rem' }}>💬 Panel de Chats en Tiempo Real</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
        Visualiza los números de teléfono que le hablan al bot, sus conversaciones y responde en tiempo real.
      </p>

      <div
        style={{
          flex: 1,
          minHeight: '400px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)',
          display: 'grid',
          gridTemplateColumns: isMobileView ? '1fr' : '340px 1fr',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Panel izquierdo: Lista de Números que hablan al Bot */}
        {(!isMobileView || !mobileShowChat) && (
          <div
            style={{
              borderRight: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--color-background)',
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="chat" style={{ width: '20px', height: '20px', color: 'var(--color-primary)' }} />
                <span>Conversaciones ({conversations.length})</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  No hay chats registrados aún.<br />Los números que escriban al bot aparecerán aquí en tiempo real.
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.senderPhone}
                    onClick={() => handleSelectChat(conv.senderPhone)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: selectedPhone === conv.senderPhone ? 'var(--color-surface)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>📱 {conv.senderPhone}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          {new Date(conv.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.lastMessage}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(conv.senderPhone, e)}
                      title="Eliminar chat"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', fontSize: '1rem', padding: '4px 8px', marginLeft: '8px' }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Panel derecho: Historial de Mensajes y Respuesta en Vivo */}
        {(!isMobileView || mobileShowChat) && (
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', height: '100%', overflow: 'hidden' }}>
            {selectedPhone ? (
              <>
                {/* Cabecera del chat activo */}
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--color-background)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isMobileView && (
                      <button
                        onClick={() => setMobileShowChat(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }}
                      >
                        &larr; Volver
                      </button>
                    )}
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>💬 Chat con: {selectedPhone}</div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(selectedPhone, e)}
                    style={{ background: 'none', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Borrar Chat
                  </button>
                </div>

                {/* Historial de mensajes */}
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--color-background)' }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '40px', fontSize: '0.9rem' }}>
                      No hay mensajes en esta conversación.
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                          backgroundColor: msg.direction === 'outgoing' ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: msg.direction === 'outgoing' ? 'white' : 'var(--color-text)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          maxWidth: '75%',
                          boxShadow: 'var(--shadow-soft)',
                          fontSize: '0.9rem',
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px', opacity: 0.8 }}>
                          {msg.direction === 'outgoing' ? '🤖 Bot (Saliente)' : '👤 Usuario (Entrante)'}
                        </div>
                        <div>{msg.message}</div>
                        <div style={{ fontSize: '0.7rem', textAlign: 'right', marginTop: '4px', opacity: 0.8 }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input de respuesta en tiempo real */}
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
                    placeholder={`Escribe una respuesta para ${selectedPhone}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isSending}
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
                    disabled={isSending}
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
                      opacity: isSending ? 0.7 : 1,
                    }}
                  >
                    <Icon name="chat" style={{ width: '18px', height: '18px', color: 'white' }} />
                  </button>
                </form>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                Selecciona un número de la lista para ver el chat en tiempo real
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
