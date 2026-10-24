'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiClient';
import Icon from '@/components/Icon';

/**
 * BotUnifiedStudioPanel - Panel unificado de control y simulador de chat WhatsApp con edición in-situ.
 * Sistema de mensajes robusto, persistente, con orden jerárquico/cronológico y actualización instantánea.
 */

interface BotProfile {
  id: string;
  botId: string;
  name: string;
  phoneNumber: string;
  description?: string;
  isActive: boolean;
  isPublic?: boolean;
}

interface ChatMessage {
  id: string;
  senderPhone: string;
  botId: string;
  direction: 'incoming' | 'outgoing';
  message: string;
  contentType?: 'text' | 'menu' | 'image' | 'function' | 'image_menu';
  mediaUrl?: string;
  menuOptions?: Array<{ label: string; option: string; actionKey?: string }>;
  actionKey?: string;
  parentId?: string;
  createdAt: string;
}

export default function BotUnifiedStudioPanel() {
  const [botProfiles, setBotProfiles] = useState<BotProfile[]>([]);
  const [selectedBot, setSelectedBot] = useState<BotProfile | null>(null);
  const [isRegisteredUser, setIsRegisteredUser] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de edición in-situ
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContentType, setEditContentType] = useState<'text_plain' | 'text_menu' | 'media_interactive' | 'single_function' | 'image_menu'>('text_plain');
  const [editTextContent, setEditTextContent] = useState<string>('');
  const [editMediaUrl, setEditMediaUrl] = useState<string>('');
  const [editMenuOptions, setEditMenuOptions] = useState<Array<{ label: string; option: string; actionKey?: string }>>([]);
  const [editActionKey, setEditActionKey] = useState<string>('');
  const [availableFunctions, setAvailableFunctions] = useState<Array<{ actionKey: string; description: string }>>([]);

  useEffect(() => {
    fetchBots();
    fetchFunctions();
  }, []);

  const fetchFunctions = async () => {
    try {
      const data = await apiFetch('/bot/functions');
      const list = data.functions || data.data || (Array.isArray(data) ? data : []);
      if (Array.isArray(list)) {
        setAvailableFunctions(list);
      }
    } catch (err) {
      console.error('Error cargando funciones disponibles', err);
    }
  };

  const fetchBots = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/bot/profiles');
      const list = Array.isArray(data) ? data : (data.data || []);
      if (Array.isArray(list)) {
        setBotProfiles(list);
        if (list.length > 0 && !selectedBot) {
          setSelectedBot(list[0]);
          fetchChatHistory(list[0].botId, list[0].phoneNumber, list[0].id);
        }
      }
    } catch (err: any) {
      setError('Error al conectar con la API para cargar bots.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async (botId: string, phone: string, botProfileUuid?: string) => {
    try {
      let flowMessages: ChatMessage[] = [];
      const uuidToUse = botProfileUuid || selectedBot?.id;
      if (uuidToUse) {
        const flowsRes = await apiFetch(`/bot/flows?botProfileId=${uuidToUse}`).catch(() => ({ data: [] }));
        const flows = flowsRes.data || flowsRes || [];
        if (Array.isArray(flows)) {
          flowMessages = flows.map((f: any) => ({
            id: f.id, // ID real de BotFlow
            senderPhone: phone,
            botId: botId,
            direction: 'incoming',
            message: f.responseMessage || f.name,
            contentType: f.contentType || 'text',
            mediaUrl: f.mediaUrl,
            menuOptions: typeof f.menuOptions === 'string' ? JSON.parse(f.menuOptions) : (f.menuOptions || (f.content ? JSON.parse(f.content) : [])),
            actionKey: f.actionKey,
            parentId: f.parentId,
            createdAt: f.createdAt || new Date().toISOString(),
          }));
        }
      }

      const data = await apiFetch(`/api/chats/${encodeURIComponent(phone)}?botId=${botId}`);
      let chatMsgs: ChatMessage[] = [];
      if (data.success && Array.isArray(data.data)) {
        chatMsgs = data.data;
      }

      // Combinar flujos del bot e historial de chat ordenados cronológicamente
      const combined = [...flowMessages, ...chatMsgs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(combined);
    } catch (err) {
      console.error('Error cargando historial de chat y flujos', err);
    }
  };

  const handleCreateAnonymousBot = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/bot/profiles/anonymous', { method: 'POST' });
      if (data.success && data.profile) {
        setBotProfiles((prev) => [data.profile, ...prev]);
        setSelectedBot(data.profile);
        setIsRegisteredUser(false);
        fetchChatHistory(data.profile.botId, data.profile.phoneNumber, data.profile.id);
      }
    } catch (err) {
      setError('Error al crear bot anónimo.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnlineActivation = async () => {
    if (!selectedBot) return;

    if (!isRegisteredUser) {
      alert('⚠️ Restricción de Seguridad: Solo los usuarios con cuenta registrada pueden activar bots online en producción. Verifique su cuenta para habilitar esta función.');
      return;
    }

    try {
      const newActiveState = !selectedBot.isActive;
      await apiFetch(`/bot/profiles/${selectedBot.id}/activate`, { method: 'PUT' });
      setSelectedBot({ ...selectedBot, isActive: newActiveState });
      setBotProfiles((prev) => prev.map((b) => (b.id === selectedBot.id ? { ...b, isActive: newActiveState } : b)));
    } catch (err) {
      setError('Error al cambiar el estado de activación online.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedBot) return;

    const userMsg = inputMessage.trim();
    setInputMessage('');

    const tempUserMsg: ChatMessage = {
      id: 'temp_' + Date.now(),
      senderPhone: selectedBot.phoneNumber,
      botId: selectedBot.botId,
      direction: 'outgoing',
      message: userMsg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const data = await apiFetch('/api/chats/send', {
        method: 'POST',
        body: JSON.stringify({
          senderPhone: selectedBot.phoneNumber,
          message: userMsg,
          botId: selectedBot.botId,
        }),
      });
      if (data.success) {
        fetchChatHistory(selectedBot.botId, selectedBot.phoneNumber, selectedBot.id);
      }
    } catch (err) {
      console.error('Error enviando mensaje', err);
    }
  };

  const handleResetConversation = async () => {
    if (!selectedBot) return;
    setMessages([]);
    fetchChatHistory(selectedBot.botId, selectedBot.phoneNumber, selectedBot.id);
  };

  const startEditing = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    const type = msg.contentType || 'text';
    setEditContentType(type);
    setEditTextContent(msg.message || '');
    setEditMediaUrl(msg.mediaUrl || '');
    setEditMenuOptions(msg.menuOptions || []);
    setEditActionKey(msg.actionKey || '');
  };

  const handleContentTypeChange = (newType: 'text_plain' | 'text_menu' | 'media_interactive' | 'single_function' | 'image_menu') => {
    if (editContentType !== newType) {
      const confirmChange = window.confirm('⚠️ La configuración actual del globo (opciones de menú, imagen o función) se borrará o cambiará al nuevo tipo. ¿Desea continuar?');
      if (!confirmChange) return;
    }
    setEditContentType(newType);
    if (newType === 'text_plain') {
      setEditMediaUrl('');
      setEditMenuOptions([]);
      setEditActionKey('');
    } else if (newType === 'media_interactive') {
      setEditMenuOptions([]);
      setEditActionKey('');
    } else if (newType === 'text_menu') {
      setEditMediaUrl('');
      setEditActionKey('');
      if (editMenuOptions.length === 0) {
        setEditMenuOptions([{ label: 'Opción 1', option: '1', actionKey: availableFunctions[0]?.actionKey || 'stock.check' }]);
      }
    } else if (newType === 'single_function') {
      setEditMediaUrl('');
      setEditMenuOptions([]);
    } else if (newType === 'image_menu') {
      if (editMenuOptions.length === 0) {
        setEditMenuOptions([{ label: 'Opción 1', option: '1', actionKey: availableFunctions[0]?.actionKey || 'stock.check' }]);
      }
    }
  };

  const saveBubbleEdit = async (msgId: string) => {
    if ((editContentType === 'image' || editContentType === 'image_menu') && !editMediaUrl.trim()) {
      setError('⚠️ Error: Debe ingresar una URL de imagen válida para configurar un globo de tipo Imagen o Imagen + Menú.');
      return;
    }
    setError(null);

    // Actualización optimista inmediata en el estado local para reflejar los cambios al instante
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              message: editTextContent,
              contentType: editContentType,
              mediaUrl: editMediaUrl,
              menuOptions: editMenuOptions,
              actionKey: editActionKey,
            }
          : m
      )
    );
    setEditingMessageId(null);

    try {
      const optionsPayload = editContentType === 'menu' || editContentType === 'image_menu' ? editMenuOptions : [];
      const updateRes = await apiFetch(`/bot/flows/${msgId}`, {
        method: 'PUT',
        body: JSON.stringify({
          responseMessage: editTextContent,
          contentType: editContentType,
          mediaUrl: editMediaUrl,
          menuOptions: optionsPayload,
          content: JSON.stringify(optionsPayload),
          actionKey: editActionKey,
        }),
      }).catch(() => null);

      if (!updateRes || !updateRes.success) {
        await apiFetch('/bot/flows', {
          method: 'POST',
          body: JSON.stringify({
            botProfileId: selectedBot.id,
            name: `Flow ${editTextContent.substring(0, 15)}`,
            triggerKeyword: `trg_${Date.now()}`,
            flowType: 'conversation',
            responseMessage: editTextContent,
            contentType: editContentType,
            mediaUrl: editMediaUrl,
            menuOptions: optionsPayload,
            content: JSON.stringify(optionsPayload),
            actionKey: editActionKey,
            isActive: true,
          }),
        });
      }

      if (selectedBot) {
        fetchChatHistory(selectedBot.botId, selectedBot.phoneNumber, selectedBot.id);
      }
    } catch (err) {
      console.error('Error guardando edición in-situ en base de datos', err);
    }
  };

  const handleAddChainedMessage = async (parentId: string) => {
    if (!selectedBot) return;
    try {
      await apiFetch('/bot/flows', {
        method: 'POST',
        body: JSON.stringify({
          botProfileId: selectedBot.id,
          parentId,
          name: `Encadenado ${Date.now()}`,
          triggerKeyword: `child_${Date.now()}`,
          flowType: 'conversation',
          responseMessage: 'Nuevo mensaje encadenado secuencial...',
          isActive: true,
        }),
      });
      fetchChatHistory(selectedBot.botId, selectedBot.phoneNumber, selectedBot.id);
    } catch (err) {
      console.error('Error al encadenar mensaje', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontFamily: 'var(--font-family)', userSelect: 'none' }}>
      {/* =================================================================== */}
      {/* 1. PANEL SUPERIOR: CONTROL Y ESTADO DEL BOT                          */}
      {/* =================================================================== */}
      <header style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', boxShadow: 'var(--shadow-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: selectedBot?.isActive ? 'var(--color-success)' : 'var(--color-error)',
              }}
              title={selectedBot?.isActive ? 'Bot Activo Online' : 'Bot Inactivo'}
            />
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              {selectedBot?.isActive ? 'Online' : 'Offline'}
            </span>
          </div>

          <select
            style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', fontSize: '0.9rem', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--color-text)' }}
            value={selectedBot?.id || ''}
            onChange={(e) => {
              const found = botProfiles.find((b) => b.id === e.target.value);
              if (found) {
                setSelectedBot(found);
                fetchChatHistory(found.botId, found.phoneNumber, found.id);
              }
            }}
          >
            {botProfiles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.phoneNumber})
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateAnonymousBot}
            style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff', fontSize: '0.8rem', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 500, cursor: 'pointer' }}
          >
            + Crear Bot Anónimo
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)' }}>{selectedBot?.name || 'Ningún Bot'}</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {selectedBot?.botId}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-background)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Registrado</span>
            <input
              type="checkbox"
              checked={isRegisteredUser}
              onChange={(e) => setIsRegisteredUser(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <button
              onClick={handleToggleOnlineActivation}
              style={{
                fontSize: '0.75rem',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedBot?.isActive ? 'var(--color-error)' : 'var(--color-success)',
                color: '#ffffff',
              }}
            >
              {selectedBot?.isActive ? 'Desactivar' : 'Activar Online'}
            </button>
          </div>

          <button
            onClick={handleResetConversation}
            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontSize: '0.8rem', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Reiniciar conversación"
          >
            <Icon name="settings" style={{ width: '14px', height: '14px' }} />
            <span>Reiniciar</span>
          </button>
        </div>
      </header>

      {error && (
        <div style={{ backgroundColor: 'var(--color-error-bg)', borderBottom: '1px solid var(--color-error)', color: 'var(--color-error)', fontSize: '0.8rem', padding: '10px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. SIMULADOR DE CHAT (INTERFAZ TIPO WHATSAPP)                        */}
      {/* =================================================================== */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--color-background)' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', gap: '8px' }}>
            <Icon name="chat" style={{ width: '40px', height: '40px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem', margin: 0 }}>No hay mensajes en el historial. Envía un mensaje abajo.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isBot = msg.direction === 'incoming';
            const isEditing = editingMessageId === msg.id;

            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isBot ? 'flex-start' : 'flex-end' }}>
                <div
                  style={{
                    position: 'relative',
                    maxWidth: '500px',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 16px',
                    boxShadow: 'var(--shadow-soft)',
                    fontSize: '0.9rem',
                    backgroundColor: isBot ? 'var(--color-surface)' : 'var(--color-primary)',
                    color: isBot ? 'var(--color-text)' : '#ffffff',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {isBot && !isEditing && (
                    <button
                      onClick={() => startEditing(msg)}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}
                      title="Editar globo in-situ"
                    >
                      <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                  )}

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '280px', padding: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>Editor In-Situ</span>
                        <select
                          style={{ backgroundColor: 'var(--color-background)', fontSize: '0.75rem', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px' }}
                          value={editContentType}
                          onChange={(e) => handleContentTypeChange(e.target.value as any)}
                        >
                          <option value="text_plain">Texto Plano</option>
                          <option value="text_menu">Menú / Botones</option>
                          <option value="media_interactive">Imagen / Multimedia</option>
                          <option value="image_menu">Imagen + Menú</option>
                          <option value="single_function">Función / Webhook</option>
                        </select>
                      </div>

                      {(editContentType === 'text_plain' || editContentType === 'text_menu' || editContentType === 'image_menu') && (
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Plantilla</label>
                          <textarea
                            style={{ width: '100%', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px', fontSize: '0.8rem', color: 'var(--color-text)', boxSizing: 'border-box' }}
                            rows={3}
                            value={editTextContent}
                            onChange={(e) => setEditTextContent(e.target.value)}
                          />
                        </div>
                      )}

                      {(editContentType === 'media_interactive' || editContentType === 'image_menu') && (
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>URL de Imagen</label>
                          <input
                            type="text"
                            style={{ width: '100%', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px', fontSize: '0.8rem', color: 'var(--color-text)', boxSizing: 'border-box' }}
                            placeholder="https://..."
                            value={editMediaUrl}
                            onChange={(e) => setEditMediaUrl(e.target.value)}
                          />
                        </div>
                      )}

                      {(editContentType === 'text_menu' || editContentType === 'image_menu') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Opciones del Menú (Nombre y Función)</span>
                            <button
                              type="button"
                              onClick={() => setEditMenuOptions([...editMenuOptions, { label: 'Nueva Opción', option: String(editMenuOptions.length + 1), actionKey: availableFunctions[0]?.actionKey || 'stock.check' }])}
                              style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', padding: '2px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                            >
                              + Añadir
                            </button>
                          </div>
                          {editMenuOptions.map((opt, idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--color-background)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="text"
                                  style={{ width: '36px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px', fontSize: '0.75rem', color: 'var(--color-text)', textAlign: 'center' }}
                                  value={opt.option || String(idx + 1)}
                                  onChange={(e) => {
                                    const updated = [...editMenuOptions];
                                    updated[idx].option = e.target.value;
                                    setEditMenuOptions(updated);
                                  }}
                                  title="Número/Tecla de opción"
                                />
                                <input
                                  type="text"
                                  style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px', fontSize: '0.75rem', color: 'var(--color-text)' }}
                                  value={opt.label}
                                  placeholder="Nombre de opción"
                                  onChange={(e) => {
                                    const updated = [...editMenuOptions];
                                    updated[idx].label = e.target.value;
                                    setEditMenuOptions(updated);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditMenuOptions(editMenuOptions.filter((_, i) => i !== idx))}
                                  style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '2px' }}
                                  title="Eliminar opción"
                                >
                                  <svg style={{ width: '12px', height: '12px', fill: 'currentColor' }} viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                </button>
                              </div>
                              <select
                                style={{ width: '100%', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px', fontSize: '0.7rem', color: 'var(--color-text)' }}
                                value={opt.actionKey || ''}
                                onChange={(e) => {
                                  const updated = [...editMenuOptions];
                                  updated[idx].actionKey = e.target.value;
                                  setEditMenuOptions(updated);
                                }}
                              >
                                <option value="">-- Seleccionar Función ({availableFunctions.length} disponibles) --</option>
                                {availableFunctions.map((fn) => (
                                  <option key={fn.actionKey} value={fn.actionKey}>
                                    {fn.actionKey} - {fn.description}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}

                      {editContentType === 'single_function' && (
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Acción / Función</label>
                          <input
                            type="text"
                            style={{ width: '100%', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px', fontSize: '0.8rem', color: 'var(--color-text)', boxSizing: 'border-box' }}
                            placeholder="stock.check"
                            value={editActionKey}
                            onChange={(e) => setEditActionKey(e.target.value)}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveBubbleEdit(msg.id)}
                          style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 500, cursor: 'pointer' }}
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '20px' }}>
                      {msg.mediaUrl && (
                        <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', maxHeight: '180px' }}>
                          <img src={msg.mediaUrl} alt="Media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.message}</p>

                      {msg.menuOptions && msg.menuOptions.length > 0 && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {msg.menuOptions.map((opt, i) => (
                            <div key={i} style={{ fontSize: '0.8rem', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', color: 'var(--color-primary)', fontWeight: 500 }}>
                              {opt.option}. {opt.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <span style={{ display: 'block', fontSize: '0.65rem', marginTop: '4px', textAlign: 'right', color: isBot ? 'var(--color-text-muted)' : 'rgba(255,255,255,0.8)' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isBot && (
                  <button
                    onClick={() => handleAddChainedMessage(msg.id)}
                    style={{ marginTop: '4px', marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: '20px', cursor: 'pointer' }}
                    title="Añadir mensaje encadenado secuencial"
                  >
                    <Icon name="plus" style={{ width: '12px', height: '12px' }} />
                    <span>Agregar paso</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* =================================================================== */}
      {/* 3. BARRA DE ENTRADA / INPUT DE MENSAJE DEL USUARIO                   */}
      {/* =================================================================== */}
      <footer style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '16px' }}>
        <form onSubmit={handleSendMessage} style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            style={{ flex: 1, backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', fontSize: '0.9rem', color: 'var(--color-text)' }}
            placeholder={selectedBot ? `Escribe un mensaje a ${selectedBot.name} (ej. 'menu', '1')...` : 'Selecciona o crea un bot primero...'}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={!selectedBot}
          />
          <button
            type="submit"
            disabled={!selectedBot || !inputMessage.trim()}
            style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: 'var(--radius-lg)', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chat" style={{ width: '18px', height: '18px', color: '#ffffff' }} />
          </button>
        </form>
      </footer>
    </div>
  );
}
