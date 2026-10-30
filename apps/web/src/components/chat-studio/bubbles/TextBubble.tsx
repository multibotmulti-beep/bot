'use client';

import React from 'react';
import TextContent from './content/TextContent';

interface TextBubbleProps {
  messageText: string;
}

export default function TextBubble({ messageText }: TextBubbleProps) {
  return <TextContent text={messageText} />;
}
