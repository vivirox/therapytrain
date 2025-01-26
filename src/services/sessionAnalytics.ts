import { Message } from 'react-hook-form';
import { dataService } from './dataService';
import type { SessionState } from './sessionManager';

export interface SessionMetrics {
  effectiveness: number;
  duration: number;
  averageSentiment: number;
  engagementScore: number;
  interventionCount: number;
  responseRate: number;
  topicsCovered: Array<string>;
  keyInsights: Array<string>;
}

export class SessionAnalytics {
  static STOP_WORDS: any;
  static RELATIONSHIP_KEYWORDS: any;
  static DEPRESSION_KEYWORDS: any;
  static ANXIETY_KEYWORDS: any;
  public static async getSessionMetrics(sessionId: string): Promise<SessionMetrics> {
    const { data: session, error } = await dataService
      .getSession(sessionId);

    if (error) {
      throw new Error(`Failed to fetch session metrics: ${error.message}`);
    }

    const messages = session.messages || [];
    const interventions = session.interventions || [];

    const duration = this.calculateDuration(session.start_time, session.end_time);
    const averageSentiment = this.calculateAverageSentiment(messages);
    const engagementScore = this.calculateEngagement(messages);
    const responseRate = this.calculateResponseRate(messages);
    const topicsCovered = this.extractTopics(messages);
    const keyInsights = this.generateInsights(messages, interventions);
    const effectiveness = this.calculateEffectiveness(interventions);

    return {
      effectiveness,
      duration,
      averageSentiment,
      engagementScore,
      interventionCount: interventions.length,
      responseRate,
      topicsCovered,
      keyInsights
    };
  }
  static calculateEffectiveness(interventions: Array<any>): number {
// sourcery skip: use-braces
    if (!interventions.length) return 0;
    
    // Calculate average effectiveness across all interventions
    const totalEffectiveness = interventions.reduce((sum, intervention) => 
        sum + (intervention.effectiveness || 0), 0);
        
    return totalEffectiveness / interventions.length;
  }
  private static calculateDuration(startTime: string, endTime: string): number {
    return Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000
    );
  }

  private static calculateAverageSentiment(messages: Array<any>): number {
    const sentiments = messages
      .filter(m => m.sentiment)
      .map(m => m.sentiment);
    return sentiments.reduce((a, b) => a + b, 0) / (sentiments.length || 1);
  }

  private static calculateEngagement(messages: Array<any>): number {
    const messageGaps = messages
      .slice(1)
      .map((m, i) => new Date(m.timestamp).getTime() -
        new Date(messages[i].timestamp).getTime());

    const averageGap = messageGaps.reduce((a, b) => a + b, 0) /
      (messageGaps.length || 1);

    // Normalize to 0-1 scale (lower gaps = higher engagement)
    return Math.min(1, Math.max(0, 1 - (averageGap / 300_000))); // 5 min max gap
  }

  private static calculateResponseRate(messages: Array<any>): number {
    const userMessages = messages.filter(m => m.role === 'user').length;
    return userMessages / (messages.length || 1);
  }

  public static extractTopics(messages: Array<Message>): Array<string> {
    const topics = new Set<string>();
  
    // Process each message to extract topics
    messages.forEach(message => {
      // Extract keywords using NLP techniques
      const keywords = this.extractKeywords(typeof message === 'string' ? message : (message as { content: string }).content);
    
      // Categorize keywords into therapy-relevant topics
      const messageTopic = this.categorizeTopics(keywords);
    
      // Add unique topics to set
      messageTopic.forEach(topic => topics.add(topic));
    });

    // Convert Set back to Array before returning
    return Array.from(topics);
  }

  private static extractKeywords(text: string): Array<string> {
    // Remove punctuation and convert to lowercase
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
    
    return cleanText.split(' ')
    .filter(word => !SessionAnalytics.STOP_WORDS.includes(word));
  }

  private static categorizeTopics(keywords: Array<string>): Array<string> {
    const topics: Array<string> = [];
  
    // Map keywords to therapy domains
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
      // Add more topic categories as needed
    });  
    return [...new Set(topics)]; // Remove duplicates
  }
  private static generateInsights(messages: Array<any>, interventions: Array<any>): Array<string> {
    const insights = [];

    // Analyze message patterns
    const responsePatterns = this.analyzeResponsePatterns(messages);
    if (responsePatterns) {
      insights.push(responsePatterns);
    }

    // Analyze intervention effectiveness
    const interventionInsights = this.analyzeInterventions(interventions);
    if (interventionInsights) {
      insights.push(interventionInsights);
    }

    // Analyze emotional progression
    const emotionalInsights = this.analyzeEmotionalProgression(messages);
    if (emotionalInsights) {
      insights.push(emotionalInsights);
    }

    return insights;
  }

  private static analyzeResponsePatterns(messages: Array<any>): string | null {
    // Analyze response times and patterns
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

    if (avgUserResponse < 30_000) { // 30 seconds
      return "Quick response patterns indicate high engagement";
    } else if (avgUserResponse > 120_000) { // 2 minutes
      return "Longer response times suggest deeper reflection";
    }
    return null;
  }

  private static analyzeInterventions(interventions: Array<any>): string | null {
    if (interventions.length === 0) {
      return null;
    }

    const effectiveInterventions = interventions
      .filter(i => i.effectiveness > 0.7)
      .length;

    const effectiveness = effectiveInterventions / interventions.length;

    if (effectiveness > 0.8) {
      return "High intervention effectiveness rate";
    } else if (effectiveness < 0.4) {
      return "Lower intervention effectiveness, consider adjusting approach";
    }
    return null;
  }

  private static analyzeEmotionalProgression(messages: Array<any>): string | null {
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

export default SessionAnalytics;
