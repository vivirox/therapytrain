import { supabase } from '@/integrations/supabase/client';
import type { SessionState } from './sessionManager';

export interface SessionMetrics {
  duration: number;
  averageSentiment: number;
  engagementScore: number;
  interventionCount: number;
  responseRate: number;
  topicsCovered: string[];
  keyInsights: string[];
}

class SessionAnalytics {
  static async getSessionMetrics(sessionId: string): Promise<SessionMetrics> {
    const { data: session, error } = await supabase
      .from('therapy_sessions')
      .select(`
        *,
        messages:session_messages(content, timestamp, role),
        interventions:session_interventions(type, timestamp, effectiveness)
      `)
      .eq('id', sessionId)
      .single();

    if (error) throw new Error(`Failed to fetch session metrics: ${error.message}`);

    const messages = session.messages || [];
    const interventions = session.interventions || [];
    
    const duration = this.calculateDuration(session.start_time, session.end_time);
    const averageSentiment = this.calculateAverageSentiment(messages);
    const engagementScore = this.calculateEngagement(messages);
    const responseRate = this.calculateResponseRate(messages);
    const topicsCovered = this.extractTopics(messages);
    const keyInsights = this.generateInsights(messages, interventions);

    return {
      duration,
      averageSentiment,
      engagementScore,
      interventionCount: interventions.length,
      responseRate,
      topicsCovered,
      keyInsights
    };
  }

  private static calculateDuration(startTime: string, endTime: string): number {
    return Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
    );
  }

  private static calculateAverageSentiment(messages: any[]): number {
    const sentiments = messages
      .filter(m => m.sentiment)
      .map(m => m.sentiment);
    return sentiments.reduce((a, b) => a + b, 0) / (sentiments.length || 1);
  }

  private static calculateEngagement(messages: any[]): number {
    const messageGaps = messages
      .slice(1)
      .map((m, i) => new Date(m.timestamp).getTime() - 
           new Date(messages[i].timestamp).getTime());
    
    const averageGap = messageGaps.reduce((a, b) => a + b, 0) / 
                      (messageGaps.length || 1);
    
    // Normalize to 0-1 scale (lower gaps = higher engagement)
    return Math.min(1, Math.max(0, 1 - (averageGap / 300000))); // 5 min max gap
  }

  private static calculateResponseRate(messages: any[]): number {
    const userMessages = messages.filter(m => m.role === 'user').length;
    return userMessages / (messages.length || 1);
  }

  private static extractTopics(messages: any[]): string[] {
    // Simple keyword extraction (could be enhanced with NLP)
    const text = messages.map(m => m.content).join(' ');
    const words = text.toLowerCase().split(/\W+/);
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at']);
    
    const wordFreq = words
      .filter(w => w.length > 3 && !stopWords.has(w))
      .reduce((acc: Record<string, number>, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private static generateInsights(messages: any[], interventions: any[]): string[] {
    const insights = [];
    
    // Analyze message patterns
    const responsePatterns = this.analyzeResponsePatterns(messages);
    if (responsePatterns) insights.push(responsePatterns);

    // Analyze intervention effectiveness
    const interventionInsights = this.analyzeInterventions(interventions);
    if (interventionInsights) insights.push(interventionInsights);

    // Analyze emotional progression
    const emotionalInsights = this.analyzeEmotionalProgression(messages);
    if (emotionalInsights) insights.push(emotionalInsights);

    return insights;
  }

  private static analyzeResponsePatterns(messages: any[]): string | null {
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

    if (avgUserResponse < 30000) { // 30 seconds
      return "Quick response patterns indicate high engagement";
    } else if (avgUserResponse > 120000) { // 2 minutes
      return "Longer response times suggest deeper reflection";
    }
    return null;
  }

  private static analyzeInterventions(interventions: any[]): string | null {
    if (interventions.length === 0) return null;

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

  private static analyzeEmotionalProgression(messages: any[]): string | null {
    const sentiments = messages
      .filter(m => m.sentiment !== undefined)
      .map(m => m.sentiment);

    if (sentiments.length < 2) return null;

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
