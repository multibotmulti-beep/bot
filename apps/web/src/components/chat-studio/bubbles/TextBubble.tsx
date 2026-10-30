'use client';

import React from 'react';

export interface TextBubbleProps {
  messageText: string;
}

export default function TextBubble({ messageText }: TextBubbleProps) {
  return (
    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#111b21' }}>
      {messageText}
    </div>
  );
}
