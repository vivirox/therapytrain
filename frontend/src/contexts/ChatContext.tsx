import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Session, Message, ChatEvent } from '../../../backend/src/types/chat';

interface ChatState {
  sessions: Session[];
  currentSession: Session | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'SET_CURRENT_SESSION'; payload: Session }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: ChatState = {
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  error: null
};

const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  createSession: (title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
} | null>(null);

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const createSession = async (title: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });

      if (!response.ok) throw new Error('Failed to create session');

      const session = await response.json();
      dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
      await loadMessages(session.id);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create session' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendMessage = async (content: string) => {
    if (!state.currentSession) return;

    try {
      const response = await fetch(
        `/api/chat/sessions/${state.currentSession.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, type: 'text' })
        }
      );

      if (!response.ok) throw new Error('Failed to send message');

      const message = await response.json();
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await fetch(`/api/chat/sessions/${sessionId}`);

      if (!response.ok) throw new Error('Failed to load session');

      const session = await response.json();
      dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
      await loadMessages(sessionId);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load session' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`);

      if (!response.ok) throw new Error('Failed to load messages');

      const messages = await response.json();
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load messages' });
    }
  };

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/chat/sessions');
        if (!response.ok) throw new Error('Failed to fetch sessions');

        const sessions = await response.json();
        dispatch({ type: 'SET_SESSIONS', payload: sessions });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch sessions' });
      }
    };

    fetchSessions();
  }, []);

  useEffect(() => {
    if (!state.currentSession) return;

    const eventSource = new EventSource(
      `/api/chat/sessions/${state.currentSession.id}/stream`
    );

    eventSource.onmessage = (event) => {
      const chatEvent: ChatEvent = JSON.parse(event.data);

      switch (chatEvent.type) {
        case 'message':
          dispatch({ type: 'ADD_MESSAGE', payload: chatEvent.payload });
          break;
        case 'error':
          dispatch({ type: 'SET_ERROR', payload: chatEvent.payload.error });
          break;
      }
    };

    eventSource.onerror = () => {
      dispatch({ type: 'SET_ERROR', payload: 'Connection error' });
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [state.currentSession?.id]);

  return (
    <ChatContext.Provider
      value={{ state, dispatch, createSession, sendMessage, loadSession, loadMessages }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
