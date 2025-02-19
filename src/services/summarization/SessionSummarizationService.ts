import { singleton } from 'tsyringe';
import { dataService } from '@/lib/data';
import { NLPService } from '../nlp/NLPService';
import { QualityMetricsService } from '../QualityMetricsService';
import { SessionAnalytics } from '../sessionAnalytics';

interface SessionSummary {
  overview: {
    duration: number;
    participantCount: number;
    topicsCovered: string[];
    mainThemes: string[];
  };
  analysis: {
    therapeuticProgress: {
      goalsAddressed: string[];
      achievements: string[];
      challenges: string[];
      insights: string[];
    };
    clientEngagement: {
      participationLevel: number;
      responsiveness: number;
      emotionalInvolvement: number;
      keyPatterns: string[];
    };
    interventions: {
      applied: string[];
      effectiveness: Record<string, number>;
      recommendations: string[];
    };
  };
  keyPoints: {
    majorBreakthroughs: string[];
    criticalInsights: string[];
    emergingPatterns: string[];
    riskFactors: string[];
  };
  narrative: {
    sessionFlow: string;
    significantMoments: string[];
    therapeuticDevelopment: string;
    futureConsiderations: string[];
  };
  metrics: {
    effectiveness: number;
    progress: number;
    alignment: number;
    riskLevel: number;
  };
}

@singleton()
export class SessionSummarizationService {
  private static instance: SessionSummarizationService;
  private nlpService: NLPService;
  private qualityMetricsService: QualityMetricsService;

  constructor() {
    this.nlpService = NLPService.getInstance();
    this.qualityMetricsService = QualityMetricsService.getInstance();
  }

  public static getInstance(): SessionSummarizationService {
    if (!SessionSummarizationService.instance) {
      SessionSummarizationService.instance = new SessionSummarizationService();
    }
    return SessionSummarizationService.instance;
  }

  public async generateComprehensiveSummary(sessionId: string): Promise<SessionSummary> {
    try {
      // Get session data
      const session = await this.getSessionData(sessionId);
      
      // Get quality metrics
      const metrics = await this.qualityMetricsService.getComprehensiveMetrics(sessionId);
      
      // Generate session overview
      const overview = await this.generateOverview(session);
      
      // Perform comprehensive analysis
      const analysis = await this.performAnalysis(session, metrics);
      
      // Extract key points
      const keyPoints = await this.extractKeyPoints(session, metrics);
      
      // Generate narrative
      const narrative = await this.generateNarrative(session, analysis, keyPoints);

      return {
        overview,
        analysis,
        keyPoints,
        narrative,
        metrics: {
          effectiveness: metrics.scores.overall,
          progress: metrics.scores.categoryScores.therapeuticProgress,
          alignment: metrics.scores.categoryScores.goalAlignment,
          riskLevel: await this.calculateRiskLevel(session, metrics)
        }
      };
    } catch (error) {
      console.error('Error generating comprehensive summary:', error);
      throw error;
    }
  }

  private async getSessionData(sessionId: string): Promise<any> {
    return await dataService.get('sessions', {
      where: { id: sessionId },
      include: ['messages', 'interventions', 'goals', 'metrics']
    });
  }

  private async generateOverview(session: any): Promise<SessionSummary['overview']> {
    const messages = session.messages || [];
    const content = messages.map(m => m.content).join(' ');
    
    // Analyze content for topics and themes
    const analysis = await this.nlpService.analyzeTherapeuticContent(content);
    
    return {
      duration: this.calculateDuration(session),
      participantCount: this.getParticipantCount(session),
      topicsCovered: analysis.techniques,
      mainThemes: await this.extractMainThemes(content)
    };
  }

  private async performAnalysis(session: any, metrics: any): Promise<SessionSummary['analysis']> {
    const messages = session.messages || [];
    const interventions = session.interventions || [];
    
    return {
      therapeuticProgress: await this.analyzeTherapeuticProgress(session, metrics),
      clientEngagement: await this.analyzeClientEngagement(messages, metrics),
      interventions: await this.analyzeInterventions(interventions, metrics)
    };
  }

