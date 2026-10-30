'use client';

import React from 'react';
import { InternalTool } from '../types';

interface InternalToolsBoxProps {
  tools?: InternalTool[];
}

export default function InternalToolsBox({ tools }: InternalToolsBoxProps) {
  if (!tools || tools.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '10px',
        padding: '8px 10px',
        borderRadius: '6px',
        backgroundColor: '#f1f5f9',
        border: '1px dashed #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
        Herramientas Internas / Integraciones
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {tools.map((tool, idx) => (
          <span
            key={idx}
            style={{
              fontSize: '0.75rem',
              backgroundColor: '#e2e8f0',
              color: '#334155',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {tool.icon && <span>{tool.icon}</span>}
            {tool.label}
          </span>
        ))}
      </div>
    </div>
  );
}
