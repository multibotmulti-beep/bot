export interface MenuOption {
  number?: string;
  id?: string;
  label: string;
  actionKey?: string;
  customResponse?: string;
}

export interface InternalTool {
  key: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface BaseBubbleProps {
  message?: {
    id: string;
    senderPhone: string;
    message: string;
    contentType?: string;
    mediaUrl?: string | null;
    options?: MenuOption[];
    direction: 'incoming' | 'outgoing';
    clickedOption?: string;
  };
  isUser: boolean;
  botName?: string;
  onEdit?: () => void;
  onSaveEdit?: (data: { responseMessage: string; contentType: string; mediaUrl?: string | null; actionKey?: string | null; menuOptions: MenuOption[] }) => void;
  onCancelEdit?: () => void;
  isEditing?: boolean;
  isCreatorBubble?: boolean;
  creatorPrompt?: string;
  onCreateCreatorClick?: () => void;
  isCreating?: boolean;
  children?: React.ReactNode;
}

export interface MenuBubbleProps {
  messageText: string;
  options: MenuOption[];
  clickedOption?: string;
  onOptionClick?: (optionNumber: string) => void;
  internalTools?: InternalTool[];
}
