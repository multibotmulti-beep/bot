'use client';

import React from 'react';

interface MediaContentProps {
  mediaUrl: string;
  caption?: string;
}

export default function MediaContent({ mediaUrl, caption }: MediaContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <img
        src={mediaUrl}
        alt="Media attachment"
        style={{
          maxWidth: '100%',
          borderRadius: '8px',
          objectFit: 'cover',
          maxHeight: '220px',
          border: '1px solid #e2e8f0'
        }}
      />
      {caption && (
        <div style={{ fontSize: '0.88rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
          {caption}
        </div>
      )}
    </div>
  );
}
