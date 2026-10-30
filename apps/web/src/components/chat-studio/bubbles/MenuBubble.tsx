'use client';

import React from 'react';
import MenuContent from './content/MenuContent';
import { MenuOption } from './types';

export interface MenuBubbleProps {
  messageText: string;
  options: MenuOption[];
  clickedOption?: string;
  onOptionClick?: (optionNumber: string) => void;
}

export default function MenuBubble(props: MenuBubbleProps) {
  return <MenuContent {...props} />;
}
