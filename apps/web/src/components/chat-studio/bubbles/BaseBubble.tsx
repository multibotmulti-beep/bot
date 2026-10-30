'use client';

import React from 'react';
import { BaseBubbleProps } from './types';
import InternalEditorBox, { ContentType } from './internals/InternalEditorBox';
import BubbleHeader from './internals/BubbleHeader';

export default function BaseBubble({
  message,
  isUser,
  botName = 'Bot Asistente',
  onEdit,
  onSaveEdit,
  onCancelEdit,
  isEditing = false,
  isCreatorBubble = false,
  creatorPrompt = 'Crear nuevo mensaje',
  onCreateCreatorClick,
  isCreating = false,
  children
}: BaseBubbleProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
        width: '100%'
      }}
    >
      <div
        style={{
          maxWidth: isEditing ? '650px' : '85%',
          maxHeight: isEditing ? '520px' : 'none',
          overflowY: isEditing ? 'auto' : 'visible',
          width: isCreatorBubble || isEditing ? '100%' : 'fit-content',
          minWidth: isCreating ? '320px' : '220px',
          padding: '12px 16px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          backgroundColor: isUser ? '#d9fdd3' : '#ffffff',
          color: '#111b21',
          fontSize: '0.92rem',
          boxShadow: 'none',
          position: 'relative',
          wordBreak: 'break-word',
          lineHeight: '1.45',
          border: 'none'
        }}
      >
        {/* Cabecera Flexible y Reutilizable con SVG Variable */}
        <BubbleHeader
          isUser={isUser}
          botName={botName}
          isEditing={isEditing}
          isCreatorBubble={isCreatorBubble}
          contentType={message?.contentType}
          onEdit={onEdit}
        />

        {/* Contenido de Edición Interna Encapsulado */}
        {isEditing && message ? (
          <InternalEditorBox
            initialText={message.message}
            initialContentType={(message.contentType as ContentType) || 'text_menu'}
            initialMediaUrl={message.mediaUrl}
            initialActionKey={message.options?.[0]?.actionKey || 'custom.advanced_flow'}
            initialOptions={message.options || []}
            onSave={(data) => {
              if (onSaveEdit) onSaveEdit(data);
            }}
            onCancel={() => {
              if (onCancelEdit) onCancelEdit();
            }}
          />
        ) : isCreatorBubble && !isCreating ? (
          <button
            type="button"
            onClick={onCreateCreatorClick}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              color: '#00a884',
              fontWeight: 600,
              fontSize: '0.9rem',
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>{creatorPrompt}</span>
          </button>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
