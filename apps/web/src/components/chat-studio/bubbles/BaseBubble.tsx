'use client';

import React from 'react';
import Icon from '@/components/Icon';

export interface BaseBubbleProps {
  message?: {
    id: string;
    senderPhone: string;
    message: string;
    contentType?: string;
    mediaUrl?: string;
    options?: Array<{ number?: string; label: string; actionKey?: string }>;
    direction: 'incoming' | 'outgoing';
    clickedOption?: string;
  };
  isUser: boolean;
  botName?: string;
  onEdit?: () => void;
  onAddChild?: () => void;
  isCreatorBubble?: boolean;
  creatorPrompt?: string;
  onCreateCreatorClick?: () => void;
  isCreating?: boolean;
  children: React.ReactNode;
}

export default function BaseBubble({
  message,
  isUser,
  botName = 'Bot Asistente',
  onEdit,
  onAddChild,
  isCreatorBubble = false,
  creatorPrompt = '➕ Crear nuevo mensaje',
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
          maxWidth: '82%',
          width: isCreating ? '100%' : 'fit-content',
          minWidth: isCreating ? '320px' : '200px',
          padding: '12px 16px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          backgroundColor: isUser ? '#d9fdd3' : '#ffffff',
          color: '#111b21',
          fontSize: '0.92rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          position: 'relative',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.45',
          border: isUser ? 'none' : '1px solid #e2e8f0'
        }}
      >
        {/* Cabecera de la burbuja */}
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
            {isUser ? <Icon name="user" style={{ width: '14px', height: '14px' }} /> : <Icon name="chat" style={{ width: '14px', height: '14px' }} />}
            <span>{isUser ? 'Usuario' : botName}</span>
          </div>

          {!isUser && !isCreatorBubble && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  title="Editar con el editor unificado"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    color: '#00a884',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    backgroundColor: '#f1f5f9'
                  }}
                >
                  ✏️ Editar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Contenido inyectado de la burbuja o Botón de Creador */}
        {isCreatorBubble && !isCreating ? (
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
            <span>{creatorPrompt}</span>
          </button>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
