import { Message } from '../types/chat';
import { SessionState } from '../types/session';
import { Client } from '../types/client';
import { analyzeMessageHistory } from './sentimentAnalysis';
import { SessionAnalytics } from './sessionAnalytics';

interface ContextMemory {
  shortTerm: {
    recentTopics: string[];
    emotionalState: number;
    engagementLevel: number;
    lastResponses: string[];
  };
  longTerm: {
    clientHistory: {
      commonTopics: string[];
      preferredApproaches: string[];
      triggerPatterns: string[];
      successfulInterventions: string[];
    };
    therapeuticProgress: {
      goalsAchieved: string[];
      currentChallenges: string[];
      adaptationHistory: {
        approach: string;
        effectiveness: number;
        timestamp: number;
      }[];
    };
  };
}

export class ContextualLearningSystem {
  private static instance: ContextualLearningSystem;
  private sessionAnalytics: SessionAnalytics;
  private contextMemory: Map<string, ContextMemory> = new Map();

  private constructor() {
    this.sessionAnalytics = new SessionAnalytics();
  }

  static getInstance(): ContextualLearningSystem {
    if (!ContextualLearningSystem.instance) {
      ContextualLearningSystem.instance = new ContextualLearningSystem();
    }
    return ContextualLearningSystem.instance;
  }

  async updateContext(
    clientId: string,
    session: SessionState,
    messages: Message[],
    client: Client
  ): Promise<void> {
    let memory = this.contextMemory.get(clientId);
    if (!memory) {
      memory = this.initializeMemory();
      this.contextMemory.set(clientId, memory);
    }

    // Update short-term memory
    const recentMessages = messages.slice(-5);
    memory.shortTerm = {
      recentTopics: await this.sessionAnalytics.extractTopics(recentMessages),
      emotionalState: analyzeMessageHistory(recentMessages),
      engagementLevel: await this.sessionAnalytics.calculateEngagement(recentMessages),
      lastResponses: recentMessages
        .filter(m => m.role === 'assistant')
        .map(m => m.content),
    };

    // Update long-term memory
    const insights = await this.sessionAnalytics.generateInsights(messages, session.interventions || []);
    memory.longTerm.clientHistory.commonTopics = this.updateTopics(
      memory.longTerm.clientHistory.commonTopics,
      await this.sessionAnalytics.extractTopics(messages)
    );
    
    // Update therapeutic progress
    const sessionMetrics = await this.sessionAnalytics.getSessionMetrics(session.id);
    memory.longTerm.therapeuticProgress.adaptationHistory.push({
      approach: session.mode,
      effectiveness: sessionMetrics.effectiveness || 0,
      timestamp: Date.now(),
    });
  }

  private initializeMemory(): ContextMemory {
    return {
      shortTerm: {
        recentTopics: [],
        emotionalState: 0,
        engagementLevel: 0,
        lastResponses: [],
      },
      longTerm: {
        clientHistory: {
          commonTopics: [],
          preferredApproaches: [],
          triggerPatterns: [],
          successfulInterventions: [],
        },
        therapeuticProgress: {
          goalsAchieved: [],
          currentChallenges: [],
          adaptationHistory: [],
        },
      },
    };
  }

  private updateTopics(existing: string[], new_topics: string[]): string[] {
    const topicFrequency = new Map<string, number>();
    
    // Count existing topics
    existing.forEach(topic => {
      topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
    });
    
    // Add new topics
    new_topics.forEach(topic => {
      topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
    });
    
    // Sort by frequency and take top 10
    return Array.from(topicFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic);
  }

  async getContextualResponse(
    clientId: string,
    currentMessage: string
  ): Promise<{
    contextualHints: string[];
    suggestedApproaches: string[];
    relevantHistory: string[];
  }> {
    const memory = this.contextMemory.get(clientId);
    if (!memory) {
      return {
        contextualHints: [],
        suggestedApproaches: [],
        relevantHistory: [],
      };
    }

    // Analyze current context against memory
    const contextualHints = this.generateContextualHints(memory, currentMessage);
    const suggestedApproaches = this.suggestApproaches(memory);
    const relevantHistory = this.findRelevantHistory(memory, currentMessage);

    return {
      contextualHints,
      suggestedApproaches,
      relevantHistory,
    };
  }

  private generateContextualHints(memory: ContextMemory, currentMessage: string): string[] {
    const hints: string[] = [];
    
    // Add emotional state context
    if (memory.shortTerm.emotionalState < -0.3) {
      hints.push('Client showing signs of distress');
    } else if (memory.shortTerm.emotionalState > 0.3) {
      hints.push('Client showing positive engagement');
    }
    
    // Add engagement context
    if (memory.shortTerm.engagementLevel < 0.5) {
      hints.push('Low engagement detected');
    }
    
    // Add topic continuity hints
    const topicOverlap = memory.shortTerm.recentTopics.filter(topic =>
      memory.longTerm.clientHistory.commonTopics.includes(topic)
    );
    if (topicOverlap.length > 0) {
      hints.push(`Recurring topics: ${topicOverlap.join(', ')}`);
    }

    return hints;
  }

  private suggestApproaches(memory: ContextMemory): string[] {
    // Analyze adaptation history to find most effective approaches
    const approachEffectiveness = new Map<string, number>();
    let totalEntries = 0;
    
    memory.longTerm.therapeuticProgress.adaptationHistory.forEach(entry => {
      approachEffectiveness.set(
        entry.approach,
        (approachEffectiveness.get(entry.approach) || 0) + entry.effectiveness
      );
      totalEntries++;
    });
    
    // Convert to average effectiveness and sort
    return Array.from(approachEffectiveness.entries())
      .map(([approach, total]) => ({
        approach,
        effectiveness: total / totalEntries,
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 3)
      .map(entry => entry.approach);
  }

  private findRelevantHistory(memory: ContextMemory, currentMessage: string): string[] {
    // Simple keyword-based relevance for now
    // TODO: Implement more sophisticated semantic matching
    const keywords = currentMessage.toLowerCase().split(' ');
    return memory.longTerm.clientHistory.commonTopics.filter(topic =>
      keywords.some(keyword => topic.toLowerCase().includes(keyword))
    );
  }
}
