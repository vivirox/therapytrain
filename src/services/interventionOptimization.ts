import { SessionAnalytics } from './sessionAnalytics';
import { ContextualLearningSystem } from './contextualLearning';
import type { Intervention, InterventionMetrics } from '../types/intervention';
import type { SessionState } from '../types/session';

interface OptimizationMetrics {
  effectiveness: number;
  clientEngagement: number;
  emotionalImpact: number;
  longTermProgress: number;
}

interface InterventionRecommendation {
  interventionType: string;
  confidence: number;
  reasoning: string[];
  expectedOutcomes: string[];
  potentialRisks: string[];
}

export class InterventionOptimizationSystem {
  private static instance: InterventionOptimizationSystem;
  private sessionAnalytics: SessionAnalytics;
  private contextualLearning: ContextualLearningSystem;
  private interventionHistory: Map<string, InterventionMetrics[]> = new Map();
  
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

  async trackIntervention(
    clientId: string,
    intervention: Intervention,
    session: SessionState
  ): Promise<void> {
    const metrics = await this.calculateInterventionMetrics(intervention, session);
    
    let clientHistory = this.interventionHistory.get(clientId) || [];
    clientHistory.push({
      interventionId: intervention.id,
      type: intervention.type,
      timestamp: Date.now(),
      metrics,
      sessionId: session.id,
    });
    
    this.interventionHistory.set(clientId, clientHistory);
  }

  private async calculateInterventionMetrics(
    intervention: Intervention,
    session: SessionState
  ): Promise<OptimizationMetrics> {
    const sessionMetrics = await this.sessionAnalytics.getSessionMetrics(session.id);
    
    // Calculate metrics relative to intervention timing
    const preInterventionMessages = session.messages?.filter(
      m => m.timestamp < intervention.timestamp
    ) || [];
    const postInterventionMessages = session.messages?.filter(
      m => m.timestamp >= intervention.timestamp
    ) || [];

    const preEngagement = await this.sessionAnalytics.calculateEngagement(preInterventionMessages);
    const postEngagement = await this.sessionAnalytics.calculateEngagement(postInterventionMessages);
    
    const preEmotional = await this.sessionAnalytics.calculateAverageSentiment(preInterventionMessages);
    const postEmotional = await this.sessionAnalytics.calculateAverageSentiment(postInterventionMessages);

    return {
      effectiveness: sessionMetrics.effectiveness || 0,
      clientEngagement: postEngagement - preEngagement,
      emotionalImpact: postEmotional - preEmotional,
      longTermProgress: sessionMetrics.progressTowardsGoals || 0,
    };
  }

  async getInterventionEffectiveness(
    clientId: string,
    interventionType: string
  ): Promise<number> {
    const history = this.interventionHistory.get(clientId) || [];
    const relevantInterventions = history.filter(h => h.type === interventionType);
    
    if (relevantInterventions.length === 0) return 0;

    const totalScore = relevantInterventions.reduce((sum, intervention) => {
      const weightedScore = 
        intervention.metrics.effectiveness * 0.4 +
        intervention.metrics.clientEngagement * this.ENGAGEMENT_WEIGHT +
        intervention.metrics.emotionalImpact * this.EMOTIONAL_IMPACT_WEIGHT +
        intervention.metrics.longTermProgress * this.PROGRESS_WEIGHT;
      
      return sum + weightedScore;
    }, 0);

    return totalScore / relevantInterventions.length;
  }

  async recommendIntervention(
    clientId: string,
    currentContext: {
      emotionalState: number;
      engagementLevel: number;
      recentTopics: string[];
    }
  ): Promise<InterventionRecommendation[]> {
    const history = this.interventionHistory.get(clientId) || [];
    const interventionTypes = new Set(history.map(h => h.type));
    const recommendations: InterventionRecommendation[] = [];

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

  private async evaluateContextualFit(
    interventionType: string,
    context: {
      emotionalState: number;
      engagementLevel: number;
      recentTopics: string[];
    }
  ): Promise<number> {
    // Define intervention characteristics
    const interventionCharacteristics: Record<string, {
      idealEmotionalState: number;
      minEngagement: number;
      suitableTopics: string[];
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
      // Add more intervention types as needed
    };

    const characteristics = interventionCharacteristics[interventionType];
    if (!characteristics) return 0;

    // Calculate fit scores
    const emotionalFit = 1 - Math.abs(context.emotionalState - characteristics.idealEmotionalState);
    const engagementFit = context.engagementLevel >= characteristics.minEngagement ? 1 : 0;
    const topicFit = context.recentTopics.some(topic => 
      characteristics.suitableTopics.includes(topic)
    ) ? 1 : 0;

    return (emotionalFit + engagementFit + topicFit) / 3;
  }

  private async generateReasoning(
    interventionType: string,
    effectiveness: number,
    context: {
      emotionalState: number;
      engagementLevel: number;
      recentTopics: string[];
    }
  ): Promise<string[]> {
    const reasons: string[] = [];

    if (effectiveness > 0.7) {
      reasons.push(`High historical effectiveness (${Math.round(effectiveness * 100)}% success rate)`);
    }

    if (context.engagementLevel > 0.6) {
      reasons.push('Client showing strong engagement');
    }

    if (Math.abs(context.emotionalState) > 0.3) {
      reasons.push(
        context.emotionalState > 0 
          ? 'Positive emotional state supports intervention'
          : 'May help address current emotional challenges'
      );
    }

    return reasons;
  }

  private async predictOutcomes(
    interventionType: string,
    history: InterventionMetrics[]
  ): Promise<string[]> {
    const typeHistory = history.filter(h => h.type === interventionType);
    const outcomes: string[] = [];

    // Analyze engagement patterns
    const avgEngagement = typeHistory.reduce(
      (sum, h) => sum + h.metrics.clientEngagement, 
      0
    ) / typeHistory.length;

    if (avgEngagement > 0.5) {
      outcomes.push('Likely to maintain high client engagement');
    }

    // Analyze emotional impact
    const avgEmotional = typeHistory.reduce(
      (sum, h) => sum + h.metrics.emotionalImpact,
      0
    ) / typeHistory.length;

    if (avgEmotional > 0) {
      outcomes.push('Expected positive emotional impact');
    }

    // Analyze progress patterns
    const avgProgress = typeHistory.reduce(
      (sum, h) => sum + h.metrics.longTermProgress,
      0
    ) / typeHistory.length;

    if (avgProgress > 0.3) {
      outcomes.push('Contributes to long-term therapeutic progress');
    }

    return outcomes;
  }

  private async assessRisks(
    interventionType: string,
    history: InterventionMetrics[]
  ): Promise<string[]> {
    const typeHistory = history.filter(h => h.type === interventionType);
    const risks: string[] = [];

    // Check for negative engagement patterns
    const negativeEngagements = typeHistory.filter(
      h => h.metrics.clientEngagement < -0.2
    ).length;

    if (negativeEngagements / typeHistory.length > 0.2) {
      risks.push('20% risk of reduced engagement');
    }

    // Check for negative emotional impacts
    const negativeEmotional = typeHistory.filter(
      h => h.metrics.emotionalImpact < -0.3
    ).length;

    if (negativeEmotional / typeHistory.length > 0.1) {
      risks.push('Potential for temporary emotional discomfort');
    }

    // Check for progress stagnation
    const lowProgress = typeHistory.filter(
      h => h.metrics.longTermProgress < 0.1
    ).length;

    if (lowProgress / typeHistory.length > 0.3) {
      risks.push('May not contribute significantly to progress in 30% of cases');
    }

    return risks;
  }
}
