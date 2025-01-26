import fetch from 'node-fetch';

export interface InterventionMetric {
  id: string;
  sessionId: string;
  type: string;
  timestamp: Date;
  immediateResponse: number; // -1 to 1
  longTermImpact: number; // -1 to 1
  clientEngagement: number; // 0 to 1
  followThroughRate: number; // 0 to 1
  adaptationScore: number; // 0 to 1
  contextualRelevance: number; // 0 to 1
}

export interface EffectivenessScore {
  overall: number;
  components: {
    immediateImpact: number;
    sustainedEffect: number;
    clientReceptiveness: number;
    implementationSuccess: number;
  };
  trends: {
    timeOfDay: Record<string, number>;
    byType: Record<string, number>;
    byContext: Record<string, number>;
  };
  recommendations: Array<string>;
}

class InterventionMetrics {
  static async trackIntervention(
    sessionId: string,
    type: string,
    context: Record<string, any>
  ): Promise<string> {
    try {
      const response = await fetch('/api/interventions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          type,
          context,
          timestamp: new Date().toISOString()
        })
      });
      if (!response.ok) {
        throw new Error('Failed to track intervention');
      }
      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Error tracking intervention:', error);
      throw error;
    }
  }

  static async updateEffectiveness(
    interventionId: string,
    metrics: Partial<InterventionMetric>
  ): Promise<void> {
    try {
      const response = await fetch(`/api/interventions/${interventionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics)
      });
      if (!response.ok) {
        throw new Error('Failed to update effectiveness');
      }
    } catch (error) {
      console.error('Error updating effectiveness:', error);
      throw error;
    }
  }

  static async calculateEffectiveness(
    sessionId: string,
    timeframe: 'session' | 'day' | 'week' | 'month' = 'session'
  ): Promise<EffectivenessScore> {
    // Fetch interventions for the specified timeframe
    const interventions = await getInterventions(sessionId);

    // Calculate component scores
    const immediateImpact = this.calculateImmediateImpact(interventions);
    const sustainedEffect = await this.calculateSustainedEffect(interventions);
    const clientReceptiveness = this.calculateClientReceptiveness(interventions);
    const implementationSuccess = this.calculateImplementationSuccess(interventions);

    // Calculate trends
    const timeOfDayTrends = this.analyzeTimeOfDayEffectiveness(interventions);
    const typeTrends = this.analyzeTypeEffectiveness(interventions);
    const contextTrends = this.analyzeContextEffectiveness(interventions);

    // Generate overall score
    const overall = this.calculateOverallScore({
      immediateImpact,
      sustainedEffect,
      clientReceptiveness,
      implementationSuccess
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      overall,
      timeOfDayTrends,
      typeTrends,
      contextTrends
    });

    return {
      overall,
      components: {
        immediateImpact,
        sustainedEffect,
        clientReceptiveness,
        implementationSuccess
      },
      trends: {
        timeOfDay: timeOfDayTrends,
        byType: typeTrends,
        byContext: contextTrends
      },
      recommendations
    };
  }

  private static async getClientId(sessionId: string): Promise<string> {
    const response = await fetch(`/api/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to get client ID');
    }
    const data = await response.json();
    return data.client_id;
  }

  private static getTimeframeStart(timeframe: string): string {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      default:
        return new Date(0).toISOString(); // Beginning of time
    }
  }

  private static calculateImmediateImpact(interventions: Array<any>): number {
    const weights = {
      immediateResponse: 0.6,
      contextualRelevance: 0.4
    };

    return interventions.reduce((sum, intervention) => {
      const immediateScore =
        (intervention.immediate_response + 1) / 2; // Convert -1:1 to 0:1
      const contextScore = intervention.contextual_relevance;

      return sum + (
        immediateScore * weights.immediateResponse +
        contextScore * weights.contextualRelevance
      );
    }, 0) / (interventions.length || 1);
  }

  private static async calculateSustainedEffect(interventions: Array<any>): Promise<number> {
    const followUpScores = await Promise.all(
      interventions.map(async (intervention) => {
        // Get subsequent session metrics
        const nextSession = await getNextSession(intervention.sessions.client_id);

        if (!nextSession) {
          return 0;
        }

        // Compare metrics before and after intervention
        const prevMetrics = intervention.sessions.metrics;
        const nextMetrics = nextSession.metrics;

        return this.calculateMetricImprovement(prevMetrics, nextMetrics);
      })
    );

    return followUpScores.reduce((sum, score) => sum + score, 0) /
      (followUpScores.length || 1);
  }

  private static calculateClientReceptiveness(interventions: Array<any>): number {
    return interventions.reduce((sum, intervention) =>
      sum + intervention.client_engagement, 0) / (interventions.length || 1);
  }

  private static calculateImplementationSuccess(interventions: Array<any>): number {
    const weights = {
      followThrough: 0.7,
      adaptation: 0.3
    };

    return interventions.reduce((sum, intervention) => {
      const followThroughScore = intervention.follow_through_rate;
      const adaptationScore = intervention.adaptation_score;

      return sum + (
        followThroughScore * weights.followThrough +
        adaptationScore * weights.adaptation
      );
    }, 0) / (interventions.length || 1);
  }

  private static calculateOverallScore(components: Record<string, number>): number {
    const weights = {
      immediateImpact: 0.3,
      sustainedEffect: 0.3,
      clientReceptiveness: 0.2,
      implementationSuccess: 0.2
    };

    return Object.entries(components).reduce(
      (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
      0
    );
  }

  private static analyzeTimeOfDayEffectiveness(interventions: Array<any>): Record<string, number> {
    const hourlyScores: Record<string, { sum: number; count: number }> = {};

    interventions.forEach(intervention => {
      const hour = new Date(intervention.timestamp).getHours();
      const score = intervention.immediate_response;

      if (!hourlyScores[hour]) {
        hourlyScores[hour] = { sum: 0, count: 0 };
      }
      hourlyScores[hour].sum += score;
      hourlyScores[hour].count++;
    });

    return Object.entries(hourlyScores).reduce(
      (acc, [hour, { sum, count }]) => ({
        ...acc,
        [hour]: sum / count
      }),
      {}
    );
  }

  private static analyzeTypeEffectiveness(interventions: Array<any>): Record<string, number> {
    const typeScores: Record<string, { sum: number; count: number }> = {};

    interventions.forEach(intervention => {
      const {type} = intervention;
      const score = intervention.immediate_response;

      if (!typeScores[type]) {
        typeScores[type] = { sum: 0, count: 0 };
      }
      typeScores[type].sum += score;
      typeScores[type].count++;
    });

    return Object.entries(typeScores).reduce(
      (acc, [type, { sum, count }]) => ({
        ...acc,
        [type]: sum / count
      }),
      {}
    );
  }

  private static analyzeContextEffectiveness(interventions: Array<any>): Record<string, number> {
    const contextScores: Record<string, { sum: number; count: number }> = {};

    interventions.forEach(intervention => {
      const context = JSON.stringify(intervention.context);
      const score = intervention.immediate_response;

      if (!contextScores[context]) {
        contextScores[context] = { sum: 0, count: 0 };
      }
      contextScores[context].sum += score;
      contextScores[context].count++;
    });

    return Object.entries(contextScores).reduce(
      (acc, [context, { sum, count }]) => ({
        ...acc,
        [context]: sum / count
      }),
      {}
    );
  }

  private static calculateMetricImprovement(
    prevMetrics: any,
    nextMetrics: any
  ): number {
    const metrics = ['sentiment', 'engagement', 'progress'];
    const improvements = metrics.map(metric =>
      (nextMetrics[metric] - prevMetrics[metric]) / Math.abs(prevMetrics[metric] || 1)
    );

    return improvements.reduce((sum, imp) => sum + imp, 0) / metrics.length;
  }

  private static generateRecommendations(data: {
    overall: number;
    timeOfDayTrends: Record<string, number>;
    typeTrends: Record<string, number>;
    contextTrends: Record<string, number>;
  }): Array<string> {
    const recommendations: Array<string> = [];

    // Overall effectiveness recommendations
    if (data.overall < 0.4) {
      recommendations.push(
        "Consider revising intervention strategies based on client feedback"
      );
    }

    // Time-based recommendations
    const bestHours = Object.entries(data.timeOfDayTrends)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([hour]) => hour);

    recommendations.push(
      `Interventions are most effective during ${bestHours.join(":00 and ")}:00`
    );

    // Type-based recommendations
    const [bestType] = Object.entries(data.typeTrends)
      .sort(([, a], [, b]) => b - a);

    if (bestType) {
      recommendations.push(
        `"${bestType[0]}" interventions show highest effectiveness`
      );
    }

    return recommendations;
  }
}

async function getInterventionMetrics(clientId: string) {
  try {
    const response = await fetch(`/api/interventions/${clientId}/metrics`);
    if (!response.ok) {
      throw new Error('Failed to fetch intervention metrics');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching intervention metrics:', error);
    throw error;
  }
}

async function updateInterventionMetrics(clientId: string, metrics: any) {
  try {
    const response = await fetch(`/api/interventions/${clientId}/metrics`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics)
    });
    if (!response.ok) {
      throw new Error('Failed to update intervention metrics');
    }
  } catch (error) {
    console.error('Error updating intervention metrics:', error);
    throw error;
  }
}

async function getInterventions(clientId: string) {
  try {
    const response = await fetch(`/api/interventions/${clientId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch interventions');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching interventions:', error);
    throw error;
  }
}

async function getNextSession(clientId: string) {
  try {
    const response = await fetch(`/api/sessions/${clientId}/next`);
    if (!response.ok) {
      throw new Error('Failed to fetch next session');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching next session:', error);
    throw error;
  }
}

export default InterventionMetrics;
