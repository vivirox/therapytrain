import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { RealTimeAnalyticsService } from '@/services/realtimeanalytics';
import type { BehavioralPattern, SentimentAnalysis } from '@/services/realtimeanalytics';
import { SecurityService } from "@/services/security";
import { Message } from "@/types/chat";
import { ClientProfile } from '@/types/clientprofile';
import { EmotionalResponse } from '@/src/types/emotions';
import type { EncryptedData } from "@/services/security";
const useSecureAnalytics = (sessionId: string, clientProfile: ClientProfile) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const analytics = RealTimeAnalyticsService.getInstance();
    const security = SecurityService.getInstance();
    const analyzeSentimentSecurely = useCallback(async (message: Message) => {
        setIsLoading(true);
        try {
            // Log the analysis attempt
            await security.logAudit(clientProfile.id.toString(), 'sentiment_analysis', `session/${sessionId}`, 'success');
            // Encrypt message content before analysis
            const encrypted = await security.encryptData(message);
            return await analytics.analyzeSentiment({
                ...message,
                content: encrypted.data,
            });
        }
        catch (err) {
            setError(err as Error);
            await security.logAudit(clientProfile.id.toString(), 'sentiment_analysis', `session/${sessionId}`, 'failure', { error: (err as Error).message });
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }, [sessionId, clientProfile.id, analytics, security]);
    const trackPatternSecurely = useCallback(async (messages: Array<Message>) => {
        setIsLoading(true);
        try {
            // Anonymize data before pattern analysis
            const anonymizedMessages = await security.anonymizeData(messages);
            const anonymizedProfile = await security.anonymizeData(clientProfile);
            const patterns = await analytics.detectBehavioralPatterns(sessionId, anonymizedMessages, anonymizedProfile);
            await security.logAudit(clientProfile.id.toString(), 'pattern_detection', `session/${sessionId}`, 'success');
            return patterns;
        }
        catch (err) {
            setError(err as Error);
            await security.logAudit(clientProfile.id.toString(), 'pattern_detection', `session/${sessionId}`, 'failure', { error: (err as Error).message });
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }, [sessionId, clientProfile, analytics, security]);
    const updateEmotionSecurely = useCallback(async (emotion: EmotionalResponse) => {
        setIsLoading(true);
        try {
            // Encrypt emotional data
            const encryptedEmotion = await security.encryptData(emotion);
            await analytics.updateEmotionalTrend(sessionId, encryptedEmotion as any);
            await security.logAudit(clientProfile.id.toString(), 'emotion_update', `session/${sessionId}`, 'success');
        }
        catch (err) {
            setError(err as Error);
            await security.logAudit(clientProfile.id.toString(), 'emotion_update', `session/${sessionId}`, 'failure', { error: (err as Error).message });
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }, [sessionId, clientProfile.id, analytics, security]);
    const getSecureAnalytics = useCallback(async () => {
        try {
            const hasAccess = await security.validateAccess(clientProfile.id.toString(), `session/${sessionId}`, 'read_analytics');
            if (!hasAccess) {
                throw new Error('Access denied to session analytics');
            }
            const analytics = await RealTimeAnalyticsService.getInstance().getSessionAnalytics(sessionId);
            return {
                patterns: await Promise.all(analytics.patterns.map(async (p: any) => {
                    const encryptedPattern = await security.encryptData(p);
                    return security.decryptData(encryptedPattern);
                })),
                interventions: await Promise.all(analytics.interventions.map(async (i: any) => {
                    const encryptedIntervention = await security.encryptData(i);
                    return security.decryptData(encryptedIntervention);
                })),
                emotionalTrends: await Promise.all(analytics.emotionalTrends.map((e: any) => security.decryptData(e as unknown as EncryptedData))),
            };
        }
        catch (err) {
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
export default useSecureAnalytics;
