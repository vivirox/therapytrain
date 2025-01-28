import { useState, useEffect, useCallback } from 'react';
import { RealTimeAnalyticsService } from '../services/realTimeAnalytics';
import { SecurityService } from '../services/security';
import { Message } from '../types/chat';
import { ClientProfile } from '../types/ClientProfile';
import { EmotionalResponse } from '../types/emotions';

export const useSecureAnalytics = (
  sessionId: string,
  clientProfile: ClientProfile
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analytics = RealTimeAnalyticsService.getInstance();
  const security = SecurityService.getInstance();

  const analyzeSentimentSecurely = useCallback(
    async (message: Message) => {
      setIsLoading(true);
      try {
        // Log the analysis attempt
        await security.logAudit(
          clientProfile.id.toString(),
          'sentiment_analysis',
          `session/${sessionId}`,
          'success'
        );

        // Encrypt message content before analysis
        const encrypted = await security.encryptData(message);
        const sentiment = await analytics.analyzeSentiment({
          ...message,
          content: encrypted.data,
        });

        return sentiment;
      } catch (err) {
        setError(err as Error);
        await security.logAudit(
          clientProfile.id.toString(),
          'sentiment_analysis',
          `session/${sessionId}`,
          'failure',
          { error: (err as Error).message }
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, clientProfile.id, analytics, security]
  );

  const trackPatternSecurely = useCallback(
    async (messages: Message[]) => {
      setIsLoading(true);
      try {
        // Anonymize data before pattern analysis
        const anonymizedMessages = await security.anonymizeData(messages);
        const anonymizedProfile = await security.anonymizeData(clientProfile);

        const patterns = await analytics.detectBehavioralPatterns(
          sessionId,
          anonymizedMessages,
          anonymizedProfile
        );

        await security.logAudit(
          clientProfile.id.toString(),
          'pattern_detection',
          `session/${sessionId}`,
          'success'
        );

        return patterns;
      } catch (err) {
        setError(err as Error);
        await security.logAudit(
          clientProfile.id.toString(),
          'pattern_detection',
          `session/${sessionId}`,
          'failure',
          { error: (err as Error).message }
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, clientProfile, analytics, security]
  );

  const updateEmotionSecurely = useCallback(
    async (emotion: EmotionalResponse) => {
      setIsLoading(true);
      try {
        // Encrypt emotional data
        const encryptedEmotion = await security.encryptData(emotion);
        await analytics.updateEmotionalTrend(sessionId, encryptedEmotion as any);

        await security.logAudit(
          clientProfile.id.toString(),
          'emotion_update',
          `session/${sessionId}`,
          'success'
        );
      } catch (err) {
        setError(err as Error);
        await security.logAudit(
          clientProfile.id.toString(),
          'emotion_update',
          `session/${sessionId}`,
          'failure',
          { error: (err as Error).message }
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, clientProfile.id, analytics, security]
  );

  const getSecureAnalytics = useCallback(async () => {
    try {
      const hasAccess = await security.validateAccess(
        clientProfile.id.toString(),
        `session/${sessionId}`,
        'read_analytics'
      );

      if (!hasAccess) {
        throw new Error('Access denied to session analytics');
      }

      const analytics = await RealTimeAnalyticsService.getInstance().getSessionAnalytics(
        sessionId
      );

      // Decrypt the data before returning
      const decryptedAnalytics = {
        patterns: await Promise.all(
          analytics.patterns.map(p => security.decryptData(p))
        ),
        interventions: await Promise.all(
          analytics.interventions.map(i => security.decryptData(i))
        ),
        emotionalTrends: await Promise.all(
          analytics.emotionalTrends.map(e => security.decryptData(e))
        ),
      };

      return decryptedAnalytics;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [sessionId, clientProfile.id, security]);

  return {
    analyzeSentimentSecurely,
    trackPatternSecurely,
    updateEmotionSecurely,
    getSecureAnalytics,
    isLoading,
    error,
  };
};
