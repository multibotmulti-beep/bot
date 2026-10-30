'use client';

import React from 'react';

export interface MediaBubbleProps {
  messageText: string;
  mediaUrl?: string | null;
  options?: Array<{ number?: string; id?: string; label: string; actionKey?: string }>;
  clickedOption?: string;
  onOptionClick?: (optionNumber: string) => void;
}

export default function MediaBubble({
  messageText,
  mediaUrl,
  options,
  clickedOption,
  onOptionClick
}: MediaBubbleProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {mediaUrl && (
        <div style={{ width: '100%', marginBottom: '4px' }}>
          <img
            src={mediaUrl}
            alt="Multimedia interactiva"
            style={{
              width: '100%',
              maxHeight: '200px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '1px solid #cbd5e1'
            }}
            onError={(e: any) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}

      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#111b21' }}>
        {messageText}
      </div>

      {options && options.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {options.map((opt, idx) => {
            const optNumber = opt.number || opt.id || String(idx + 1);
            const optLabel = opt.label || `Opción ${optNumber}`;
            const isClicked = clickedOption === optNumber;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onOptionClick && onOptionClick(optNumber)}
                style={{
                  backgroundColor: isClicked ? '#e2e8f0' : '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '0.88rem',
                  color: '#0f172a'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#00a884',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    {optNumber}
                  </span>
                  <span style={{ fontWeight: 500 }}>{optLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
