import 'reflect-metadata';
import { injectable, singleton } from 'tsyringe';
import { dataService } from '@/lib/data';
import { NLPService } from '../nlp/NLPService';
import { QualityMetricsService } from '../QualityMetricsService';
import { SessionAnalytics } from '../sessionAnalytics';

interface ProgressMetrics {
  overall: number;
  byCategory: {
    symptoms: number;
    functioning: number;
    relationships: number;
    coping: number;
  };
  goals: Array<{
    id: string;
    description: string;
    progress: number;
    status: 'not-started' | 'in-progress' | 'completed';
    lastUpdated: Date;
  }>;
  timeline: Array<{
    date: Date;
    score: number;
    milestone: string | null;
  }>;
}

interface TreatmentAlignment {
  overall: number;
  byComponent: {
    goals: number;
    interventions: number;
    approach: number;
    timing: number;
  };
  recommendations: string[];
}

interface ProgressReport {
  userId: string;
  metrics: ProgressMetrics;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

@injectable()
@singleton()
export class ProgressTrackingService {
  constructor(
    private nlpService: NLPService,
    private qualityMetricsService: QualityMetricsService
  ) {}

  public async trackProgress(clientId: string, sessionId: string): Promise<ProgressMetrics> {
    try {
      // Get client data
      const client = await dataService.get('clients', clientId);
      const session = await dataService.get('sessions', sessionId);
      
      // Get historical sessions
      const historicalSessions = await this.getHistoricalSessions(clientId);
      
      // Calculate progress metrics
      const currentMetrics = await this.calculateCurrentMetrics(session);
      const historicalMetrics = await this.calculateHistoricalMetrics(historicalSessions);
      
      // Calculate progress by category
      const categoryProgress = await this.calculateCategoryProgress(
        client,
        session,
        historicalSessions
      );
      
      // Track goals
      const goalProgress = await this.trackGoalProgress(client, session);
      
      // Generate timeline
      const timeline = await this.generateProgressTimeline(
        historicalSessions,
        currentMetrics,
        goalProgress
      );
      
      return {
        overall: this.calculateOverallProgress(categoryProgress, goalProgress),
        byCategory: categoryProgress,
        goals: goalProgress,
        timeline
      };
    } catch (error) {
      console.error('Error tracking progress:', error);
      throw error;
    }
  }

  public async checkTreatmentAlignment(
    clientId: string,
    sessionId: string
  ): Promise<TreatmentAlignment> {
    try {
      // Get treatment plan
      const treatmentPlan = await this.getTreatmentPlan(clientId);
      const session = await dataService.get('sessions', sessionId);
      
      // Calculate alignment scores
      const goalAlignment = await this.calculateGoalAlignment(session, treatmentPlan);
      const interventionAlignment = await this.calculateInterventionAlignment(
        session,
        treatmentPlan
      );
      const approachAlignment = await this.calculateApproachAlignment(session, treatmentPlan);
      const timingAlignment = await this.calculateTimingAlignment(session, treatmentPlan);
      
      // Generate recommendations
      const recommendations = await this.generateAlignmentRecommendations(
        session,
        treatmentPlan,
        {
          goalAlignment,
          interventionAlignment,
          approachAlignment,
          timingAlignment
        }
      );
      
      return {
        overall: this.calculateOverallAlignment(
          goalAlignment,
          interventionAlignment,
          approachAlignment,
          timingAlignment
        ),
        byComponent: {
          goals: goalAlignment,
          interventions: interventionAlignment,
          approach: approachAlignment,
          timing: timingAlignment
        },
        recommendations
      };
    } catch (error) {
      console.error('Error checking treatment alignment:', error);
      throw error;
    }
  }

  private async calculateCategoryProgress(
    client: any,
    currentSession: any,
    historicalSessions: any[]
  ): Promise<ProgressMetrics['byCategory']> {
    const initialAssessment = await this.getInitialAssessment(client.id);
    const currentAssessment = await this.getCurrentAssessment(currentSession);
    
    return {
      symptoms: this.calculateProgressDelta(
        initialAssessment.symptoms,
        currentAssessment.symptoms
      ),
      functioning: this.calculateProgressDelta(
        initialAssessment.functioning,
        currentAssessment.functioning
      ),
      relationships: this.calculateProgressDelta(
        initialAssessment.relationships,
        currentAssessment.relationships
      ),
      coping: this.calculateProgressDelta(
        initialAssessment.coping,
        currentAssessment.coping
      )
    };
  }

