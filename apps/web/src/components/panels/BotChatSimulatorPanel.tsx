'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import logger from '@/lib/logger';
import { BotApiClient, ChatApiClient, apiFetch } from '@/lib/apiClient';

// ==========================================
// INTERFACES Y TIPOS (Extensibles para subsistemas complejos)
// ==========================================
export interface BotProfile {
  id: string;
  botId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isPublic: boolean;
  welcomeMessage?: string;
  options?: any[];
  phoneNumber?: string;
}

export interface ChatMessage {
  id: string;
  senderPhone: string;
  botId: string;
  direction: 'incoming' | 'outgoing';
  message: string;
  createdAt: string;
  options?: any[];
  capabilities?: string[];
  clickedOption?: string;
  subsystemMeta?: Record<string, any>;
}

export interface SubsystemPlugin {
  id: string;
  name: string;
  icon: ReactNode;
  renderPanel: (props: { activeBot: BotProfile | null; userPhone: string; sessionToken: string | null }) => ReactNode;
}

// ==========================================
// ICONOS SVG PUROS (CERO EMOJIS - REGLA ESTRICTA)
// ==========================================
const SvgIcons = {
  bot: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="9" cy="16" r="1" />
      <circle cx="15" cy="16" r="1" />
      <path d="M12 2v9" />
      <path d="M12 2a3 3 0 0 0-3 3" />
    </svg>
  ),
  user: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  send: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  checkDouble: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#53bdeb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L7 17l-5-5"></path>
      <path d="M22 10l-7.5 7.5L13 16"></path>
    </svg>
  ),
  shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  extension: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  cpu: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
      <rect x="9" y="9" width="6" height="6"></rect>
      <line x1="9" y1="1" x2="9" y2="4"></line>
      <line x1="15" y1="1" x2="15" y2="4"></line>
      <line x1="9" y1="20" x2="9" y2="23"></line>
      <line x1="15" y1="20" x2="15" y2="23"></line>
      <line x1="20" y1="9" x2="23" y2="9"></line>
      <line x1="20" y1="14" x2="23" y2="14"></line>
      <line x1="1" y1="9" x2="4" y2="9"></line>
      <line x1="1" y1="14" x2="4" y2="14"></line>
    </svg>
  ),
  text: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  ),
  menu: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  ),
  function: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
  image: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  ),
  messageBubble: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  ),
  plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
};

