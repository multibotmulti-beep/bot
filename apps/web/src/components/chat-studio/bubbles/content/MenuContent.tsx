'use client';

import React from 'react';
import { MenuOption } from '../types';

interface MenuContentProps {
  messageText: string;
  options: MenuOption[];
  clickedOption?: string;
  onOptionClick?: (optionNumber: string) => void;
}

export default function MenuContent({
  messageText,
  options,
  clickedOption,
  onOptionClick,
}: MenuContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#111b21', fontSize: '0.92rem' }}>
        {messageText}
      </div>

      {options && options.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          {options.map((opt, idx) => {
            const optNumber = opt.number || opt.id || String(idx + 1);
            const optLabel = opt.label || opt.customResponse || `Opción ${optNumber}`;
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
                  transition: 'all 0.2s ease',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  width: '100%'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
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
                  <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {optLabel}
                  </span>
                </div>
                {opt.actionKey && (
                  <span style={{ fontSize: '0.68rem', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569', flexShrink: 0 }}>
                    ⚡ {opt.actionKey}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
