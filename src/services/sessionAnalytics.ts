import { dataService } from './dataService';
import type { SessionState, SessionMode } from './sessionManager';

interface ChatMessage {
  content: string;
  timestamp: Date;
  sentiment?: number;
  role: 'user' | 'assistant';
}

export interface ExtendedSessionState extends SessionState {
  messages: Array<ChatMessage>;
  interventions: Array<{
    id: string;
    type: string;
    timestamp: Date;
    effectiveness?: number;
  }>;
}

export interface SessionMetrics {
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
  static STOP_WORDS: any;
  static RELATIONSHIP_KEYWORDS: any;
  static DEPRESSION_KEYWORDS: any;
  static ANXIETY_KEYWORDS: any;

  public static async getSessionMetrics(sessionId: string): Promise<SessionMetrics> {
    const session = await dataService.get<ExtendedSessionState>('sessions', sessionId);

    if (!session) {
      throw new Error(`Failed to fetch session metrics: Session not found`);
    }

    const messages = session.data.messages || [];
    const interventions = session.data.interventions || [];

    const duration = this.calculateDuration(session.data.startTime, session.data.endTime || new Date());
    const averageSentiment = this.calculateAverageSentiment(messages);
    const engagementScore = this.calculateEngagement(messages);
    const responseRate = this.calculateResponseRate(messages);
    const topicsCovered = this.extractTopics(messages);
    const keyInsights = this.generateInsights(messages, interventions);
    const effectiveness = this.calculateEffectiveness(interventions);
    const progressTowardsGoals = this.calculateProgressTowardsGoals(messages, interventions);

    return {
      effectiveness,
      duration,
      averageSentiment,
      engagementScore,
      interventionCount: interventions.length,
      responseRate,
      topicsCovered,
      keyInsights,
      progressTowardsGoals
    };
  }

  public static calculateEffectiveness(interventions: Array<any>): number {
    if (!interventions.length) {
      return 0;
    }

    const totalEffectiveness = interventions.reduce((sum: unknown, intervention: unknown) =>
      sum + (intervention.effectiveness || 0), 0);

    return totalEffectiveness / interventions.length;
  }

  public static calculateEngagement(messages: Array<ChatMessage>): number {
    const messageGaps = messages
      .slice(1)
      .map((m, i) => new Date(m.timestamp).getTime() -
        new Date(messages[i].timestamp).getTime());

    const averageGap = messageGaps.reduce((a, b) => a + b, 0) /
      (messageGaps.length || 1);

    return Math.min(1, Math.max(0, 1 - (averageGap / 300_000))); // 5 min max gap
  }

  public static calculateAverageSentiment(messages: Array<ChatMessage>): number {
    const sentiments = messages
      .filter(m => m.sentiment)
      .map(m => m.sentiment);
    return sentiments.reduce((a, b) => a + b, 0) / (sentiments.length || 1);
  }

  private static calculateDuration(startTime: Date, endTime: Date): number {
    return Math.round(
      (endTime.getTime() - startTime.getTime()) / 60_000
    );
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

    messages.forEach(message => {
      const keywords = this.extractKeywords(message.content);
      const messageTopic = this.categorizeTopics(keywords);
      messageTopic.forEach(topic => topics.add(topic));
    });

    return Array.from(topics);
  }

  private static extractKeywords(text: string): Array<string> {
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
    return cleanText.split(' ')
      .filter(word => !SessionAnalytics.STOP_WORDS.includes(word));
  }

  private static categorizeTopics(keywords: Array<string>): Array<string> {
    const topics: Array<string> = [];

    keywords.forEach(keyword => {
      if (SessionAnalytics.ANXIETY_KEYWORDS.includes(keyword)) {
        topics.push('anxiety');
      }
      if (SessionAnalytics.DEPRESSION_KEYWORDS.includes(keyword)) {
        topics.push('depression');
      }
      if (SessionAnalytics.RELATIONSHIP_KEYWORDS.includes(keyword)) {
        topics.push('relationships');
      }
    });
    return [...new Set(topics)];
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

    const avgUserResponse = responseTimes
      .filter(r => r.role === 'user')
      .reduce((sum, r) => sum + r.gap, 0) /
      (responseTimes.filter(r => r.role === 'user').length || 1);

    if (avgUserResponse < 30_000) {
      return "Quick response patterns indicate high engagement";
    } else if (avgUserResponse > 120_000) {
      return "Longer response times suggest deeper reflection";
    }
    return null;
  }

  private static analyzeInterventions(interventions: Array<any>): string | null {
    if (interventions.length === 0) {
      return null;
    }

    const effectiveInterventions = interventions
      .filter(i: unknown => i.effectiveness > 0.7)
      .length;

    const effectiveness = effectiveInterventions / interventions.length;

    if (effectiveness > 0.8) {
      return "High intervention effectiveness rate";
    } else if (effectiveness < 0.4) {
      return "Lower intervention effectiveness, consider adjusting approach";
    }
    return null;
  }

  private static analyzeEmotionalProgression(messages: Array<ChatMessage>): string | null {
    const sentiments = messages
      .filter(m => m.sentiment !== undefined)
      .map(m => m.sentiment);

    if (sentiments.length < 2) {
      return null;
    }

    const start = sentiments.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const end = sentiments.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const change = end - start;

    if (change > 0.5) {
      return "Significant positive emotional progression";
    } else if (change < -0.5) {
      return "Notable emotional challenges identified";
    }
    return null;
  }
}