  private async extractKeyPoints(session: any, metrics: any): Promise<SessionSummary['keyPoints']> {
    const messages = session.messages || [];
    const content = messages.map(m => m.content).join(' ');
    
    // Analyze for breakthroughs and insights
    const therapeuticAnalysis = await this.nlpService.analyzeTherapeuticContent(content);
    const riskAnalysis = await this.nlpService.analyzeRiskIndicators(content);
    
    return {
      majorBreakthroughs: await this.identifyBreakthroughs(messages, metrics),
      criticalInsights: await this.extractCriticalInsights(messages, therapeuticAnalysis),
      emergingPatterns: await this.identifyPatterns(messages, metrics),
      riskFactors: riskAnalysis.riskTypes
    };
  }

  private async generateNarrative(
    session: any,
    analysis: SessionSummary['analysis'],
    keyPoints: SessionSummary['keyPoints']
  ): Promise<SessionSummary['narrative']> {
    const messages = session.messages || [];
    const phases = await this.analyzeSessionPhases(messages);
    const emotionalJourney = await this.analyzeEmotionalPatterns(messages);
    const breakthroughs = await this.identifyBreakthroughs(messages, analysis);
    
    const narrativeFlow = await this.constructNarrativeFlow(phases, emotionalJourney);
    const significantMoments = await this.identifySignificantMoments(session, keyPoints, breakthroughs);
    const therapeuticDev = await this.constructTherapeuticNarrative(session, analysis, phases);
    const considerations = await this.generateFutureConsiderations(session, analysis, keyPoints);

    return {
      sessionFlow: narrativeFlow,
      significantMoments,
      therapeuticDevelopment: therapeuticDev,
      futureConsiderations: considerations
    };
  }

  private async analyzeSessionPhases(messages: any[]): Promise<Array<{
    phase: string;
    content: string;
    significance: number;
  }>> {
    const phases: Array<{phase: string; content: string; significance: number}> = [];
    const totalMessages = messages.length;
    
    let currentPhase = '';
    let phaseContent: string[] = [];
    let significance = 0;
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const progress = i / totalMessages;
      const newPhase = this.determineSessionPhase(message, i, totalMessages);
      
      if (newPhase !== currentPhase) {
        if (currentPhase) {
          phases.push({
            phase: currentPhase,
            content: phaseContent.join('\n'),
            significance
          });
        }
        currentPhase = newPhase;
        phaseContent = [];
        significance = 0;
      }
      
      phaseContent.push(message.content);
      
      // Calculate significance based on emotional intensity and therapeutic relevance
      const emotionalIntensity = message.sentiment ? Math.abs(message.sentiment) : 0;
      const therapeuticRelevance = await this.assessTherapeuticRelevance(message);
      significance = Math.max(significance, (emotionalIntensity + therapeuticRelevance) / 2);
    }
    
    // Add the last phase
    if (currentPhase && phaseContent.length > 0) {
      phases.push({
        phase: currentPhase,
        content: phaseContent.join('\n'),
        significance
      });
    }
    
