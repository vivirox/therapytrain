import { singleton } from 'tsyringe';
import { dataService } from '@/lib/data';

interface TreatmentPlan {
  id: string;
  clientId: string;
  goals: Array<{
    id: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  interventions: Array<{
    id: string;
    name: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  approach: {
    type: string;
    frequency: string;
    duration: string;
  };
  timeline: {
    startDate: Date;
    reviewDate: Date;
    endDate?: Date;
  };
}

interface AlignmentScore {
  overall: number;
  byComponent: {
    goals: number;
    interventions: number;
    approach: number;
    timing: number;
  };
  recommendations: string[];
}

@singleton()
export class AlignmentService {
  private readonly TABLE_NAME = 'treatment_plans';

  public async getTreatmentPlan(clientId: string): Promise<TreatmentPlan | null> {
    const plans = await dataService.getMany(this.TABLE_NAME, { clientId });
    if (!plans.length) return null;

    // Get the most recent plan
    return plans.reduce((latest, current) => {
      return new Date(current.timeline.startDate) > new Date(latest.timeline.startDate)
        ? current
        : latest;
    });
  }

  public async checkAlignment(
    clientId: string,
    sessionId: string
  ): Promise<AlignmentScore> {
    const plan = await this.getTreatmentPlan(clientId);
    if (!plan) {
      return {
        overall: 0,
        byComponent: {
          goals: 0,
          interventions: 0,
          approach: 0,
          timing: 0
        },
        recommendations: ['No treatment plan found. Please create a treatment plan.']
      };
    }

    const session = await dataService.get('sessions', sessionId);
    
    const goalAlignment = await this.calculateGoalAlignment(session, plan);
    const interventionAlignment = await this.calculateInterventionAlignment(session, plan);
    const approachAlignment = await this.calculateApproachAlignment(session, plan);
    const timingAlignment = await this.calculateTimingAlignment(session, plan);

    const recommendations = await this.generateRecommendations({
      goalAlignment,
      interventionAlignment,
      approachAlignment,
      timingAlignment,
      plan,
      session
    });

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
  }

  private async calculateGoalAlignment(session: any, plan: TreatmentPlan): Promise<number> {
    const sessionGoals = session.goals || [];
    const planGoals = plan.goals || [];
    
    const alignment = sessionGoals.reduce((sum: number, goal: any) => {
      const matchingPlanGoal = planGoals.find(pg => pg.id === goal.id);
      return sum + (matchingPlanGoal ? 1 : 0);
    }, 0);
    
    return alignment / Math.max(sessionGoals.length, 1);
  }

  private async calculateInterventionAlignment(session: any, plan: TreatmentPlan): Promise<number> {
    const sessionInterventions = session.interventions || [];
    const planInterventions = plan.interventions || [];
    
    const alignment = sessionInterventions.reduce((sum: number, intervention: any) => {
      const matchingPlanIntervention = planInterventions.find(pi => pi.id === intervention.id);
      return sum + (matchingPlanIntervention ? 1 : 0);
    }, 0);
    
    return alignment / Math.max(sessionInterventions.length, 1);
  }

  private async calculateApproachAlignment(session: any, plan: TreatmentPlan): Promise<number> {
    if (!session.approach || !plan.approach) return 0;
    
    let score = 0;
    if (session.approach.type === plan.approach.type) score += 0.4;
    if (session.approach.frequency === plan.approach.frequency) score += 0.3;
    if (session.approach.duration === plan.approach.duration) score += 0.3;
    
    return score;
  }

  private async calculateTimingAlignment(session: any, plan: TreatmentPlan): Promise<number> {
    const sessionDate = new Date(session.date);
    const planStart = new Date(plan.timeline.startDate);
    const planEnd = plan.timeline.endDate ? new Date(plan.timeline.endDate) : null;
    
    if (sessionDate < planStart) return 0;
    if (planEnd && sessionDate > planEnd) return 0;
    
    return 1;
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

  private async generateRecommendations(params: {
    goalAlignment: number;
    interventionAlignment: number;
    approachAlignment: number;
    timingAlignment: number;
    plan: TreatmentPlan;
    session: any;
  }): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (params.goalAlignment < 0.8) {
      const unaddressedGoals = params.plan.goals
        .filter(pg => !params.session.goals?.some((sg: any) => sg.id === pg.id))
        .map(g => g.description);
      
      if (unaddressedGoals.length) {
        recommendations.push(
          `Consider addressing these treatment plan goals: ${unaddressedGoals.join(', ')}`
        );
      }
    }
    
    if (params.interventionAlignment < 0.8) {
      const recommendedInterventions = params.plan.interventions
        .filter(pi => pi.priority === 'high')
        .filter(pi => !params.session.interventions?.some((si: any) => si.id === pi.id))
        .map(i => i.name);
      
      if (recommendedInterventions.length) {
        recommendations.push(
          `Consider incorporating these interventions: ${recommendedInterventions.join(', ')}`
        );
      }
    }
    
    if (params.approachAlignment < 0.8) {
      recommendations.push(
        'Consider adjusting therapeutic approach to better align with treatment plan'
      );
    }
    
    if (params.timingAlignment < 0.8) {
      recommendations.push(
        'Consider adjusting session frequency or duration based on treatment plan'
      );
    }
    
    return recommendations;
  }
} 