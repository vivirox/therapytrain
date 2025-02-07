import { SessionAnalytics } from "./sessionAnalytics";
import { ContextualLearningSystem } from "./contextualLearning";
import type { Intervention } from "../types/session";
import type { SessionState } from "./sessionManager";
import { InterventionMetrics } from '../types/metrics';
interface OptimizationMetrics {
    effectiveness: number;
    clientEngagement: number;
    emotionalImpact: number;
    longTermProgress: number;
}
interface InterventionRecommendation {
    interventionType: string;
    confidence: number;
    reasoning: Array<string>;
    expectedOutcomes: Array<string>;
    potentialRisks: Array<string>;
}
export class InterventionOptimizationSystem {
    private static instance: InterventionOptimizationSystem;
    private sessionAnalytics: SessionAnalytics;
    private contextualLearning: ContextualLearningSystem;
    private interventionHistory: Map<string, Array<InterventionMetrics>> = new Map();
    private readonly ENGAGEMENT_WEIGHT = 0.3;
    private readonly EMOTIONAL_IMPACT_WEIGHT = 0.3;
    private readonly PROGRESS_WEIGHT = 0.4;
    private constructor() {
        this.sessionAnalytics = new SessionAnalytics();
        this.contextualLearning = ContextualLearningSystem.getInstance();
    }
    static getInstance(): InterventionOptimizationSystem {
        if (!InterventionOptimizationSystem.instance) {
            InterventionOptimizationSystem.instance = new InterventionOptimizationSystem();
        }
        return InterventionOptimizationSystem.instance;
    }
    initialize(id: string): void {
        this.interventionHistory.set(id, []);
    }
    getRecommendations(content: string): Array<InterventionRecommendation> {
        const recommendations: Array<InterventionRecommendation> = [];
        // Example logic (to be replaced with actual logic)
        recommendations.push({
            interventionType: 'mindfulness',
            confidence: 0.8,
            reasoning: ['Client is experiencing high stress levels.'],
            expectedOutcomes: ['Improved emotional state', 'Increased engagement'],
            potentialRisks: ['Client may feel overwhelmed initially.'],
        });
        return recommendations;
    }
    async trackIntervention(clientId: string, intervention: Intervention, session: SessionState): Promise<void> {
        const metrics = await this.calculateInterventionMetrics(intervention, session);
        const clientHistory = this.interventionHistory.get(clientId) || [];
        clientHistory.push({
            interventionId: intervention.id,
            type: intervention.type,
            timestamp: Date.now(),
            metrics,
            sessionId: session.id,
        });
        this.interventionHistory.set(clientId, clientHistory);
    }
    private async calculateInterventionMetrics(intervention: Intervention, session: SessionState): Promise<OptimizationMetrics> {
        const sessionMetrics = await SessionAnalytics.getSessionMetrics(session.id);
        return {
            effectiveness: sessionMetrics.effectiveness || 0,
            clientEngagement: sessionMetrics.engagementScore || 0,
            emotionalImpact: sessionMetrics.averageSentiment || 0,
            longTermProgress: sessionMetrics.progressTowardsGoals || 0,
        };
    }
    async getInterventionEffectiveness(clientId: string, interventionType: string): Promise<number> {
        const history = this.interventionHistory.get(clientId) || [];
        const relevantInterventions = history.filter(h => h.type === interventionType);
        if (relevantInterventions.length === 0) {
            return 0;
        }
        const totalScore = relevantInterventions.reduce((sum, intervention) => {
            const weightedScore = intervention.metrics.effectiveness * 0.4 +
                intervention.metrics.clientEngagement * this.ENGAGEMENT_WEIGHT +
                intervention.metrics.emotionalImpact * this.EMOTIONAL_IMPACT_WEIGHT +
                intervention.metrics.longTermProgress * this.PROGRESS_WEIGHT;
            return sum + weightedScore;
        }, 0);
        return totalScore / relevantInterventions.length;
    }
    async recommendIntervention(clientId: string, currentContext: {
        emotionalState: number;
        engagementLevel: number;
        recentTopics: Array<string>;
    }): Promise<Array<InterventionRecommendation>> {
        const history = this.interventionHistory.get(clientId) || [];
        const interventionTypes = new Set(history.map(h => h.type));
        const recommendations: Array<InterventionRecommendation> = [];
        for (const type of interventionTypes) {
            const effectiveness = await this.getInterventionEffectiveness(clientId, type);
            const contextualFit = await this.evaluateContextualFit(type, currentContext);
            const confidence = (effectiveness * 0.7 + contextualFit * 0.3);
            if (confidence > 0.6) {
                recommendations.push({
                    interventionType: type,
                    confidence,
                    reasoning: await this.generateReasoning(type, effectiveness, currentContext),
                    expectedOutcomes: await this.predictOutcomes(type, history),
                    potentialRisks: await this.assessRisks(type, history),
                });
            }
        }
        return recommendations.sort((a, b) => b.confidence - a.confidence);
    }
    private async evaluateContextualFit(interventionType: string, context: {
        emotionalState: number;
        engagementLevel: number;
        recentTopics: Array<string>;
    }): Promise<number> {
        const interventionCharacteristics: Record<string, {
            idealEmotionalState: number;
            minEngagement: number;
            suitableTopics: Array<string>;
        }> = {
            'cognitive-restructuring': {
                idealEmotionalState: 0,
                minEngagement: 0.6,
                suitableTopics: ['anxiety', 'depression', 'negative-thoughts'],
            },
            'mindfulness': {
                idealEmotionalState: -0.3,
                minEngagement: 0.4,
                suitableTopics: ['stress', 'anxiety', 'overwhelm'],
            },
            'behavioral-activation': {
                idealEmotionalState: -0.5,
                minEngagement: 0.3,
                suitableTopics: ['depression', 'motivation', 'routine'],
            },
        };
        const characteristics = interventionCharacteristics[interventionType];
        if (!characteristics) {
            return 0;
        }
        const emotionalFit = 1 - Math.abs(context.emotionalState - characteristics.idealEmotionalState);
        const engagementFit = context.engagementLevel >= characteristics.minEngagement ? 1 : 0;
        const topicFit = context.recentTopics.some(topic => characteristics.suitableTopics.includes(topic)) ? 1 : 0;
        return (emotionalFit + engagementFit + topicFit) / 3;
    }
    private async generateReasoning(interventionType: string, effectiveness: number, context: {
        emotionalState: number;
        engagementLevel: number;
        recentTopics: Array<string>;
    }): Promise<Array<string>> {
        const reasons: Array<string> = [];
        if (effectiveness > 0.7) {
            reasons.push(`High historical effectiveness (${Math.round(effectiveness * 100)}% success rate)`);
        }
        if (context.engagementLevel > 0.6) {
            reasons.push('Client showing strong engagement');
        }
        if (Math.abs(context.emotionalState) > 0.3) {
            reasons.push(context.emotionalState > 0
                ? 'Positive emotional state supports intervention'
                : 'May help address current emotional challenges');
        }
        return reasons;
    }
    private async predictOutcomes(interventionType: string, history: Array<InterventionMetrics>): Promise<Array<string>> {
        const typeHistory = history.filter(h => h.type === interventionType);
        const outcomes: Array<string> = [];
        const avgEngagement = typeHistory.reduce((sum, h) => sum + h.metrics.clientEngagement, 0) / typeHistory.length;
        if (avgEngagement > 0.5) {
            outcomes.push('Likely to maintain high client engagement');
        }
        const avgEmotional = typeHistory.reduce((sum, h) => sum + h.metrics.emotionalImpact, 0) / typeHistory.length;
        if (avgEmotional > 0) {
            outcomes.push('Expected positive emotional impact');
        }
        const avgProgress = typeHistory.reduce((sum, h) => sum + h.metrics.longTermProgress, 0) / typeHistory.length;
        if (avgProgress > 0.3) {
            outcomes.push('Contributes to long-term therapeutic progress');
        }
        return outcomes;
    }
    private async assessRisks(interventionType: string, history: Array<InterventionMetrics>): Promise<Array<string>> {
        const typeHistory = history.filter(h => h.type === interventionType);
        const risks: Array<string> = [];
        const negativeEngagements = typeHistory.filter(h => h.metrics.clientEngagement < -0.2).length;
        if (negativeEngagements / typeHistory.length > 0.2) {
            risks.push('20% risk of reduced engagement');
        }
        const negativeEmotional = typeHistory.filter(h => h.metrics.emotionalImpact < -0.3).length;
        if (negativeEmotional / typeHistory.length > 0.1) {
            risks.push('Potential for temporary emotional discomfort');
        }
        const lowProgress = typeHistory.filter(h => h.metrics.longTermProgress < 0.1).length;
        if (lowProgress / typeHistory.length > 0.3) {
            risks.push('May not contribute significantly to progress in 30% of cases');
        }
        return risks;
    }
}