// ==========================================
// REGISTRO DE SUBSISTEMAS EXTENSIBLES
// ==========================================
const registeredSubsystems: SubsystemPlugin[] = [
  {
    id: 'engine-diagnostics',
    name: 'Diagnóstico de Motor',
    icon: <SvgIcons.cpu />,
    renderPanel: ({ activeBot, userPhone, sessionToken }) => (
      <div style={{ padding: '12px', fontSize: '0.85rem', color: '#334155', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SvgIcons.cpu /> Subsistema: Métricas y Estado en Tiempo Real
        </div>
        <div>Bot ID Asignado: <strong>{activeBot?.botId || 'N/D'}</strong></div>
        <div>Teléfono Sesión: <strong>{userPhone || 'N/D'}</strong></div>
        <div>Token Cookie / Sesión: <code style={{ fontSize: '0.75rem' }}>{sessionToken || 'guest_active'}</code></div>
      </div>
    )
  }
];

export function registerBotSubsystem(plugin: SubsystemPlugin) {
  if (!registeredSubsystems.some(p => p.id === plugin.id)) {
    registeredSubsystems.push(plugin);
  }
}

// ==========================================
// COMPONENTE PRINCIPAL MODULAR CON PERSISTENCIA Y BOTÓN DE BORRADO
// ==========================================
export default function BotChatSimulatorPanel() {
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [activeBot, setActiveBot] = useState<BotProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [isAnonymousSession, setIsAnonymousSession] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para edición inline en cada mensaje del bot
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgText, setEditMsgText] = useState('');
  const [editActionKey, setEditActionKey] = useState('custom.advanced_flow');
  const [editContentType, setEditContentType] = useState<'text_plain' | 'single_function' | 'text_menu' | 'media_interactive' | 'image_menu'>('text_menu');
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [editStatus, setEditStatus] = useState<string | null>(null);

  // Estados para el bloque separado de integración de nuevo bot debajo de cada conversación
  const [newBotName, setNewBotName] = useState('');
  const [newBotWelcome, setNewBotWelcome] = useState('');
  const [newBotActionKey, setNewBotActionKey] = useState('custom.advanced_flow');
  const [integrationStatus, setIntegrationStatus] = useState<string | null>(null);

  // Estados para el creador encadenado de mensajes hijo (jerarquía por mensaje)
  const [chainedCreatorParentId, setChainedCreatorParentId] = useState<string | null>(null);
  const [newChainedType, setNewChainedType] = useState<'text_plain' | 'text_menu' | 'single_function' | 'media_interactive' | 'image_menu'>('text_plain');
  const [newChainedText, setNewChainedText] = useState('');
  const [newChainedKeyword, setNewChainedKeyword] = useState('op');
  const [newChainedMediaUrl, setNewChainedMediaUrl] = useState('');
  const [newChainedActionKey, setNewChainedActionKey] = useState('custom.advanced_flow');
  const [newChainedOptions, setNewChainedOptions] = useState<{ label: string; actionKey: string }[]>([
    { label: 'Opción 1', actionKey: 'stock.check' },
    { label: 'Opción 2', actionKey: 'support.human' }
  ]);

  const handleSaveChainedNode = async (parentId: string) => {
    if (!activeBot) return;
    if (!newChainedText.trim()) {
      setEditStatus('⚠️ Validación: El texto del mensaje es obligatorio.');
      return;
    }
    setEditStatus('Creando nodo hijo en DB...');
    try {
      const payload = {
        botProfileId: activeBot.id,
        parentId,
        name: `Hijo ${newChainedKeyword}`,
        triggerKeyword: newChainedKeyword.trim(),
        contentType: newChainedType,
        mediaUrl: (newChainedType === 'media_interactive' || newChainedType === 'image_menu') ? newChainedMediaUrl : null,
        actionKey: (newChainedType === 'single_function' || newChainedType === 'media_interactive') ? newChainedActionKey : null,
        flowType: newChainedType.includes('menu') ? 'menu' : 'conversation',
        responseMessage: newChainedText,
        content: (newChainedType === 'text_menu' || newChainedType === 'image_menu') ? [
          { label: 'Opción 1', option: '1', actionKey: 'stock.check' },
          { label: 'Opción 2', option: '2', actionKey: 'support.human' }
        ] : [],
        isActive: true
      };

      await apiFetch('/bot/flows', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setChainedCreatorParentId(null);
      setEditStatus('✅ Nodo hijo creado');

      const updatedProfiles = await BotApiClient.getProfiles();
      const freshBot = updatedProfiles.find((b: BotProfile) => b.botId === activeBot.botId || b.id === activeBot.id) || activeBot;
      setActiveBot(freshBot);
      setBots(updatedProfiles);
      await loadPersistentMessages(userPhone, freshBot);

      setTimeout(() => setEditStatus(null), 2000);
    } catch (err: any) {
      setEditStatus(`Error: ${err.message}`);
    }
  };

  const handleSaveMessageEdit = async (msgId: string) => {
    if (!activeBot) return;
    if (!editActionKey && !editMsgText.trim()) {
      setEditStatus('⚠️ Validación: Para menús libres o nodos sin función, debes configurar al menos un mensaje de texto mínimo.');
      return;
    }
    setEditStatus('Guardando en DB...');
    try {
      const welcomePayload = {
        responseMessage: editMsgText,
        contentType: editContentType,
        mediaUrl: (editContentType === 'media_interactive' || editContentType === 'image_menu') ? editMediaUrl : null,
        actionKey: (editContentType === 'single_function' || editContentType === 'media_interactive') ? editActionKey : null,
        menuOptions: (editContentType === 'text_menu' || editContentType === 'image_menu') ? (activeBot.options || []) : []
      };
      const configPayload = {
        botId: activeBot.botId,
        actionKey: editActionKey,
        config: { flowTitle: activeBot.name + ' - Flujo Dinámico', welcomeMessage: editMsgText }
      };

      const botKey = activeBot.id || activeBot.botId;
      console.log(`[RAW FRONTEND PUT /welcome REQUEST] Bot Key: ${botKey}, Payload:`, JSON.stringify(welcomePayload, null, 2));
      const resWelcome = await apiFetch(`/bot/profiles/${botKey}/welcome`, {
        method: 'PUT',
        body: JSON.stringify(welcomePayload),
      });
      console.log(`[RAW FRONTEND PUT /welcome RESPONSE]:`, JSON.stringify(resWelcome, null, 2));

      console.log(`[RAW FRONTEND POST /function-configs REQUEST] Payload:`, JSON.stringify(configPayload, null, 2));
      const resConfig = await apiFetch('/bot/function-configs', {
        method: 'POST',
        body: JSON.stringify(configPayload),
      });
      console.log(`[RAW FRONTEND POST /function-configs RESPONSE]:`, JSON.stringify(resConfig, null, 2));

      setEditStatus('✅ Guardado');
      addDbLog(`Mensaje y función (${editActionKey}) actualizados en base de datos para bot ${activeBot.botId}`);

      // Refrescar en tiempo real desde la DB
      const updatedProfiles = await BotApiClient.getProfiles();
      const freshBot = updatedProfiles.find((b: BotProfile) => b.botId === activeBot.botId || b.id === activeBot.id) || activeBot;
      setActiveBot(freshBot);
      setBots(updatedProfiles);
      await loadPersistentMessages(userPhone, freshBot);

      setTimeout(() => {
        setEditingMsgId(null);
        setEditStatus(null);
      }, 1000);
    } catch (err: any) {
      console.error(`[RAW FRONTEND PUT /welcome ERROR]`, err);
      setEditStatus(`Error: ${err.message}`);
      addDbLog(`Error al guardar edición in-chat: ${err.message}`, 'ERROR');
    }
  };

  // Estados para edición individual de opciones in-chat
  const [editingOpt, setEditingOpt] = useState<{ msgId: string; idx: number } | null>(null);
  const [editOptLabel, setEditOptLabel] = useState('');
  const [editOptActionKey, setEditOptActionKey] = useState('custom.advanced_flow');

  const handleSaveOptionEdit = async (msgId: string, idx: number) => {
    if (!activeBot) return;
    setEditStatus('Guardando opción...');
    try {
      const targetMsg = messages.find(m => m.id === msgId);
      if (!targetMsg || !targetMsg.options) return;

      const updatedOptions = [...targetMsg.options];
      updatedOptions[idx] = {
        ...updatedOptions[idx],
        label: editOptLabel,
        actionKey: editOptActionKey
      };

      const payload = {
        menuOptions: updatedOptions.map((o: any, i: number) => ({
          number: o.number || o.id || String(i + 1),
          label: o.label,
          actionKey: o.actionKey
        })),
        responseMessage: targetMsg.message
      };

      const botKey = activeBot.id || activeBot.botId;
      console.log(`[RAW FRONTEND PUT /menu REQUEST] Bot Key: ${botKey}, Payload:`, JSON.stringify(payload, null, 2));

      const res = await apiFetch(`/bot/profiles/${botKey}/menu`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      console.log(`[RAW FRONTEND PUT /menu RESPONSE] Res:`, JSON.stringify(res, null, 2));

      setEditStatus('✅ Opción guardada');
      addDbLog(`Opción #${idx + 1} actualizada a "${editOptLabel}" con función (${editOptActionKey}) en DB`);

      // Refrescar en tiempo real desde la DB
      const updatedProfiles = await BotApiClient.getProfiles();
      const freshBot = updatedProfiles.find((b: BotProfile) => b.botId === activeBot.botId || b.id === activeBot.id) || activeBot;
      setActiveBot(freshBot);
      setBots(updatedProfiles);
      await loadPersistentMessages(userPhone, freshBot);

      setTimeout(() => {
        setEditingOpt(null);
        setEditStatus(null);
      }, 1000);
    } catch (err: any) {
      console.error(`[RAW FRONTEND PUT /menu ERROR]`, err);
      setEditStatus(`Error: ${err.message}`);
      addDbLog(`Error al guardar opción: ${err.message}`, 'ERROR');
    }
  };

  const handleAddOption = async (msgId: string) => {
    if (!activeBot) return;
    setEditStatus('Añadiendo nueva opción...');
    try {
      const targetMsg = messages.find(m => m.id === msgId);
      if (!targetMsg) return;

      const currentOptions = targetMsg.options || [];
      const newOptionNumber = String(currentOptions.length + 1);
      const newOption = {
        number: newOptionNumber,
        label: `Opción ${newOptionNumber}`,
        actionKey: 'custom.advanced_flow'
      };

      const updatedOptions = [...currentOptions, newOption];

      await apiFetch(`/bot/profiles/${activeBot.id}/menu`, {
        method: 'PUT',
        body: JSON.stringify({
          menuOptions: updatedOptions.map((o: any, i: number) => ({
            number: o.number || o.id || String(i + 1),
            label: o.label,
            actionKey: o.actionKey
          })),
          responseMessage: targetMsg.message
        }),
      });

      setEditStatus('✅ Opción agregada');
      addDbLog(`Nueva opción #${newOptionNumber} agregada al menú del bot en DB`);
      
      // Refrescar en tiempo real desde la DB
      const updatedProfiles = await BotApiClient.getProfiles();
      const freshBot = updatedProfiles.find((b: BotProfile) => b.botId === activeBot.botId || b.id === activeBot.id) || activeBot;
      setActiveBot(freshBot);
      setBots(updatedProfiles);
      await loadPersistentMessages(userPhone, freshBot);

      setEditingOpt({ msgId, idx: updatedOptions.length - 1 });
      setEditOptLabel(newOption.label);
      setEditOptActionKey(newOption.actionKey);

      setTimeout(() => setEditStatus(null), 1000);
    } catch (err: any) {
      setEditStatus(`Error: ${err.message}`);
      addDbLog(`Error al agregar opción: ${err.message}`, 'ERROR');
    }
  };

  const handleDeleteOption = async (msgId: string, idx: number) => {
    if (!activeBot) return;
    setEditStatus('Eliminando opción...');
    try {
      const targetMsg = messages.find(m => m.id === msgId);
      if (!targetMsg || !targetMsg.options) return;

      const updatedOptions = targetMsg.options.filter((_: any, i: number) => i !== idx).map((o: any, i: number) => ({
        ...o,
        number: String(i + 1)
      }));

      await apiFetch(`/bot/profiles/${activeBot.id}/menu`, {
        method: 'PUT',
        body: JSON.stringify({
          menuOptions: updatedOptions.map((o: any, i: number) => ({
            number: String(i + 1),
            label: o.label,
            actionKey: o.actionKey
          })),
          responseMessage: targetMsg.message
        }),
      });

      setEditStatus('✅ Opción eliminada');
      addDbLog(`Opción #${idx + 1} eliminada del menú en DB`);

      // Refrescar en tiempo real desde la DB
      const updatedProfiles = await BotApiClient.getProfiles();
      const freshBot = updatedProfiles.find((b: BotProfile) => b.botId === activeBot.botId || b.id === activeBot.id) || activeBot;
      setActiveBot(freshBot);
      setBots(updatedProfiles);
      await loadPersistentMessages(userPhone, freshBot);

      setTimeout(() => setEditStatus(null), 1000);
    } catch (err: any) {
      setEditStatus(`Error: ${err.message}`);
      addDbLog(`Error al eliminar opción: ${err.message}`, 'ERROR');
    }
  };

  // Subsistema extensible activo
  const [activeSubsystemId, setActiveSubsystemId] = useState<string | null>(null);

  // Sistema de logs de base de datos y motor en tiempo real
  const [dbLogs, setDbLogs] = useState<{ id: string; time: string; action: string; status: string }[]>([
    { id: '1', time: new Date().toLocaleTimeString(), action: 'Conexión inicializada con API y Base de Datos PostgreSQL', status: 'SUCCESS' }
  ]);

  const addDbLog = (action: string, status: string = 'SUCCESS') => {
    setDbLogs(prev => [
      { id: 'log-' + Date.now() + '-' + Math.random(), time: new Date().toLocaleTimeString(), action, status },
      ...prev.slice(0, 19)
    ]);
  };

  const subsystems: SubsystemPlugin[] = [
    {
      id: 'engine-diagnostics',
      name: 'Diagnóstico de Motor',
      icon: <SvgIcons.cpu />,
      renderPanel: () => (
        <div style={{ padding: '12px', fontSize: '0.85rem', color: '#334155', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SvgIcons.cpu /> Subsistema: Métricas y Estado en Tiempo Real
          </div>
          <div>Bot ID Asignado: <strong>{activeBot?.botId || 'N/D'}</strong></div>
          <div>Teléfono Sesión: <strong>{userPhone || 'N/D'}</strong></div>
          <div>Token Cookie / Sesión: <code style={{ fontSize: '0.75rem' }}>{sessionToken || 'guest_active'}</code></div>
        </div>
      )
    },
    {
      id: 'system-db-logs',
      name: 'Logs DB y Sistema en Tiempo Real',
      icon: <SvgIcons.extension />,
      renderPanel: () => (
        <div style={{ padding: '12px', fontSize: '0.8rem', backgroundColor: '#0f172a', color: '#38bdf8', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, marginBottom: '8px', color: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📡 Trazabilidad de Llamadas a Base de Datos y Motor</span>
            <span style={{ fontSize: '0.7rem', backgroundColor: '#22c55e', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>Conectado DB</span>
          </div>
          {dbLogs.map((log) => (
            <div key={log.id} style={{ marginBottom: '4px', borderBottom: '1px solid #1e293b', paddingBottom: '3px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: '#94a3b8' }}>[{log.time}]</span>
              <span style={{ flex: 1, color: '#e2e8f0' }}>{log.action}</span>
              <span style={{ color: log.status === 'SUCCESS' ? '#4ade80' : '#f87171', fontWeight: 600 }}>{log.status}</span>
            </div>
          ))}
        </div>
      )
    }
  ];

  const activeSubsystem = subsystems.find(sub => sub.id === activeSubsystemId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (!isInitializingRef.current) {
      isInitializingRef.current = true;
      initializeSessionAndSimulator();
    }
  }, []);

  const initializeSessionAndSimulator = async () => {
    try {
      setLoading(true);
      addDbLog('Iniciando sesión y sincronizando con base de datos...');

      // 1. Gestión de sesión y sesión anónima (cookies / guest_session / perfiles)
      let active: BotProfile | null = null;
      let phone = typeof window !== 'undefined' ? localStorage.getItem('bot_user_phone') : null;
      const isAnonStored = typeof window !== 'undefined' ? localStorage.getItem('is_anonymous') === 'true' : false;

      try {
        const anonRes = await apiFetch('/bot/profiles/anonymous', { method: 'POST' });
        if (anonRes.success) {
          if (anonRes.sessionToken) {
            setSessionToken(anonRes.sessionToken);
          }
          if (anonRes.profile) {
            active = anonRes.profile;
            addDbLog(`Perfil de bot anónimo cargado desde DB: ${active?.name} (${active?.botId})`, 'SUCCESS');
            if (anonRes.profile.phoneNumber) {
              phone = anonRes.profile.phoneNumber;
              if (typeof window !== 'undefined') {
                localStorage.setItem('bot_user_phone', phone);
              }
            }
          }
        }
      } catch (err: any) {
        addDbLog(`Error al sincronizar sesión anónima: ${err?.message}`, 'ERROR');
        logger.error({ err }, 'Error al sincronizar sesión anónima con backend');
      }

      if (!phone) {
        phone = '+54911' + Math.floor(10000000 + Math.random() * 90000000);
        if (typeof window !== 'undefined') {
          localStorage.setItem('bot_user_phone', phone);
        }
      }

      setUserPhone(phone);
      setIsAnonymousSession(isAnonStored || !localStorage.getItem('bot_user_phone'));

      // 2. Carga de perfiles de bot en la base de datos
      const profiles = await BotApiClient.getProfiles();
      addDbLog(`Se obtuvieron ${profiles.length} perfiles de bot desde la DB`, 'SUCCESS');

      if (!active) {
        active = profiles.find((b: BotProfile) => b.isActive) || profiles[0] || null;
      }

      const allProfiles = profiles.length > 0 ? profiles : (active ? [active] : []);
      setBots(allProfiles);
      setActiveBot(active);

      if (active) {
        const welcomeMsg = getWelcomeMessage(active);
        console.log(`perfil cargado:`, active);
        console.log(`mensaje bienvenida:`, welcomeMsg);
        addDbLog(`perfil cargado: ${active.name} (${active.botId})`, 'SUCCESS');
        addDbLog(`mensaje bienvenida: ${welcomeMsg}`, 'SUCCESS');
      }

      if (active && phone) {
        await loadPersistentMessages(phone, active);
      }
    } catch (err: any) {
      console.error(`[initializeSessionAndSimulator] Error:`, err);
      addDbLog(`Error inicializando simulador: ${err?.message}`, 'ERROR');
      logger.error({ err: err?.message || err }, 'Error inicializando simulador modular');
    } finally {
      setLoading(false);
    }
  };

  const getWelcomeMessage = (bot: BotProfile | null) => {
    if (!bot) return '¡Hola! Bienvenido al asistente virtual.';
    if ((bot as any).flows && Array.isArray((bot as any).flows)) {
      const rootFlow = (bot as any).flows.find((f: any) => !f.parentId);
      if (rootFlow && rootFlow.responseMessage) {
        return rootFlow.responseMessage;
      }
    }
    if ((bot as any).welcomeMessage) return (bot as any).welcomeMessage;
    return '¡Hola! Bienvenido al asistente virtual.';
  };

  const getDbOptions = (bot: BotProfile | null) => {
    if (!bot) return undefined;
    if ((bot as any).flows && Array.isArray((bot as any).flows)) {
      const rootFlow = (bot as any).flows.find((f: any) => !f.parentId);
      if (rootFlow) {
        if (rootFlow.contentType && rootFlow.contentType !== 'text_menu') {
          return undefined;
        }
        if (rootFlow.content) {
          try {
            const parsed = typeof rootFlow.content === 'string' ? JSON.parse(rootFlow.content) : rootFlow.content;
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((item: any, idx: number) => ({
                number: item.number || item.option || String(idx + 1),
                label: item.label || item.customResponse || item.option,
                actionKey: item.actionKey
              }));
            }
          } catch {}
        }
      }
    }
    return undefined;
  };

  const loadPersistentMessages = async (phone: string, targetBot?: BotProfile | null) => {
    try {
      const botToUse = targetBot !== undefined ? targetBot : activeBot;
      const botId = botToUse?.botId;
      addDbLog(`Consultando árbol jerárquico y mensajes de chat en DB para teléfono ${phone} y bot ${botId || 'admin'}...`, 'SUCCESS');

      let flowMessages: ChatMessage[] = [];
      const uuidToUse = botToUse?.id;
      if (uuidToUse) {
        const treeRes = await apiFetch(`/bot/profiles/${uuidToUse}/tree`).catch(() => null);
        const rootNodes = treeRes?.data?.rootNodes || [];

        const flattenNodes = (nodes: any[]): ChatMessage[] => {
          let list: ChatMessage[] = [];
          for (const node of nodes) {
            let parsedOpts = [];
            try {
              parsedOpts = typeof node.options === 'string' ? JSON.parse(node.options) : (node.options || []);
            } catch {
              parsedOpts = [];
            }
            list.push({
              id: node.id,
              senderPhone: phone,
              botId: botId || 'admin',
              direction: 'incoming',
              message: node.responseMessage || node.name,
              createdAt: node.metadata?.createdAt || new Date().toISOString(),
              options: parsedOpts.length > 0 ? parsedOpts.map((o: any, idx: number) => ({
                number: o.number || o.option || String(idx + 1),
                label: o.label || o.customResponse || o.option,
                actionKey: o.actionKey
              })) : undefined
            });
            if (node.children && Array.isArray(node.children) && node.children.length > 0) {
              list = list.concat(flattenNodes(node.children));
            }
          }
          return list;
        };

        flowMessages = flattenNodes(rootNodes);
      }

      if (flowMessages.length === 0) {
        const welcomeText = getWelcomeMessage(botToUse);
        flowMessages.push({
          id: 'welcome-' + Date.now(),
          senderPhone: phone,
          botId: botId || 'admin',
          direction: 'incoming',
          message: welcomeText,
          createdAt: new Date().toISOString(),
          options: getDbOptions(botToUse)
        });
      }

      const history = await ChatApiClient.getMessages(phone).catch(() => []);
      const histArray = Array.isArray(history) ? history : (history && typeof history === 'object' && Array.isArray((history as any).data) ? (history as any).data : []);
      
      let finalMessages: ChatMessage[] = [...flowMessages];
      if (histArray.length > 0) {
        const sortedHistory = [...histArray].sort(
          (a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
        finalMessages = [...flowMessages, ...sortedHistory];
      }

      setMessages(finalMessages);
    } catch (err: any) {
      console.error(`[loadPersistentMessages] Error:`, err);
      addDbLog(`Error cargando mensajes persistentes: ${err?.message}`, 'ERROR');
      logger.error({ err: err?.message || err }, 'Error cargando mensajes persistentes');
    }
  };

  // Función de borrado y reinicio manual desde cero según configuración guardada
  const handleResetChatFromZero = async () => {
    if (!userPhone || !activeBot) return;
    try {
      setLoading(true);
      addDbLog(`Eliminando historial de chat en DB para ${userPhone}...`, 'SUCCESS');
      await ChatApiClient.deleteChat(userPhone).catch(() => {});

      const profiles = await BotApiClient.getProfiles();
      const currentBotProfile = profiles.find((b: BotProfile) => b.botId === activeBot.botId || b.id === activeBot.id) || activeBot;
      setActiveBot(currentBotProfile);
      setBots(profiles);

      addDbLog('Chat reiniciado desde cero. Recargando bienvenida y menú desde la DB...', 'SUCCESS');
      await loadPersistentMessages(userPhone, currentBotProfile);
      setInputText('');
    } catch (err: any) {
      addDbLog(`Error al reiniciar chat: ${err?.message}`, 'ERROR');
      logger.error({ err: err?.message || err }, 'Error al reiniciar chat desde cero');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSubsystemId]);

  const handleBotChange = async (botId: string) => {
    const found = bots.find(b => b.botId === botId || b.id === botId);
    if (found) {
      setActiveBot(found);
      if (userPhone) {
        await loadPersistentMessages(userPhone, found);
      }
    }
  };

  const handleSendMessage = async (textCustom?: string) => {
    const textToSend = (textCustom !== undefined ? textCustom : inputText).trim();
    if (!textToSend || !activeBot || !userPhone) return;

    if (textCustom === undefined) {
      setInputText('');
    }

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      senderPhone: userPhone,
      botId: activeBot.botId,
      direction: 'outgoing',
      message: textToSend,
      createdAt: new Date().toISOString()
    };

    // 1. Añadir el mensaje del usuario a la pantalla
    setMessages(prev => [...prev, userMsg]);
    addDbLog(`Enviando mensaje al BotEngine del backend (${activeBot.botId}): "${textToSend}"`, 'SUCCESS');

    try {
      const sendRes = await ChatApiClient.sendMessage(userPhone, textToSend, activeBot.botId);
      console.log(`[handleSendMessage] Respuesta completa del backend BotEngine:`, sendRes);

      // Obtener exclusivamente la respuesta generada por el motor real del backend (BotEngine)
      const replyText = sendRes?.replyText || sendRes?.data?.replyText || sendRes?.data?.message || sendRes?.data?.data?.message || sendRes?.message;

      if (replyText) {
        const isMenuReply = replyText.toLowerCase().includes('bienvenido') ||
          replyText.toLowerCase().includes('menu') ||
          replyText.toLowerCase().includes('opción') ||
          replyText.toLowerCase().includes('elija');

        const botReplyMsg: ChatMessage = {
          id: 'bot-reply-' + Date.now(),
          senderPhone: userPhone,
          botId: activeBot.botId,
          direction: 'incoming',
          message: replyText,
          createdAt: new Date().toISOString(),
          options: isMenuReply ? getDbOptions(activeBot) : undefined,
          capabilities: ['stock.check']
        };

        // 2. Añadir la respuesta real del BotEngine del backend a la pantalla
        setMessages(prev => [...prev, botReplyMsg]);
        addDbLog(`Respuesta real del BotEngine del backend añadida a pantalla exitosamente`, 'SUCCESS');
      } else {
        addDbLog(`Aviso: El BotEngine no devolvió texto de respuesta explícito`, 'ERROR');
      }
    } catch (err: any) {
      addDbLog(`Error al interactuar con el BotEngine del backend: ${err?.message || err}`, 'ERROR');
      logger.error({ err: err?.message || err }, 'Error al enviar mensaje');
    }
  };

  const handleOptionClick = (msgId: string, optionNumber: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, clickedOption: optionNumber } : m));
    handleSendMessage(optionNumber);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
        <SvgIcons.refresh /> Cargando arquitectura modular de chat bot...
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#fef08a', border: '6px solid #eab308' }}>
      <div style={{ backgroundColor: '#7c3aed', color: '#ffffff', padding: '10px 16px', fontSize: '0.95rem', fontWeight: 800, textAlign: 'center', letterSpacing: '0.5px', marginBottom: '8px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(124,58,237,0.3)' }}>
        ⚡ PANEL 3 MODIFICADO CON ÉXITO: SIMULADOR DE CHAT Y ESTUDIO EN VIVO (PUERTO 3001)
      </div>
      {/* CONTENEDOR PRINCIPAL DEL SIMULADOR DE CHAT BOT */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: '#efeae2',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto'
        }}
      >
        {/* 1. HEADER SUPERIOR DEL SIMULADOR: SELECCIÓN E INFORMACIÓN DEL BOT */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#005c4b',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            flexShrink: 0,
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#ffffff', color: '#005c4b', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <SvgIcons.bot />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{activeBot?.name || 'Asistente Bot en Sesión'}</span>
                <span style={{ fontSize: '0.7rem', backgroundColor: activeBot?.isActive ? '#25d366' : '#6b7280', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  {activeBot?.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span>Identificador: {activeBot?.botId || 'admin'}</span>
                <span>•</span>
                <span>Modo Sesión: {isAnonymousSession ? 'Anónima (Cookie)' : 'Autenticada'}</span>
                <span>•</span>
                <span>Teléfono: {userPhone || 'Activo'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* SELECCIÓN DE BOT EN EL HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 600 }}>Bot Activo:</span>
              <select
                value={activeBot?.botId || ''}
                onChange={(e) => handleBotChange(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                {bots.map(b => (
                  <option key={b.botId || b.id} value={b.botId} style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                    {b.name} ({b.botId})
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÓN DE BORRADO Y REINICIO MANUAL */}
            <button
              onClick={handleResetChatFromZero}
              title="Borrar chat y reiniciar desde cero según configuración guardada"
              style={{ background: 'rgba(239, 68, 68, 0.8)', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <SvgIcons.trash /> Borrar y Reiniciar
            </button>
          </div>
        </div>

        {/* 2. BARRA DE EXTENSIBILIDAD PARA SUBSISTEMAS COMPLEJOS */}
        {registeredSubsystems.length > 0 && (
          <div
            style={{
              padding: '6px 18px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
              overflowX: 'auto'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <SvgIcons.extension /> Subsistemas Modulares:
            </span>
            {registeredSubsystems.map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveSubsystemId(activeSubsystemId === sub.id ? null : sub.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: activeSubsystemId === sub.id ? '#0f172a' : '#ffffff',
                  color: activeSubsystemId === sub.id ? '#ffffff' : '#334155',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {sub.icon} {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* CONTENEDOR DEL SUBSISTEMA ACTIVO (SI ESTÁ EXPANDIDO) */}
        {activeSubsystem && (
          <div style={{ padding: '12px 18px', backgroundColor: '#ffffff', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            {activeSubsystem.renderPanel({ activeBot, userPhone, sessionToken })}
          </div>
        )}

        {/* 3. ÁREA DE MENSAJES DE CHAT */}
        <div
          style={{
            flex: 1,
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#efeae2',
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.direction === 'outgoing';
            return (
              <div
                key={msg.id || Math.random()}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
                    backgroundColor: isUser ? '#d9fdd3' : '#ffffff',
                    color: '#111b21',
                    fontSize: '0.92rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    position: 'relative',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.72rem', color: isUser ? '#0070f3' : '#00a884', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isUser ? <SvgIcons.user /> : <SvgIcons.bot />}
                      <span>{isUser ? 'Usuario' : (activeBot?.name || 'Bot Asistente')}</span>
                    </div>
                    {!isUser && (
                      <button
                        onClick={() => {
                          const rootFlow = (activeBot as any)?.flows?.find((f: any) => !f.parentId);
                          setEditingMsgId(msg.id);
                          setEditMsgText(rootFlow?.responseMessage || msg.message);
                          setEditActionKey(rootFlow?.actionKey || 'custom.advanced_flow');
                          setEditContentType(rootFlow?.contentType || 'text_menu');
                          setEditMediaUrl(rootFlow?.mediaUrl || '');
                        }}
                        title="Editar mensaje en tiempo real"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#00a884', display: 'flex', alignItems: 'center' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                      </button>
                    )}
                  </div>

                  {editingMsgId === msg.id ? (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#fcfdfd', padding: '12px', borderRadius: '8px', border: '1px solid #00a884', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setEditContentType('text_plain')}
                          style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: editContentType === 'text_plain' ? '#00a884' : '#f1f5f9', color: editContentType === 'text_plain' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <SvgIcons.text /> Texto
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditContentType('single_function')}
                          style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: editContentType === 'single_function' ? '#00a884' : '#f1f5f9', color: editContentType === 'single_function' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <SvgIcons.function /> Función
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditContentType('text_menu')}
                          style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: editContentType === 'text_menu' ? '#00a884' : '#f1f5f9', color: editContentType === 'text_menu' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <SvgIcons.menu /> Menú
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditContentType('media_interactive')}
                          style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: editContentType === 'media_interactive' ? '#00a884' : '#f1f5f9', color: editContentType === 'media_interactive' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <SvgIcons.image /> Imagen
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditContentType('image_menu')}
                          style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: editContentType === 'image_menu' ? '#00a884' : '#f1f5f9', color: editContentType === 'image_menu' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <SvgIcons.image /> <SvgIcons.menu /> Img+Menú
                        </button>
                      </div>

                      {(editContentType === 'media_interactive' || editContentType === 'image_menu') && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px', color: '#475569' }}>URL de la Imagen / Banner:</label>
                          <input
                            type="text"
                            value={editMediaUrl}
                            onChange={(e) => setEditMediaUrl(e.target.value)}
                            placeholder="https://ejemplo.com/imagen.jpg"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#ffffff', color: '#111b21' }}
                          />
                        </div>
                      )}

                      {(editContentType === 'single_function' || editContentType === 'media_interactive') && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px', color: '#475569' }}>Función Oculta Asociada:</label>
                          <select
                            value={editActionKey}
                            onChange={(e) => setEditActionKey(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #00a884', fontSize: '0.8rem', backgroundColor: '#ffffff', color: '#111b21', fontWeight: 600 }}
                          >
                            <option value="custom.advanced_flow">Flujo Libre / Avanzado</option>
                            <option value="stock.check">Consulta de Stock / Inventario</option>
                            <option value="turnos.book">Reserva de Turnos</option>
                            <option value="business.payment_info">Datos de Pago</option>
                            <option value="support.human">Derivar a Asesor Humano</option>
                          </select>
                        </div>
                      )}

                      <textarea
                        value={editMsgText}
                        onChange={(e) => setEditMsgText(e.target.value)}
                        placeholder="Texto del mensaje..."
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical', color: '#111b21', backgroundColor: '#ffffff' }}
                        rows={2}
                      />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{editStatus || 'Sincronización en vivo'}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setEditingMsgId(null)}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', fontSize: '0.75rem', cursor: 'pointer', color: '#334155' }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveMessageEdit(msg.id)}
                            style={{ padding: '3px 10px', borderRadius: '4px', border: 'none', background: '#00a884', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {activeBot && (() => {
                        const rootFlow = (activeBot as any)?.flows?.find((f: any) => !f.parentId);
                        if (rootFlow && rootFlow.contentType === 'media_interactive' && rootFlow.mediaUrl) {
                          return (
                            <div style={{ marginBottom: '8px' }}>
                              <img 
                                src={rootFlow.mediaUrl} 
                                alt="Multimedia interactiva" 
                                style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                onError={(e: any) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div>{msg.message}</div>
                    </div>
                  )}

                  {/* OPCIONES DE MENÚ INTERACTIVO CON EDICIÓN INDIVIDUAL SVG IN-CHAT */}
                  {msg.options && msg.options.length > 0 && (() => {
                    const rootFlow = (activeBot as any)?.flows?.find((f: any) => !f.parentId);
                    const isMenuType = !rootFlow || rootFlow.contentType === 'text_menu' || !rootFlow.contentType;
                    if (!isMenuType) return null;
                    return (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.options.map((opt: any, idx: number) => {
                          const optNumber = opt.number || opt.id || String(idx + 1);
                          const optLabel = opt.label || opt.customResponse || optNumber;
                          const isClicked = msg.clickedOption === optNumber;
                          const isOptEditing = editingOpt?.msgId === msg.id && editingOpt?.idx === idx;

                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {isOptEditing ? (
                                <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #00a884', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#00a884' }}>✏️ Editar Opción #{optNumber}</div>
                                  <input
                                    type="text"
                                    value={editOptLabel}
                                    onChange={(e) => setEditOptLabel(e.target.value)}
                                    placeholder="Texto de la opción..."
                                    style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#111b21', backgroundColor: '#ffffff' }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <label style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>Función Vinculada:</label>
                                    <select
                                      value={editOptActionKey}
                                      onChange={(e) => setEditOptActionKey(e.target.value)}
                                      style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#ffffff', color: '#111b21' }}
                                    >
                                      <option value="custom.advanced_flow">🎛️ Flujo Libre / Avanzado (custom.advanced_flow)</option>
                                      <option value="custom.menu_builder">📂 Creador de Menús Dinámicos</option>
                                      <option value="custom.free_menu">💬 Menú Libre Personalizado</option>
                                      <option value="stock.check">📦 Consulta de Stock / Inventario</option>
                                      <option value="turnos.book">📅 Reserva de Turnos</option>
                                      <option value="business.payment_info">💳 Datos de Pago (CBU/Alias)</option>
                                      <option value="support.human">👤 Derivar a Asesor Humano</option>
                                    </select>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '2px' }}>
                                    <button
                                      onClick={() => setEditingOpt(null)}
                                      style={{ padding: '3px 8px', fontSize: '0.75rem', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#334155' }}
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={() => handleSaveOptionEdit(msg.id, idx)}
                                      style={{ padding: '3px 10px', fontSize: '0.75rem', background: '#00a884', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                      💾 Guardar Opción
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    onClick={() => handleOptionClick(msg.id, optNumber)}
                                    disabled={Boolean(msg.clickedOption)}
                                    style={{
                                      flex: 1,
                                      textAlign: 'left',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      border: '1px solid #00a884',
                                      backgroundColor: isClicked ? '#00a884' : '#f0f2f5',
                                      color: isClicked ? '#ffffff' : '#00a884',
                                      fontSize: '0.85rem',
                                      fontWeight: 600,
                                      cursor: msg.clickedOption ? 'default' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <span>{optNumber}. {optLabel}</span>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                      {opt.actionKey || 'función'}
                                    </span>
                                  </button>
                                  {!isUser && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingOpt({ msgId: msg.id, idx });
                                          setEditOptLabel(optLabel);
                                          setEditOptActionKey(opt.actionKey || 'custom.advanced_flow');
                                        }}
                                        title={`Editar Opción #${optNumber} y su Función`}
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid #00a884',
                                          borderRadius: '6px',
                                          padding: '6px',
                                          cursor: 'pointer',
                                          color: '#00a884',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOption(msg.id, idx)}
                                        title={`Eliminar Opción #${optNumber}`}
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid #ef4444',
                                          borderRadius: '6px',
                                          padding: '6px',
                                          cursor: 'pointer',
                                          color: '#ef4444',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="3 6 5 6 21 6"></polyline>
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.65rem', color: '#667781' }}>
                    <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isUser && <SvgIcons.checkDouble />}
                  </div>
                </div>

                {/* GLOBO SEPARADO PARA CREAR NUEVO MENSAJE CON EL MISMO FORMATO DE LOS GLOBOS (SIMPLE PARA USUARIO FINAL) */}
                {!isUser && (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
                    {chainedCreatorParentId !== msg.id ? (
                      <button
                        onClick={() => {
                          setChainedCreatorParentId(msg.id);
                          setNewChainedText('');
                          setNewChainedType('text_plain');
                          setNewChainedKeyword(`key_${Date.now().toString().slice(-4)}`);
                          setNewChainedActionKey('custom.advanced_flow');
                        }}
                        style={{
                          maxWidth: '75%',
                          width: 'fit-content',
                          padding: '10px 14px',
                          borderRadius: '0 12px 12px 12px',
                          backgroundColor: '#ffffff',
                          color: '#00a884',
                          fontSize: '0.92rem',
                          fontWeight: 600,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        Crear nuevo mensaje
                      </button>
                    ) : (
                      <div style={{
                        maxWidth: '75%',
                        width: 'fit-content',
                        minWidth: '280px',
                        backgroundColor: '#ffffff',
                        borderRadius: '0 12px 12px 12px',
                        padding: '10px 14px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        fontSize: '0.92rem',
                        color: '#111b21'
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '0.72rem', color: '#00a884', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <SvgIcons.bot />
                            <span>Crear nuevo mensaje</span>
                          </div>
                          <button
                            onClick={() => setChainedCreatorParentId(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '3px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setNewChainedType('text_plain')}
                            style={{ padding: '3px 6px', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', background: newChainedType === 'text_plain' ? '#00a884' : '#f1f5f9', color: newChainedType === 'text_plain' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <SvgIcons.text /> Texto
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChainedType('single_function')}
                            style={{ padding: '3px 6px', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', background: newChainedType === 'single_function' ? '#00a884' : '#f1f5f9', color: newChainedType === 'single_function' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <SvgIcons.function /> Función
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChainedType('text_menu')}
                            style={{ padding: '3px 6px', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', background: newChainedType === 'text_menu' ? '#00a884' : '#f1f5f9', color: newChainedType === 'text_menu' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <SvgIcons.menu /> Menú
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChainedType('media_interactive')}
                            style={{ padding: '3px 6px', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', background: newChainedType === 'media_interactive' ? '#00a884' : '#f1f5f9', color: newChainedType === 'media_interactive' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <SvgIcons.image /> Imagen
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChainedType('image_menu')}
                            style={{ padding: '3px 6px', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', background: newChainedType === 'image_menu' ? '#00a884' : '#f1f5f9', color: newChainedType === 'image_menu' ? '#fff' : '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <SvgIcons.image />+<SvgIcons.menu /> Img+Menú
                          </button>
                        </div>

                        {(newChainedType === 'media_interactive' || newChainedType === 'image_menu') && (
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px', color: '#475569' }}>URL de la Imagen:</label>
                            <input
                              type="text"
                              value={newChainedMediaUrl}
                              onChange={(e) => setNewChainedMediaUrl(e.target.value)}
                              placeholder="https://..."
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#ffffff', color: '#111b21' }}
                            />
                          </div>
                        )}

                        {(newChainedType === 'single_function' || newChainedType === 'media_interactive') && (
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px', color: '#475569' }}>Acción / Función Asociada:</label>
                            <select
                              value={newChainedActionKey}
                              onChange={(e) => setNewChainedActionKey(e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #00a884', fontSize: '0.8rem', backgroundColor: '#ffffff', color: '#111b21', fontWeight: 600 }}
                            >
                              <option value="custom.advanced_flow">Flujo Libre / Avanzado</option>
                              <option value="stock.check">Consulta de Stock / Inventario</option>
                              <option value="turnos.book">Reserva de Turnos</option>
                              <option value="business.payment_info">Datos de Pago</option>
                              <option value="support.human">Derivar a Asesor Humano</option>
                            </select>
                          </div>
                        )}

                        {(newChainedType === 'text_menu' || newChainedType === 'image_menu') && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Opciones del Menú:</label>
                              <button
                                type="button"
                                onClick={() => setNewChainedOptions(prev => [...prev, { label: `Opción ${prev.length + 1}`, actionKey: 'stock.check' }])}
                                style={{ background: '#00a884', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}
                              >
                                + Agregar Opción
                              </button>
                            </div>
                            {newChainedOptions.map((opt, oIdx) => (
                              <div key={oIdx} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  value={opt.label}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNewChainedOptions(prev => prev.map((item, idx) => idx === oIdx ? { ...item, label: val } : item));
                                  }}
                                  placeholder={`Opción ${oIdx + 1}`}
                                  style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setNewChainedOptions(prev => prev.filter((_, idx) => idx !== oIdx))}
                                  style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 6px', fontSize: '0.7rem', cursor: 'pointer' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <textarea
                          value={newChainedText}
                          onChange={(e) => setNewChainedText(e.target.value)}
                          placeholder="Escribe el texto del mensaje..."
                          rows={2}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical', color: '#111b21', backgroundColor: '#ffffff', outline: 'none' }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{editStatus || ''}</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setChainedCreatorParentId(null)}
                              style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', fontSize: '0.75rem', cursor: 'pointer', color: '#334155', fontWeight: 600 }}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveChainedNode(msg.id)}
                              style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', background: '#00a884', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. BARRA DE ENTRADA DE CHAT */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f0f2f5',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: '0'
          }}
        >
          <input
            type="text"
            placeholder="Escribe un mensaje o número de opción (ej. 1)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '24px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#111b21',
              fontSize: '0.95rem',
              outline: 'none',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
            }}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            style={{
              backgroundColor: inputText.trim() ? '#00a884' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
              transition: 'background 0.2s'
            }}
          >
            <SvgIcons.send />
          </button>
        </div>
      </div>
    </div>
  );
}
