import { useState, useCallback, useEffect } from 'react';
import { useSSE } from './useSSE';
import { ChatService } from '../services/chat.service';
import { ZKMessage, ZKChatMessage } from '../lib/zk/types';

interface UseChatOptions {
  userId: string;
  threadId: string;
  onError?: (error: Error) => void;
}

interface ChatState {
  messages: ZKChatMessage[];
  loading: boolean;
  error: Error | null;
  sending: boolean;
}

export function useChat({ userId, threadId, onError }: UseChatOptions) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    loading: true,
    error: null,
    sending: false,
  });

  const chatService = ChatService.getInstance();

  // SSE connection for real-time updates
  const { connected } = useSSE({
    userId,
    threadId,
    onMessage: (data) => {
      if (data.type === 'message') {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, data.payload],
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({ ...prev, error: error as Error }));
      onError?.(error as Error);
    },
  });

  // Load message history
  const loadMessages = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const messages = await chatService.getMessageHistory(userId, threadId);
      setState(prev => ({
        ...prev,
        messages: messages as ZKChatMessage[],
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        loading: false,
      }));
      onError?.(error as Error);
    }
  }, [userId, threadId, onError]);

  // Send a new message
  const sendMessage = useCallback(async (content: string) => {
    try {
      setState(prev => ({ ...prev, sending: true }));
      
      // Send user message
      const message = await chatService.sendMessage(
        userId,
        'ai', // AI is always the recipient in this case
        content,
        threadId
      );

      // Add message to state
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, { ...message, role: 'user' } as ZKChatMessage],
      }));

      // Generate AI response
      const aiResponse = await chatService.generateAIResponse([
        ...state.messages,
        { ...message, role: 'user', decryptedContent: content } as ZKChatMessage,
      ]);

      // Process the streaming response
      const reader = aiResponse.getReader();
      const decoder = new TextDecoder();
      let aiMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        aiMessage += decoder.decode(value);
        
        // Update UI with partial response
        setState(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: 'temp-ai-response',
              senderId: 'ai',
              recipientId: userId,
              encryptedContent: aiMessage,
              decryptedContent: aiMessage,
              role: 'assistant',
              timestamp: Date.now(),
              thread_id: threadId,
            } as ZKChatMessage,
          ],
        }));
      }

      setState(prev => ({ ...prev, sending: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        sending: false,
      }));
      onError?.(error as Error);
    }
  }, [userId, threadId, state.messages, onError]);

  // Load initial messages
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    sending: state.sending,
    connected,
    sendMessage,
    refreshMessages: loadMessages,
  };
} 