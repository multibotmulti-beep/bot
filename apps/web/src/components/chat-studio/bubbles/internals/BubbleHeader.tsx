'use client';

import React from 'react';
import Icon from '@/components/Icon';

export interface BubbleHeaderProps {
  isUser: boolean;
  botName?: string;
  isEditing?: boolean;
  isCreatorBubble?: boolean;
  contentType?: string;
  onEdit?: () => void;
}

// Iconos SVG puros para cada contexto y herramienta
const SvgMap = {
  user: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  bot: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="9" cy="16" r="1" />
      <circle cx="15" cy="16" r="1" />
      <path d="M12 2v9" />
    </svg>
  ),
  edit: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
  media: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  ),
  function: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
  text: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  )
};

export default function BubbleHeader({
  isUser,
  botName = 'Asistente Bot',
  isEditing = false,
  isCreatorBubble = false,
  contentType = 'text_menu',
  onEdit
}: BubbleHeaderProps) {
  // Determinación flexible del título y el SVG según el estado y herramienta activa
  let title = botName;
  let IconComponent = SvgMap.bot;

  if (isUser) {
    title = 'Usuario';
    IconComponent = SvgMap.user;
  } else if (isEditing) {
    title = 'Editor de Nodo Activo';
    if (contentType === 'text_menu' || contentType === 'image_menu') {
      title = 'Editor de Menú Interactivo';
      IconComponent = SvgMap.menu;
    } else if (contentType === 'media_interactive') {
      title = 'Editor de Multimedia';
      IconComponent = SvgMap.media;
    } else if (contentType === 'single_function') {
      title = 'Editor de Función de Sistema';
      IconComponent = SvgMap.function;
    } else {
      IconComponent = SvgMap.text;
    }
  } else if (isCreatorBubble) {
    title = 'Creador de Mensaje';
    IconComponent = SvgMap.bot;
  } else {
    // Modo visualización normal según el tipo de contenido
    if (contentType === 'text_menu' || contentType === 'image_menu') {
      title = `${botName} (Menú)`;
      IconComponent = SvgMap.menu;
    } else if (contentType === 'media_interactive') {
      title = `${botName} (Multimedia)`;
      IconComponent = SvgMap.media;
    } else if (contentType === 'single_function') {
      title = `${botName} (Acción)`;
      IconComponent = SvgMap.function;
    } else {
      title = botName;
      IconComponent = SvgMap.bot;
    }
  }

  return (
    <div
      style={{
        fontWeight: 600,
        fontSize: '0.72rem',
        color: isUser ? '#0070f3' : '#00a884',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <IconComponent />
        <span>{title}</span>
      </div>

      {!isUser && !isCreatorBubble && onEdit && !isEditing && (
        <button
          type="button"
          onClick={onEdit}
          title="Editar este nodo"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 6px',
            color: '#00a884',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            fontWeight: 600,
            borderRadius: '4px',
            backgroundColor: '#f1f5f9'
          }}
        >
          <SvgMap.edit /> Editar
        </button>
      )}
    </div>
  );
}
