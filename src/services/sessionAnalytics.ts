import { dataService } from '@/lib/data';
import type { SessionMessage } from '@/types/core/session';
import type { SessionState } from '@/types/services';
import type { SessionMetrics as BaseSessionMetrics } from '@/types/services/sessionanalytics';

interface ChatMessage {
    content: string;
    timestamp: Date;
    sentiment?: number;
    role: 'user' | 'assistant';
    createdAt?: string | Date;
}

interface Intervention {
    id: string;
    type: string;
    timestamp: Date;
    effectiveness: number;
}

export interface ExtendedSessionState extends SessionState {
    messages: Array<SessionMessage>;
    interventions: Array<Intervention>;
}
export interface ExtendedSessionMetrics {
    effectiveness: number;
    duration: number;
    averageSentiment: number;
    engagementScore: number;
    interventionCount: number;
    responseRate: number;
    topicsCovered: Array<string>;
    keyInsights: Array<string>;
    progressTowardsGoals: number;
}
export class SessionAnalytics {
    private static readonly STOP_WORDS: Set<string> = new Set([
        'the', 'is', 'at', 'which', 'on', 'and', // Add more stop words
    ]);

    private static readonly RELATIONSHIP_KEYWORDS: Set<string> = new Set([
        'relationship', 'partner', 'family', 'friend', // Add more keywords
    ]);

    private static readonly DEPRESSION_KEYWORDS: Set<string> = new Set([
        'depression', 'sad', 'hopeless', // Add more keywords
    ]);

