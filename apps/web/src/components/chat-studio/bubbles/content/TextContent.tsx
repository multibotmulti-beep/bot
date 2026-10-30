'use client';

import React from 'react';

interface TextContentProps {
  text: string;
}

export default function TextContent({ text }: TextContentProps) {
  return (
    <div
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: '#111b21',
        fontSize: '0.92rem',
        lineHeight: '1.45'
      }}
    >
      {text}
    </div>
  );
}
