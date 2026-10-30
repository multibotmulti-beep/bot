'use client';

import React from 'react';
import BaseBubble from './bubbles/BaseBubble';
import TextBubble from './bubbles/TextBubble';
import MenuBubble from './bubbles/MenuBubble';
import MediaBubble from './bubbles/MediaBubble';
import UnifiedNodeEditor from './editor/UnifiedNodeEditor';

export interface ChatStudioMessage {
  id: string;
  senderPhone: string;
  botId: string;
  direction: 'incoming' | 'outgoing';
  message: string;
  contentType?: string;
  mediaUrl?: string | null;
  options?: Array<{ number?: string; label: string; actionKey?: string }>;
  clickedOption?: string;
}

export interface ChatStudioContainerProps {
  messages: ChatStudioMessage[];
  activeBotName: string;
  editingMsgId: string | null;
  creatingChildParentId: string | null;
  editorInitialData: any;
  onStartEdit: (msg: ChatStudioMessage) => void;
  onStartCreateChild: (parentId: string) => void;
  onSaveEditor: (payload: any) => Promise<void>;
  onCancelEditor: () => void;
  onDeleteMessage?: (msgId: string) => Promise<void>;
  onOptionClick?: (msgId: string, optionNumber: string) => void;
}

export default function ChatStudioContainer({
  messages,
  activeBotName,
  editingMsgId,
  creatingChildParentId,
  editorInitialData,
  onStartEdit,
  onStartCreateChild,
  onSaveEditor,
  onCancelEditor,
  onDeleteMessage,
  onOptionClick
}: ChatStudioContainerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', padding: '4px 0' }}>
      {messages.map((msg) => {
        const isUser = msg.direction === 'outgoing';
        const isEditing = editingMsgId === msg.id;
        const isCreatingChild = creatingChildParentId === msg.id;
        const contentType = msg.contentType || 'text_menu';

        return (
          <React.Fragment key={msg.id}>
            {/* Burbuja Principal del Mensaje */}
            <BaseBubble
              message={msg}
              isUser={isUser}
              botName={activeBotName}
              onEdit={!isUser ? () => onStartEdit(msg) : undefined}
            >
              {contentType === 'text_plain' || contentType === 'single_function' ? (
                <TextBubble messageText={msg.message} />
              ) : contentType === 'media_interactive' ? (
                <MediaBubble messageText={msg.message} mediaUrl={msg.mediaUrl} />
              ) : contentType === 'image_menu' ? (
                <MediaBubble
                  messageText={msg.message}
                  mediaUrl={msg.mediaUrl}
                  options={msg.options || []}
                  clickedOption={msg.clickedOption}
                  onOptionClick={(optNum) => onOptionClick && onOptionClick(msg.id, optNum)}
                />
              ) : (
                <MenuBubble
                  messageText={msg.message}
                  options={msg.options || []}
                  clickedOption={msg.clickedOption}
                  onOptionClick={(optNum) => onOptionClick && onOptionClick(msg.id, optNum)}
                />
              )}
            </BaseBubble>

            {/* Editor In-Chat cuando se está editando */}
            {isEditing && (
              <div style={{ paddingLeft: '16px', paddingRight: '16px', width: '100%' }}>
                <UnifiedNodeEditor
                  initialData={editorInitialData}
                  isCreation={false}
                  nodeTitle={`Editar Nodo / Mensaje (${msg.id.slice(0, 6)}...)`}
                  onSave={onSaveEditor}
                  onDelete={onDeleteMessage ? () => onDeleteMessage(msg.id) : undefined}
                  onCancel={onCancelEditor}
                />
              </div>
            )}

            {/* Burbuja Dedicada para "Crear Nuevo Mensaje" (Mismo sistema de burbujas del chat) */}
            {!isUser && (
              <BaseBubble
                isUser={false}
                botName={activeBotName}
                isCreatorBubble={true}
                creatorPrompt="➕ Crear nuevo mensaje"
                onCreateCreatorClick={() => onStartCreateChild(msg.id)}
                isCreating={isCreatingChild}
              >
                {isCreatingChild && (
                  <UnifiedNodeEditor
                    initialData={{
                      responseMessage: 'Escribe el texto del nuevo mensaje...',
                      contentType: 'text_plain',
                      options: []
                    }}
                    isCreation={true}
                    nodeTitle="Crear Nuevo Mensaje"
                    hasExistingMenu={Boolean(msg.options && msg.options.length > 0)}
                    onSave={onSaveEditor}
                    onCancel={onCancelEditor}
                  />
                )}
              </BaseBubble>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
