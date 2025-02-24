import type { ChatMessage, ChatContext } from '../chat';

export interface MessageProcessingResult {
  processedMessage: ChatMessage;
  updatedContext: Partial<ChatContext>;
  suggestedActions?: Array<{
    type: string;
    payload: unknown;
  }>;
}

export interface MessageHandler {
  processIncoming(message: ChatMessage, context: ChatContext): Promise<MessageProcessingResult>;
  processOutgoing(message: ChatMessage, context: ChatContext): Promise<MessageProcessingResult>;
  handleError(error: Error, context: ChatContext): Promise<MessageProcessingResult>;
}

export interface MessageFilter {
  name: string;
  priority: number;
  filter(message: ChatMessage, context: ChatContext): Promise<boolean>;
}

export interface MessageTransformer {
  name: string;
  priority: number;
  transform(message: ChatMessage, context: ChatContext): Promise<ChatMessage>;
}

export interface MessageHandlerConfig {
  filters: MessageFilter[];
  transformers: MessageTransformer[];
  maxRetries: number;
  timeoutMs: number;
  enableLogging: boolean;
} 