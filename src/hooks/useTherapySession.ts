import { useState, useEffect, useCallback } from 'react';
import { TherapySession, Message } from '@/types/therapy';
import { EmotionalResponse, EmotionalContext } from '@/types/emotions';
import { TherapySessionService } from '@/services/therapy/TherapySessionService';
import { EmotionalAnalysisService } from '@/services/therapy/EmotionalAnalysisService';

interface UseTherapySessionOptions {
  autoConnect?: boolean;
  enableEmotionalAnalysis?: boolean;
}

export function useTherapySession(
  sessionId: string,
  options: UseTherapySessionOptions = {}
) {
  const [session, setSession] = useState<TherapySession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [emotionalContext, setEmotionalContext] = useState<EmotionalContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const sessionService = TherapySessionService.getInstance();
  const emotionalAnalysisService = EmotionalAnalysisService.getInstance();

  const loadSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load session data
      const sessionData = await sessionService.getSession(sessionId);
      setSession(sessionData);

      // Load messages
      const messageHistory = await sessionService.getMessages(sessionId);
      setMessages(messageHistory);

      // Load emotional context if enabled
      if (options.enableEmotionalAnalysis) {
        const context = await emotionalAnalysisService.getEmotionalContext(sessionId);
        setEmotionalContext(context);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load session'));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, options.enableEmotionalAnalysis]);

  useEffect(() => {
    if (options.autoConnect !== false) {
      loadSession();
    }

    // Subscribe to session updates
    const unsubscribeSession = sessionService.subscribeToSession(
      sessionId,
      (updatedSession) => {
        setSession(updatedSession);
      }
    );

    // Subscribe to message updates
    const unsubscribeMessages = sessionService.subscribeToMessages(
      sessionId,
      (updatedMessages) => {
        setMessages(updatedMessages);
      }
    );

    // Subscribe to emotional context updates if enabled
    let unsubscribeEmotional: (() => void) | undefined;
    if (options.enableEmotionalAnalysis) {
      unsubscribeEmotional = emotionalAnalysisService.subscribeToEmotionalContext(
        sessionId,
        (updatedContext) => {
          setEmotionalContext(updatedContext);
        }
      );
    }

    return () => {
      unsubscribeSession();
      unsubscribeMessages();
      if (unsubscribeEmotional) {
        unsubscribeEmotional();
      }
    };
  }, [sessionId, options.autoConnect, options.enableEmotionalAnalysis]);

  const sendMessage = useCallback(async (content: string) => {
    if (!session) {
      throw new Error('Session not initialized');
    }

    try {
      const message = await sessionService.sendMessage(sessionId, content);
      setMessages((prev) => [...prev, message]);
      return message;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to send message'));
      throw err;
    }
  }, [sessionId, session]);

  const updateEmotionalState = useCallback(async (emotionalResponse: EmotionalResponse) => {
    if (!session) {
      throw new Error('Session not initialized');
    }

    try {
      const updatedContext = await emotionalAnalysisService.updateEmotionalState(
        sessionId,
        emotionalResponse
      );
      setEmotionalContext(updatedContext);
      
      // Update session with emotional state
      const updatedSession = await sessionService.updateSession(sessionId, {
        ...session,
        currentEmotionalState: emotionalResponse
      });
      setSession(updatedSession);

      return updatedContext;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update emotional state'));
      throw err;
    }
  }, [sessionId, session]);

  const endSession = useCallback(async () => {
    if (!session) {
      throw new Error('Session not initialized');
    }

    try {
      await sessionService.endSession(sessionId);
      
      // Generate final emotional analysis if enabled
      if (options.enableEmotionalAnalysis && emotionalContext) {
        await emotionalAnalysisService.generateSessionSummary(sessionId, emotionalContext);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to end session'));
      throw err;
    }
  }, [sessionId, session, options.enableEmotionalAnalysis, emotionalContext]);

  return {
    session,
    messages,
    emotionalContext,
    isLoading,
    error,
    sendMessage,
    updateEmotionalState,
    endSession,
    reload: loadSession
  };
} 