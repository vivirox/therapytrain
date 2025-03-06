export type MessageType = "text" | "system" | "ai" | "action";
export type SessionStatus = "active" | "paused" | "completed" | "cancelled";

export interface Message {
  id: string;
  created_at: string;
  session_id: string;
  user_id: string;
  type: MessageType;
  payload: {
    content: string;
    role?: "user" | "assistant" | "system";
    name?: string;
    function_call?: any;
    sentiment?: number;
    topics?: string[];
    suggestions?: string[];
  };
  metadata: {
    tokens?: number;
    processingTime?: number;
    model?: string;
    provider?: string;
    error?: string;
  };
}

export interface Session {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  status: SessionStatus;
  payload: {
    title: string;
    summary?: string;
    participants: string[];
    settings: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    };
  };
  metadata: {
    messageCount: number;
    lastActivity: string;
    duration: number;
    aiMetrics?: {
      totalTokens: number;
      totalCost: number;
      averageResponseTime: number;
    };
  };
}

export interface ChatEvent {
  type: "message" | "status" | "typing" | "error";
  payload: any;
  timestamp: string;
}

export interface ChatStreamResponse {
  id: string;
  type: MessageType;
  content: string;
  role: "assistant" | "system";
  timestamp: string;
  metadata?: {
    tokens?: number;
    model?: string;
    provider?: string;
  };
}

export interface SecureMessage {
  id: string;
  session_id: string;
  encrypted_content: string;
  sender_id: string;
  recipient_id?: string;
  type: MessageType;
  nonce: string;
  signature?: string;
  created_at: string;
  metadata?: {
    encryption_type: "e2e" | "session" | "server";
    key_id?: string;
  };
}