    private static readonly ANXIETY_KEYWORDS: Set<string> = new Set([
        'anxiety', 'worried', 'stress', // Add more keywords
    ]);
    public static async getSessionMetrics(sessionId: string): Promise<ExtendedSessionMetrics> {
        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        const sessions = await dataService.getData<ExtendedSessionState>('sessions', { id: sessionId });
        
        if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        const session = sessions[0];
        
        if (!session.startTime) {
            throw new Error(`Invalid session data: missing startTime for session ${sessionId}`);
        }

        const messages = session.messages ?? [];
        const interventions = session.interventions ?? [];
        const endTime = session.endTime ?? new Date();
        
        const chatMessages: Array<ChatMessage> = messages.map(m => ({
            content: m.content,
            timestamp: new Date(m.createdAt ?? m.timestamp),
            sentiment: m.sentiment,
            role: m.role as 'user' | 'assistant'
        }));

        return {
            effectiveness: this.calculateEffectiveness(interventions),
            duration: this.calculateDuration(session.startTime, endTime),
            averageSentiment: this.calculateAverageSentiment(chatMessages),
            engagementScore: this.calculateEngagement(chatMessages),
            interventionCount: interventions.length,
            responseRate: this.calculateResponseRate(chatMessages),
            topicsCovered: this.extractTopics(chatMessages),
            keyInsights: this.generateInsights(chatMessages, interventions),
            progressTowardsGoals: this.calculateProgressTowardsGoals(chatMessages, interventions)
        };
    }
    public static calculateEffectiveness(interventions: Array<any>): number {
        if (!interventions.length) {
            return 0;
        }
        const totalEffectiveness = interventions.reduce((sum: number, intervention: any) => sum + (intervention.effectiveness || 0), 0);
        return totalEffectiveness / interventions.length;
    }
    public static calculateEngagement(messages: Array<ChatMessage>): number {
        const messageGaps = messages
            .slice(1)
            .map((m: any, i: any) => new Date(m.timestamp).getTime() -
            new Date(messages[i].timestamp).getTime());
        const averageGap = messageGaps.reduce((a: any, b: any) => a + b, 0) /
            (messageGaps.length || 1);
        return Math.min(1, Math.max(0, 1 - (averageGap / 300_000))); // 5 min max gap
    }
    public static calculateAverageSentiment(messages: Array<ChatMessage>): number {
        const sentiments = messages
            .filter((m: any) => m.sentiment)
            .map((m: any) => m.sentiment);
        return sentiments.reduce((a: any, b: any) => a + b, 0) / (sentiments.length || 1);
    }
    private static calculateDuration(startTime: Date, endTime: Date): number {
        if (!(startTime instanceof Date) || !(endTime instanceof Date)) {
            throw new Error('Invalid date parameters provided to calculateDuration');
        }
        
        const duration = endTime.getTime() - startTime.getTime();
        if (duration < 0) {
            throw new Error('End time cannot be before start time');
        }
        
        return Math.round(duration / 60_000); // Convert to minutes
    }
    private static calculateResponseRate(messages: Array<ChatMessage>): number {
        const userMessages = messages.filter(m => m.role === 'user').length;
        return userMessages / (messages.length || 1);
    }
    private static calculateProgressTowardsGoals(messages: Array<ChatMessage>, interventions: Array<any>): number {
        // Implementation of progress calculation
        return 0.75; // Placeholder implementation
    }
    public static extractTopics(messages: Array<ChatMessage>): Array<string> {
        const topics = new Set<string>();
        messages.forEach((message) => {
            const keywords = this.extractKeywords(message.content);
            const messageTopic = this.categorizeTopics(keywords);
            if (Array.isArray(messageTopic)) {
                messageTopic.forEach((topic: string) => topics.add(topic));
            }
        });
        return Array.from(topics);
    }
    private static extractKeywords(text: string): Array<string> {
        if (!text || typeof text !== 'string') {
            return [];
        }
        
        const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
        return cleanText.split(' ')
            .filter(word => !this.STOP_WORDS.has(word));
    }
    private static categorizeTopics(keywords: Array<string>): Array<string> {
        const topics = new Set<string>();
        
        keywords.forEach(keyword => {
            if (this.ANXIETY_KEYWORDS.has(keyword)) {
                topics.add('anxiety');
            }
            if (this.DEPRESSION_KEYWORDS.has(keyword)) {
                topics.add('depression');
            }
            if (this.RELATIONSHIP_KEYWORDS.has(keyword)) {
                topics.add('relationships');
            }
        });
        
        return Array.from(topics);
    }
    private static generateInsights(messages: Array<ChatMessage>, interventions: Array<any>): Array<string> {
        const insights = [];
        const responsePatterns = this.analyzeResponsePatterns(messages);
        if (responsePatterns) {
            insights.push(responsePatterns);
        }
        const interventionInsights = this.analyzeInterventions(interventions);
        if (interventionInsights) {
            insights.push(interventionInsights);
        }
        const emotionalInsights = this.analyzeEmotionalProgression(messages);
        if (emotionalInsights) {
            insights.push(emotionalInsights);
        }
        return insights;
    }
    private static analyzeResponsePatterns(messages: Array<ChatMessage>): string | null {
        const responseTimes = messages
            .slice(1)
            .map((m, i) => ({
                gap: new Date(m.timestamp).getTime() -
                    new Date(messages[i].timestamp).getTime(),
                role: m.role
            }));

        const userResponses = responseTimes.filter(r => r.role === 'user');
        const avgUserResponse = userResponses.length > 0
            ? userResponses.reduce((sum, r) => sum + r.gap, 0) / userResponses.length
            : 0;

        if (avgUserResponse < 30_000) {
            return "Quick response patterns indicate high engagement";
        } else if (avgUserResponse > 120_000) {
            return "Longer response times suggest deeper reflection";
        }
        return null;
    }
    private static analyzeInterventions(interventions: Array<Intervention>): string | null {
        if (interventions.length === 0) {
            return null;
        }

        const successfulInterventions = interventions
            .filter(intervention => intervention.effectiveness > 0.7)
            .length;
        
        const effectiveness = successfulInterventions / interventions.length;
        
        if (effectiveness > 0.8) {
            return "High intervention effectiveness rate";
        } else if (effectiveness < 0.4) {
            return "Lower intervention effectiveness, consider adjusting approach";
        }
        
        return null;
    }
    private static analyzeEmotionalProgression(messages: Array<ChatMessage>): string | null {
        const sentiments = messages
            .filter((m: any) => m.sentiment !== undefined)
            .map((m: any) => m.sentiment);
        if (sentiments.length < 2) {
            return null;
        }
        const start = sentiments.slice(0, 3).reduce((a: any, b: any) => a + b, 0) / 3;
        const end = sentiments.slice(-3).reduce((a: any, b: any) => a + b, 0) / 3;
        const change = end - start;
        if (change > 0.5) {
            return "Significant positive emotional progression";
        }
        else if (change < -0.5) {
            return "Notable emotional challenges identified";
        }
        return null;
    }
}
