import { User } from '@supabase/supabase-js';
export interface Message {
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    sessionId: string;
    metadata?: {
        sentiment?: number;
        intent?: string;
        topics?: string[];
    };
}
export interface ChatSession {
    id: string;
    clientId: string;
    therapistId: string;
    startTime: string;
    endTime?: string;
    mode: string;
    status: 'active' | 'ended' | 'paused';
    metadata?: {
        goals?: string[];
        notes?: string;
        metrics?: {
            sentiment?: number;
            engagement?: number;
            progress?: number;
        };
    };
}
export interface Client {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'inactive';
    metadata?: {
        preferences?: any;
        history?: any;
        goals?: string[];
    };
}
export interface ChatState {
    messages: Message[];
    session: ChatSession | null;
    client: Client | null;
    loading: boolean;
    error: Error | null;
}
export interface ChatContextType {
    state: ChatState;
    sendMessage: (content: string) => Promise<void>;
    startSession: (clientId: string) => Promise<void>;
    endSession: () => Promise<void>;
    clearChat: () => void;
}
