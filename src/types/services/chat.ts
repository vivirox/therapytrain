export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'ended';
  metadata?: Record<string, unknown>;
}

export interface ChatContext {
  sessionId: string;
  userId: string;
  emotionalState?: Record<string, number>;
  interventionContext?: Record<string, unknown>;
  previousMessages: ChatMessage[];
}

export interface ChatService {
  sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage>;
  getMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  createSession(userId: string): Promise<ChatSession>;
  endSession(sessionId: string): Promise<void>;
  getContext(sessionId: string): Promise<ChatContext>;
  updateContext(sessionId: string, context: Partial<ChatContext>): Promise<void>;
}

export interface ChatConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  presencePenalty: number;
  frequencyPenalty: number;
  stopSequences: string[];
  contextWindow: number;
} 