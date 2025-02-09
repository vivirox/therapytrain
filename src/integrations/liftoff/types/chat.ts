import { ReactNode } from 'react';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'error' | 'delivered' | 'read';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  isTyping?: boolean;
}

export interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  className?: string;
  children?: ReactNode;
}

export interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  className?: string;
}

export interface TypingIndicatorProps {
  className?: string;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  className?: string;
}
