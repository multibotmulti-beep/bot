'use client';

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';
import Icon from '@/components/Icon';
import { BotApiClient, ChatApiClient } from '@/lib/apiClient';

interface BotProfile {
  id: string;
  botId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isPublic: boolean;
}

interface Conversation {
  senderPhone: string;
  lastMessage: string;
  lastAt: string;
  totalMessages: number;
  botId: string;
}

interface ChatMessage {
  id: string;
  senderPhone: string;
  botId: string;
  direction: 'incoming' | 'outgoing';
  message: string;
  createdAt: string;
}

export default function WhatsAppStylePanel() {
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [activeBot, setActiveBot] = useState<BotProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar perfiles de bots de la cuenta
  const loadBotsAndChats = async () => {
    try {
      setLoading(true);
      const profiles = await BotApiClient.getProfiles();
      setBots(profiles);

      // Determinar bot activo (el que tenga isActive === true, o el primero)
      const currentActive = profiles.find((b: BotProfile) => b.isActive) || profiles[0] || null;
      setActiveBot(currentActive);

      if (currentActive) {
        const convs = await ChatApiClient.getConversations(currentActive.botId);
        setConversations(convs);
        if (convs.length > 0 && !selectedPhone) {
          setSelectedPhone(convs[0].senderPhone);
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error al cargar bots y chats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBotsAndChats();
  }, []);

  // Cuando cambia el bot activo, recargar conversaciones
  useEffect(() => {
    if (activeBot) {
      ChatApiClient.getConversations(activeBot.botId).then((convs) => {
        setConversations(convs);
        if (convs.length > 0) {
          setSelectedPhone(convs[0].senderPhone);
        } else {
          setSelectedPhone(null);
          setMessages([]);
        }
      });
    }
  }, [activeBot]);

  // Cuando cambia el teléfono seleccionado, cargar mensajes de la conversación
  useEffect(() => {
    if (selectedPhone) {
      ChatApiClient.getMessages(selectedPhone).then((msgs) => {
        setMessages(msgs);
      });
    }
  }, [selectedPhone]);

  // Activar un bot (solo uno activo online/público por cuenta)
  const handleActivateBot = async (botId: string) => {
    try {
      await BotApiClient.activateProfile(botId);
      logger.info({ botId }, 'Bot activado exitosamente desde el panel');
      await loadBotsAndChats();
    } catch (err: any) {
      alert(`Error al activar el bot: ${err.message}`);
    }
  };

  const handleSelectConversation = (phone: string) => {
    setSelectedPhone(phone);
    if (isMobileView) {
      setMobileShowChat(true);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPhone || !activeBot) return;

    const textToSend = inputText;
    setInputText('');

    try {
      await ChatApiClient.sendMessage(selectedPhone, textToSend, activeBot.botId);
      // Recargar mensajes
      const msgs = await ChatApiClient.getMessages(selectedPhone);
      setMessages(msgs);
      const convs = await ChatApiClient.getConversations(activeBot.botId);
      setConversations(convs);
    } catch (err: any) {
      alert(`Error al enviar mensaje: ${err.message}`);
    }
  };

  const activeConv = conversations.find((c) => c.senderPhone === selectedPhone);

  return (
    <div style={{ padding: '8px 24px 16px 24px', textAlign: 'left', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h1 style={{ marginTop: '4px', marginBottom: '0px', fontSize: '1.4rem' }}>Panel de Chats & Activador de Bots</h1>
        {activeBot && (
          <div style={{ fontSize: '0.9rem', backgroundColor: 'var(--color-primary)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontWeight: 600 }}>
            Bot Activo: {activeBot.name} (ID: {activeBot.botId})
          </div>
        )}
      </div>

      {/* Contenedor principal */}
      <div
        style={{
          flex: 1,
          minHeight: '400px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)',
          display: 'grid',
          gridTemplateColumns: isMobileView ? '1fr' : '350px 1fr',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Panel izquierdo: Lista de Bots de la Cuenta & Conversaciones */}
        {(!isMobileView || !mobileShowChat) && (
          <div
            style={{
              borderRight: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--color-background)',
              overflowY: 'auto',
            }}
          >
            {/* Sección de Activación de Bots */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="chat" style={{ width: '18px', height: '18px', color: 'var(--color-primary)' }} />
                <span>Tus Bots (Selecciona el Activo)</span>
              </div>
              {loading ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Cargando tus bots...</div>
              ):(bots.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No tienes bots creados aún. Ve a "Crear Bot" para registrar uno.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bots.map((bot) => (
                    <div
                      key={bot.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: bot.isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        backgroundColor: bot.isActive ? 'var(--color-surface)' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{bot.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {bot.isActive ? '🟢 Activo Online' : '⚪ Inactivo'}
                        </div>
                      </div>
                      {!bot.isActive && (
                        <button
                          onClick={() => handleActivateBot(bot.id)}
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Activar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Sección de Conversaciones del Bot Activo */}
            <div style={{ padding: '16px 16px 8px 16px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Chats del Bot Activo ({conversations.length})
            </div>
            <div style={{ flex: 1 }}>
              {conversations.length === 0 ? (
                <div style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  No hay chats activos para este bot todavía. Los chats aparecerán cuando los clientes interactúen por WhatsApp.
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.senderPhone}
                    onClick={() => handleSelectConversation(conv.senderPhone)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: selectedPhone === conv.senderPhone ? 'var(--color-surface)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📱 {conv.senderPhone}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {new Date(conv.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.lastMessage}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Panel derecho: Mensajes de la Conversación Seleccionada */}
        {(!isMobileView || mobileShowChat) && (
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', height: '100%', overflow: 'hidden' }}>
            {selectedPhone ? (
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
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>Chat con Cliente: {selectedPhone}</div>
                </div>

                {/* Historial de mensajes */}
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--color-background)' }}>
                  {messages.map((msg) => {
                    const isOutgoing = msg.direction === 'outgoing';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
                          backgroundColor: isOutgoing ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: isOutgoing ? 'white' : 'var(--color-text)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          maxWidth: '75%',
                          boxShadow: 'var(--shadow-soft)',
                          fontSize: '0.9rem',
                        }}
                      >
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                        <div style={{ fontSize: '0.7rem', textAlign: 'right', marginTop: '4px', opacity: 0.8 }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
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
                    placeholder="Escribe un mensaje de respuesta para este cliente..."
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
                Selecciona una conversación para ver los mensajes
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
