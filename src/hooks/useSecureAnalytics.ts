import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { RealTimeAnalyticsService } from '@/services/realtimeanalytics';
import type { BehavioralPattern, SentimentAnalysis } from '@/services/realtimeanalytics';
import { SecurityService } from '@/services/security';
import { Message } from '@/types/chat';
import { ClientProfile } from '@/types/clientprofile';
import { EmotionalResponse } from '@/src/types/emotions';
import type { EncryptedData } from '@/services/security';
import { supabase } from '@/lib/supabaseclient'
import type { SecurityEvent, SecurityMetrics, SecurityFilter } from '@/types/security'
import { HIPAAEventType, HIPAAActionType } from '@/types/hipaa'

interface SecureAnalytics {
  totalEvents: number
  securityIncidents: number
  hipaaViolations: number
  unauthorizedAccess: number
  riskScore: number
  complianceScore: number
}

interface AnalyticsFilter {
  startDate?: Date
  endDate?: Date
  eventTypes?: string[]
  severity?: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
}

const useSecureAnalytics = (sessionId: string, clientProfile: ClientProfile) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const analytics = RealTimeAnalyticsService.getInstance();
    const security = SecurityService.getInstance();
    const [analyticsData, setAnalyticsData] = useState<SecureAnalytics>({
        totalEvents: 0,
        securityIncidents: 0,
        hipaaViolations: 0,
        unauthorizedAccess: 0,
        riskScore: 0,
        complianceScore: 100
    });

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

    const fetchAnalytics = useCallback(async (filter?: AnalyticsFilter) => {
        try {
            setIsLoading(true);
            setError(null);

            const query = supabase
                .from('security_events')
                .select('*')
                .order('timestamp', { ascending: false });

            if (sessionId) {
                query.eq('resourceId', sessionId);
            }

            if (filter?.startDate) {
                query.gte('timestamp', filter.startDate.toISOString());
            }

            if (filter?.endDate) {
                query.lte('timestamp', filter.endDate.toISOString());
            }

            if (filter?.eventTypes?.length) {
                query.in('eventType', filter.eventTypes);
            }

            if (filter?.severity) {
                query.eq('severity', filter.severity);
            }

            if (filter?.userId) {
                query.eq('userId', filter.userId);
            }

            const { data: events, error: eventsError } = await query;

            if (eventsError) throw eventsError;

            // Calculate analytics
            const analytics = calculateSecurityAnalytics(events || []);
            setAnalyticsData(analytics);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch security analytics'));
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        void fetchAnalytics();
    }, [fetchAnalytics]);

    const trackSecurityEvent = useCallback(async (event: SecurityEvent) => {
        try {
            const { error } = await supabase
                .from('security_events')
                .insert([{
                    ...event,
                    timestamp: new Date().toISOString()
                }]);

            if (error) throw error;

            // If this is a HIPAA-related event, also log it to the HIPAA audit log
            if (event.type === 'HIPAA_VIOLATION' || event.type === 'PHI_ACCESS') {
                const { error: hipaaError } = await supabase
                    .from('hipaa_audit_logs')
                    .insert([{
                        eventType: HIPAAEventType.SECURITY_EVENT,
                        action: {
                            type: HIPAAActionType.CREATE,
                            status: 'SUCCESS',
                            details: event
                        },
                        resource: {
                            type: 'SYSTEM',
                            id: event.resourceId,
                            description: event.description
                        },
                        metadata: {
                            severity: event.severity,
                            source: 'security_analytics'
                        }
                    }]);

                if (hipaaError) throw hipaaError;
            }
        } catch (err) {
            console.error('Failed to track security event:', err);
            throw err;
        }
    }, []);

    const calculateRiskScore = useCallback((events: SecurityEvent[]): number => {
        const severityWeights = {
            low: 1,
            medium: 2,
            high: 3,
            critical: 4
        };

        const totalWeight = events.reduce((sum: any, event: any) => 
            sum + (severityWeights[event.severity] || 1), 0);

        return Math.max(0, 100 - (totalWeight / events.length) * 25);
    }, []);

    return {
        analyzeSentimentSecurely,
        trackPatternSecurely,
        updateEmotionSecurely,
        getSecureAnalytics,
        isLoading,
        error,
        analytics: analyticsData,
        trackSecurityEvent,
        calculateRiskScore,
        refresh: fetchAnalytics
    };
};

function calculateSecurityAnalytics(events: SecurityEvent[]): SecureAnalytics {
    const analytics: SecureAnalytics = {
        totalEvents: events.length,
        securityIncidents: 0,
        hipaaViolations: 0,
        unauthorizedAccess: 0,
        riskScore: 100,
        complianceScore: 100
    };

    if (events.length === 0) return analytics;

    // Count different types of events
    analytics.securityIncidents = events.filter(
        (event: any) => event.type === 'SECURITY_INCIDENT'
    ).length;

    analytics.hipaaViolations = events.filter(
        (event: any) => event.type === 'HIPAA_VIOLATION'
    ).length;

    analytics.unauthorizedAccess = events.filter(
        (event: any) => event.type === 'UNAUTHORIZED_ACCESS'
    ).length;

    // Calculate risk score based on event severity
    const severityWeights = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4
    };

    const totalSeverity = events.reduce(
        (sum: any, event: any) => sum + (severityWeights[event.severity] || 1),
        0
    );

    analytics.riskScore = Math.max(0, 100 - (totalSeverity / events.length) * 25);

    // Calculate compliance score
    const complianceImpactingEvents = events.filter(
        (event: any) => event.type === 'HIPAA_VIOLATION' || 
                 event.type === 'COMPLIANCE_VIOLATION' ||
                 event.severity === 'high' ||
                 event.severity === 'critical'
    ).length;

    analytics.complianceScore = Math.max(0, 100 - (complianceImpactingEvents / events.length) * 50);

    return analytics;
}

export default useSecureAnalytics;
