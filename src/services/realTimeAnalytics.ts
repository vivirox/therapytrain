import { Message } from '../types/chat';
import { ClientProfile } from '../types/ClientProfile';
import { EmotionalResponse } from '../types/emotions';

interface SentimentAnalysis {
  score: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotionalTags: string[];
}

interface BehavioralPattern {
  pattern: string;
  frequency: number;
  context: string;
  confidence: number;
  relatedTriggers: string[];
}

interface InterventionMetric {
  interventionId: string;
  effectiveness: number;
  clientResponse: string;
  emotionalImpact: number;
  timestamp: Date;
}

export class RealTimeAnalyticsService {
  private static instance: RealTimeAnalyticsService;
  private sessionPatterns: Map<string, BehavioralPattern[]>;
  private interventionMetrics: Map<string, InterventionMetric[]>;
  private emotionalTrends: Map<string, EmotionalResponse[]>;

  private constructor() {
    this.sessionPatterns = new Map();
    this.interventionMetrics = new Map();
    this.emotionalTrends = new Map();
  }

  static getInstance(): RealTimeAnalyticsService {
    if (!RealTimeAnalyticsService.instance) {
      RealTimeAnalyticsService.instance = new RealTimeAnalyticsService();
    }
    return RealTimeAnalyticsService.instance;
  }

  async analyzeSentiment(message: Message): Promise<SentimentAnalysis> {
    try {
      const response = await fetch('/api/analyze/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: message.content }),
      });

      if (!response.ok) throw new Error('Sentiment analysis failed');
      return await response.json();
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      throw error;
    }
  }

  async detectBehavioralPatterns(
    sessionId: string,
    messages: Message[],
    clientProfile: ClientProfile
  ): Promise<BehavioralPattern[]> {
    try {
      const response = await fetch('/api/analyze/patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, clientProfile }),
      });

      if (!response.ok) throw new Error('Pattern detection failed');
      const patterns = await response.json();
      this.sessionPatterns.set(sessionId, patterns);
      return patterns;
    } catch (error) {
      console.error('Pattern detection error:', error);
      throw error;
    }
  }

  async trackIntervention(
    sessionId: string,
    intervention: InterventionMetric
  ): Promise<void> {
    const currentMetrics = this.interventionMetrics.get(sessionId) || [];
    currentMetrics.push(intervention);
    this.interventionMetrics.set(sessionId, currentMetrics);

    try {
      await fetch('/api/analytics/intervention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, intervention }),
      });
    } catch (error) {
      console.error('Intervention tracking error:', error);
      throw error;
    }
  }

  async updateEmotionalTrend(
    sessionId: string,
    emotion: EmotionalResponse
  ): Promise<void> {
    const currentTrends = this.emotionalTrends.get(sessionId) || [];
    currentTrends.push(emotion);
    this.emotionalTrends.set(sessionId, currentTrends);

    try {
      await fetch('/api/analytics/emotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, emotion }),
      });
    } catch (error) {
      console.error('Emotional trend update error:', error);
      throw error;
    }
  }

  getSessionAnalytics(sessionId: string) {
    return {
      patterns: this.sessionPatterns.get(sessionId) || [],
      interventions: this.interventionMetrics.get(sessionId) || [],
      emotionalTrends: this.emotionalTrends.get(sessionId) || [],
    };
  }
}