    return phases;
  }

  private async constructNarrativeFlow(
    phases: Array<{phase: string; content: string; significance: number}>,
    emotionalJourney: string | null
  ): Promise<string> {
    const narrativePoints: string[] = [];
    
    // Add session structure
    narrativePoints.push('Session Structure:');
    phases.forEach(phase => {
      if (phase.significance > 0.7) {
        narrativePoints.push(`${phase.phase} (High Significance): Key therapeutic work conducted`);
      } else if (phase.significance > 0.4) {
        narrativePoints.push(`${phase.phase}: Standard therapeutic progression`);
      } else {
        narrativePoints.push(`${phase.phase}: Foundational work and rapport building`);
      }
    });
    
    // Add emotional journey if available
    if (emotionalJourney) {
      narrativePoints.push('\nEmotional Progression:');
      narrativePoints.push(emotionalJourney);
    }
    
    return narrativePoints.join('\n');
  }

  private async assessTherapeuticRelevance(message: any): Promise<number> {
    const content = message.content;
    const analysis = await this.nlpService.analyzeTherapeuticContent(content);
    
    return (
      analysis.therapeuticRelevance || 
      analysis.effectiveness || 
      0
    );
  }

  private async identifySignificantMoments(
    session: any,
    keyPoints: SessionSummary['keyPoints'],
    breakthroughs: string[]
  ): Promise<string[]> {
    const moments: string[] = [];
    const messages = session.messages || [];
    
    // Add breakthroughs
    moments.push(...breakthroughs);
    
    // Add critical insights
    moments.push(...keyPoints.criticalInsights);
    
    // Add emotional shifts
    const emotionalShifts = await this.identifyEmotionalShifts(messages);
    moments.push(...emotionalShifts);
    
    // Add intervention moments
    const interventionMoments = await this.identifyKeyInterventions(session);
    moments.push(...interventionMoments);
    
    // Add risk-related moments
    if (keyPoints.riskFactors.length > 0) {
      moments.push(`Risk factors identified: ${keyPoints.riskFactors.join(', ')}`);
    }
    
    return moments;
  }

  private async identifyEmotionalShifts(messages: any[]): Promise<string[]> {
    const shifts: string[] = [];
    const windowSize = 3;
    
    for (let i = windowSize; i < messages.length; i++) {
      const previousWindow = messages.slice(i - windowSize, i);
      const currentMessage = messages[i];
      
      const prevSentiment = previousWindow.reduce((sum, m) => sum + (m.sentiment || 0), 0) / windowSize;
      const currentSentiment = currentMessage.sentiment || 0;
      
      const sentimentChange = currentSentiment - prevSentiment;
      
      if (Math.abs(sentimentChange) > 0.5) {
        const direction = sentimentChange > 0 ? 'positive' : 'negative';
        shifts.push(`Significant ${direction} emotional shift detected`);
      }
    }
    
    return shifts;
  }

  private async identifyKeyInterventions(session: any): Promise<string[]> {
    const interventions = session.interventions || [];
    const keyMoments: string[] = [];
    
    for (const intervention of interventions) {
      if (intervention.effectiveness > 0.8) {
        keyMoments.push(`Highly effective intervention: ${intervention.type}`);
      } else if (intervention.effectiveness < 0.3) {
        keyMoments.push(`Challenging intervention requiring adjustment: ${intervention.type}`);
      }
    }
    
    return keyMoments;
  }

  private async constructTherapeuticNarrative(
    session: any,
    analysis: SessionSummary['analysis'],
    phases: Array<{phase: string; content: string; significance: number}>
  ): Promise<string> {
    const narrativePoints: string[] = [];
    
    // Add session overview
    narrativePoints.push(`Session focused on ${analysis.therapeuticProgress.goalsAddressed.join(', ')}`);
    
    // Add phase progression
    const significantPhases = phases.filter(p => p.significance > 0.6);
    if (significantPhases.length > 0) {
      narrativePoints.push('\nKey Therapeutic Developments:');
      significantPhases.forEach(phase => {
        narrativePoints.push(`- During ${phase.phase}: Significant therapeutic work conducted`);
      });
    }
    
    // Add achievements
    if (analysis.therapeuticProgress.achievements.length > 0) {
      narrativePoints.push('\nKey Achievements:');
      narrativePoints.push(analysis.therapeuticProgress.achievements.map(a => `- ${a}`).join('\n'));
    }
    
    // Add challenges and how they were addressed
    if (analysis.therapeuticProgress.challenges.length > 0) {
      narrativePoints.push('\nChallenges Addressed:');
      narrativePoints.push(analysis.therapeuticProgress.challenges.map(c => `- ${c}`).join('\n'));
    }
    
    // Add intervention effectiveness
    const effectiveInterventions = Object.entries(analysis.interventions.effectiveness)
      .filter(([_, score]) => score > 0.7)
      .map(([type]) => type);
    if (effectiveInterventions.length > 0) {
      narrativePoints.push('\nEffective Interventions:');
      narrativePoints.push(effectiveInterventions.map(i => `- ${i}`).join('\n'));
    }
    
    return narrativePoints.join('\n');
  }

  private calculateDuration(session: any): number {
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    return (end.getTime() - start.getTime()) / 1000; // Duration in seconds
  }

  private getParticipantCount(session: any): number {
    const participants = new Set(session.messages.map((m: any) => m.userId));
    return participants.size;
  }

  private async extractMainThemes(content: string): Promise<string[]> {
    const analysis = await this.nlpService.analyzeTherapeuticContent(content);
    return analysis.techniques.slice(0, 5); // Top 5 main themes
  }

  private async analyzeTherapeuticProgress(session: any, metrics: any): Promise<SessionSummary['analysis']['therapeuticProgress']> {
    const goals = session.goals || [];
    const messages = session.messages || [];
    
    return {
      goalsAddressed: goals.map(g => g.description),
      achievements: await this.identifyAchievements(session, metrics),
      challenges: await this.identifyChallenges(session, metrics),
      insights: await this.generateTherapeuticInsights(messages, metrics)
    };
  }

  private async analyzeClientEngagement(messages: any[], metrics: any): Promise<SessionSummary['analysis']['clientEngagement']> {
    const engagement = await SessionAnalytics.calculateEngagement(messages);
    
    return {
      participationLevel: engagement.participation,
      responsiveness: engagement.responsiveness,
      emotionalInvolvement: engagement.emotional,
      keyPatterns: await this.identifyEngagementPatterns(messages)
    };
  }

  private async analyzeInterventions(interventions: any[], metrics: any): Promise<SessionSummary['analysis']['interventions']> {
    const effectiveness: Record<string, number> = {};
    interventions.forEach(i => {
      effectiveness[i.type] = effectiveness[i.type] 
        ? (effectiveness[i.type] + i.effectiveness) / 2 
        : i.effectiveness;
    });
    
    return {
      applied: interventions.map(i => i.type),
      effectiveness,
      recommendations: await this.generateInterventionRecommendations(interventions, metrics)
    };
  }

  private async identifyBreakthroughs(messages: any[], metrics: any): Promise<string[]> {
    const breakthroughs: string[] = [];
    const content = messages.map(m => m.content).join(' ');
    
    const analysis = await this.nlpService.analyzeTherapeuticContent(content);
    if (analysis.effectiveness > 0.8) {
      breakthroughs.push('High therapeutic effectiveness achieved');
    }
    
    // Add other breakthrough identification logic
    return breakthroughs;
  }

  private async extractCriticalInsights(messages: any[], analysis: any): Promise<string[]> {
    const insights: string[] = [];
    messages.forEach(m => {
      if (m.sentiment > 0.8 || m.sentiment < 0.2) {
        insights.push(`Strong emotional response: ${m.content.substring(0, 100)}...`);
      }
    });
    
    return insights;
  }

  private async identifyPatterns(messages: any[], metrics: any): Promise<string[]> {
    const patterns: string[] = [];
    
    // Analyze response patterns
    const responsePatterns = await this.analyzeResponsePatterns(messages);
    if (responsePatterns) {
      patterns.push(responsePatterns);
    }
    
    // Analyze emotional patterns
    const emotionalPatterns = await this.analyzeEmotionalPatterns(messages);
    if (emotionalPatterns) {
      patterns.push(emotionalPatterns);
    }
    
    return patterns;
  }

  private async constructSessionFlow(session: any): Promise<string> {
    const messages = session.messages || [];
    const flow: string[] = [];
    
    let currentPhase = '';
    messages.forEach((m: any, i: number) => {
      const phase = this.determineSessionPhase(m, i, messages.length);
      if (phase !== currentPhase) {
        flow.push(`${phase}: ${m.content.substring(0, 100)}...`);
        currentPhase = phase;
      }
    });
    
    return flow.join('\n');
  }

  private async generateFutureConsiderations(
    session: any,
    analysis: SessionSummary['analysis'],
    keyPoints: SessionSummary['keyPoints']
  ): Promise<string[]> {
    const considerations: string[] = [];
    
    // Add recommendations based on challenges
    analysis.therapeuticProgress.challenges.forEach(challenge => {
      considerations.push(`Address ongoing challenge: ${challenge}`);
    });
    
    // Add intervention-based recommendations
    considerations.push(...analysis.interventions.recommendations);
    
    // Add risk-based considerations
    keyPoints.riskFactors.forEach(risk => {
      considerations.push(`Monitor and address risk factor: ${risk}`);
    });
    
    return considerations;
  }

  private async calculateRiskLevel(session: any, metrics: any): Promise<number> {
    const messages = session.messages || [];
    const content = messages.map(m => m.content).join(' ');
    
    const riskAnalysis = await this.nlpService.analyzeRiskIndicators(content);
    return riskAnalysis.riskLevel;
  }

  private determineSessionPhase(message: any, index: number, total: number): string {
    const progress = index / total;
    
    if (progress < 0.2) return 'Opening';
    if (progress < 0.4) return 'Assessment';
    if (progress < 0.7) return 'Intervention';
    if (progress < 0.9) return 'Integration';
    return 'Closing';
  }

  private async analyzeResponsePatterns(messages: any[]): Promise<string | null> {
    const responseTimes = messages
      .slice(1)
      .map((m, i) => ({
        gap: new Date(m.timestamp).getTime() - new Date(messages[i].timestamp).getTime(),
        role: m.role
      }));
    
    const avgUserResponse = responseTimes
      .filter(r => r.role === 'user')
      .reduce((sum, r) => sum + r.gap, 0) / 
      (responseTimes.filter(r => r.role === 'user').length || 1);
    
    if (avgUserResponse < 30000) {
      return "Quick response patterns indicate high engagement";
    } else if (avgUserResponse > 120000) {
      return "Longer response times suggest deeper reflection";
    }
    
    return null;
  }

  private async analyzeEmotionalPatterns(messages: any[]): Promise<string | null> {
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

  private async identifyAchievements(session: any, metrics: any): Promise<string[]> {
    const achievements: string[] = [];
    
    // Add goal-based achievements
    session.goals?.forEach((goal: any) => {
      if (goal.progress > 0.8) {
        achievements.push(`Significant progress on: ${goal.description}`);
      }
    });
    
    // Add metrics-based achievements
    if (metrics.scores.categoryScores.therapeuticProgress > 0.8) {
      achievements.push('Strong therapeutic progress demonstrated');
    }
    if (metrics.scores.categoryScores.clientEngagement > 0.8) {
      achievements.push('High level of client engagement achieved');
    }
    
    return achievements;
  }

  private async identifyChallenges(session: any, metrics: any): Promise<string[]> {
    const challenges: string[] = [];
    
    // Add goal-based challenges
    session.goals?.forEach((goal: any) => {
      if (goal.progress < 0.3) {
        challenges.push(`Limited progress on: ${goal.description}`);
      }
    });
    
    // Add metrics-based challenges
    if (metrics.scores.categoryScores.therapeuticProgress < 0.5) {
      challenges.push('Therapeutic progress needs attention');
    }
    if (metrics.scores.categoryScores.clientEngagement < 0.5) {
      challenges.push('Client engagement could be improved');
    }
    
    return challenges;
  }

  private async generateTherapeuticInsights(messages: any[], metrics: any): Promise<string[]> {
    const insights: string[] = [];
    const content = messages.map(m => m.content).join(' ');
    
    const analysis = await this.nlpService.analyzeTherapeuticContent(content);
    insights.push(...analysis.recommendations);
    
    return insights;
  }

  private async identifyEngagementPatterns(messages: any[]): Promise<string[]> {
    const patterns: string[] = [];
    
    // Analyze response timing
    const responsePattern = await this.analyzeResponsePatterns(messages);
    if (responsePattern) {
      patterns.push(responsePattern);
    }
    
    // Analyze emotional engagement
    const emotionalPattern = await this.analyzeEmotionalPatterns(messages);
    if (emotionalPattern) {
      patterns.push(emotionalPattern);
    }
    
    return patterns;
  }

  private async generateInterventionRecommendations(interventions: any[], metrics: any): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Analyze intervention effectiveness
    const effectiveTypes = Object.entries(interventions.reduce((acc: any, i: any) => {
      acc[i.type] = acc[i.type] ? (acc[i.type] + i.effectiveness) / 2 : i.effectiveness;
      return acc;
    }, {}));
    
    // Generate recommendations based on effectiveness
    effectiveTypes.forEach(([type, effectiveness]) => {
      if (effectiveness > 0.8) {
        recommendations.push(`Continue using ${type} interventions`);
      } else if (effectiveness < 0.5) {
        recommendations.push(`Review and adapt ${type} intervention approach`);
      }
    });
    
    return recommendations;
  }
} 