'use client';

import React from 'react';
import MediaContent from './content/MediaContent';

interface MediaBubbleProps {
  mediaUrl: string;
  caption?: string;
}

export default function MediaBubble({ mediaUrl, caption }: MediaBubbleProps) {
  return <MediaContent mediaUrl={mediaUrl} caption={caption} />;
}