  private async trackGoalProgress(
    client: any,
    session: any
  ): Promise<ProgressMetrics['goals']> {
    const goals = client.goals || [];
    const sessionMetrics = await SessionAnalytics.getSessionMetrics(session.id);
    
    return goals.map(goal => ({
      id: goal.id,
      description: goal.description,
      progress: this.calculateGoalProgress(goal, session, sessionMetrics),
      status: this.determineGoalStatus(goal, session),
      lastUpdated: new Date()
    }));
  }

  private async generateProgressTimeline(
    historicalSessions: any[],
    currentMetrics: any,
    goals: ProgressMetrics['goals']
  ): Promise<ProgressMetrics['timeline']> {
    const timeline: ProgressMetrics['timeline'] = [];
    
    // Add historical points
    for (const session of historicalSessions) {
      const metrics = await SessionAnalytics.getSessionMetrics(session.id);
      const milestone = this.identifyMilestone(session, goals);
      
      timeline.push({
        date: new Date(session.date),
        score: metrics.progressTowardsGoals,
        milestone
      });
    }
    
    // Add current point
    timeline.push({
      date: new Date(),
      score: currentMetrics.progressTowardsGoals,
      milestone: this.identifyMilestone(null, goals)
    });
    
    return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private calculateProgressDelta(initial: number, current: number): number {
    const delta = current - initial;
    const normalizedDelta = delta / (1 - initial); // Normalize based on room for improvement
    return Math.max(0, Math.min(1, normalizedDelta));
  }

  private calculateOverallProgress(
    categoryProgress: ProgressMetrics['byCategory'],
    goals: ProgressMetrics['goals']
  ): number {
    const categoryAverage = Object.values(categoryProgress).reduce((a, b) => a + b, 0) / 4;
    const goalAverage = goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length;
    
    return categoryAverage * 0.6 + goalAverage * 0.4; // Weight categories more heavily
  }

  private async calculateGoalAlignment(session: any, treatmentPlan: any): Promise<number> {
    const sessionGoals = session.goals || [];
    const planGoals = treatmentPlan.goals || [];
    
    const alignment = sessionGoals.reduce((sum, goal) => {
      const matchingPlanGoal = planGoals.find(pg => pg.id === goal.id);
      return sum + (matchingPlanGoal ? 1 : 0);
    }, 0);
    
    return alignment / Math.max(sessionGoals.length, 1);
  }

  private calculateOverallAlignment(
    goalAlignment: number,
    interventionAlignment: number,
    approachAlignment: number,
    timingAlignment: number
  ): number {
    return (
      goalAlignment * 0.4 +
      interventionAlignment * 0.3 +
      approachAlignment * 0.2 +
      timingAlignment * 0.1
    );
  }

  private async generateAlignmentRecommendations(
    session: any,
    treatmentPlan: any,
    alignmentScores: {
      goalAlignment: number;
      interventionAlignment: number;
      approachAlignment: number;
      timingAlignment: number;
    }
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Check goal alignment
    if (alignmentScores.goalAlignment < 0.8) {
      const unaddressedGoals = this.findUnaddressedGoals(session, treatmentPlan);
      recommendations.push(
        `Consider addressing these treatment plan goals: ${unaddressedGoals.join(', ')}`
      );
    }
    
    // Check intervention alignment
    if (alignmentScores.interventionAlignment < 0.8) {
      const recommendedInterventions = this.getRecommendedInterventions(treatmentPlan);
      recommendations.push(
        `Consider incorporating these interventions: ${recommendedInterventions.join(', ')}`
      );
    }
    
    // Check approach alignment
    if (alignmentScores.approachAlignment < 0.8) {
      recommendations.push(
        'Consider adjusting therapeutic approach to better align with treatment plan'
      );
    }
    
    // Check timing alignment
    if (alignmentScores.timingAlignment < 0.8) {
      recommendations.push(
        'Consider adjusting session frequency or duration based on treatment plan'
      );
    }
    
    return recommendations;
  }

  private findUnaddressedGoals(session: any, treatmentPlan: any): string[] {
    const sessionGoals = session.goals || [];
    const planGoals = treatmentPlan.goals || [];
    
    return planGoals
      .filter(pg => !sessionGoals.some(sg => sg.id === pg.id))
      .map(g => g.description);
  }

  private getRecommendedInterventions(treatmentPlan: any): string[] {
    return (
      treatmentPlan.recommendedInterventions?.filter(
        (intervention: any) => intervention.priority === 'high'
      ).map((intervention: any) => intervention.name) || []
    );
  }
} 