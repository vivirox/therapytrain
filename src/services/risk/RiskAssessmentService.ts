import { singleton } from 'tsyringe';
import { dataService } from '@/lib/data';

interface RiskFactor {
  id: string;
  type: 'clinical' | 'environmental' | 'historical' | 'protective';
  description: string;
  severity: 'low' | 'medium' | 'high';
  timeframe: 'current' | 'past' | 'future';
  notes: string;
}

interface RiskAssessment {
  id: string;
  clientId: string;
  date: Date;
  assessorId: string;
  riskFactors: RiskFactor[];
  overallRisk: 'low' | 'medium' | 'high';
  safetyPlan: {
    triggers: string[];
    warningSigns: string[];
    copingStrategies: string[];
    supportContacts: Array<{
      name: string;
      relationship: string;
      phone: string;
    }>;
    professionalResources: Array<{
      name: string;
      type: string;
      contact: string;
      availability: string;
    }>;
    environmentSafety: string[];
  };
  followUpDate: Date;
  status: 'active' | 'resolved' | 'escalated';
}

@singleton()
export class RiskAssessmentService {
  private readonly TABLE_NAME = 'risk_assessments';

  public async createAssessment(assessment: Omit<RiskAssessment, 'id'>): Promise<RiskAssessment> {
    return await dataService.create(this.TABLE_NAME, assessment);
  }

  public async getAssessment(id: string): Promise<RiskAssessment> {
    return await dataService.get(this.TABLE_NAME, id);
  }

  public async getClientAssessments(clientId: string): Promise<RiskAssessment[]> {
    return await dataService.getMany(this.TABLE_NAME, { clientId });
  }

  public async getLatestAssessment(clientId: string): Promise<RiskAssessment | null> {
    const assessments = await this.getClientAssessments(clientId);
    if (!assessments.length) return null;
    
    return assessments.reduce((latest, current) => {
      return new Date(current.date) > new Date(latest.date) ? current : latest;
    });
  }

  public async updateAssessment(id: string, data: Partial<RiskAssessment>): Promise<RiskAssessment> {
    return await dataService.update(this.TABLE_NAME, id, data);
  }

  public async calculateRiskLevel(assessment: RiskAssessment): Promise<'low' | 'medium' | 'high'> {
    const riskFactors = assessment.riskFactors;
    
    // Count risk factors by severity
    const severityCounts = riskFactors.reduce(
      (counts, factor) => {
        if (factor.type !== 'protective') {
          counts[factor.severity]++;
        }
        return counts;
      },
      { low: 0, medium: 0, high: 0 }
    );

    // Count protective factors
    const protectiveFactors = riskFactors.filter(f => f.type === 'protective').length;

    // Calculate risk level
    if (severityCounts.high > 0 || severityCounts.medium >= 3) {
      return protectiveFactors >= 3 ? 'medium' : 'high';
    } else if (severityCounts.medium > 0 || severityCounts.low >= 3) {
      return protectiveFactors >= 2 ? 'low' : 'medium';
    } else {
      return 'low';
    }
  }

  public async checkForEscalation(clientId: string): Promise<boolean> {
    const assessments = await this.getClientAssessments(clientId);
    if (assessments.length < 2) return false;

    // Sort assessments by date
    const sortedAssessments = assessments.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Get the two most recent assessments
    const [latest, previous] = sortedAssessments;

    // Check for risk level increase
    const riskLevels = { low: 0, medium: 1, high: 2 };
    return riskLevels[latest.overallRisk] > riskLevels[previous.overallRisk];
  }

  public async generateSafetyPlanRecommendations(
    assessment: RiskAssessment
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Check for missing safety plan components
    const safetyPlan = assessment.safetyPlan;

    if (!safetyPlan.triggers.length) {
      recommendations.push('Add specific triggers to the safety plan');
    }

    if (!safetyPlan.warningSigns.length) {
      recommendations.push('Document early warning signs');
    }

    if (safetyPlan.copingStrategies.length < 3) {
      recommendations.push('Add more coping strategies (aim for at least 3)');
    }

    if (safetyPlan.supportContacts.length < 2) {
      recommendations.push('Add more support contacts (aim for at least 2)');
    }

    if (safetyPlan.professionalResources.length < 2) {
      recommendations.push('Add more professional resources (aim for at least 2)');
    }

    if (!safetyPlan.environmentSafety.length) {
      recommendations.push('Add environmental safety measures');
    }

    // Add risk-level specific recommendations
    if (assessment.overallRisk === 'high') {
      recommendations.push('Consider immediate professional intervention');
      recommendations.push('Implement 24/7 monitoring protocol');
    } else if (assessment.overallRisk === 'medium') {
      recommendations.push('Schedule more frequent check-ins');
      recommendations.push('Review and update safety plan weekly');
    }

    return recommendations;
  }
} 