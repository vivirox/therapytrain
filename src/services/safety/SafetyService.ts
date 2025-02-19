import { singleton } from 'tsyringe';
import { dataService } from '@/lib/data';
import { NLPService } from '../nlp/NLPService';
import { AuditService } from '../audit/AuditService';

@singleton()
export class SafetyService {
  private static instance: SafetyService;
  private nlpService: NLPService;
  private auditService: AuditService;

  constructor() {
    this.nlpService = NLPService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): SafetyService {
    if (!SafetyService.instance) {
      SafetyService.instance = new SafetyService();
    }
    return SafetyService.instance;
  }

  public async checkClientWellbeing(session: any): Promise<{
    isSafe: boolean;
    severity: 'low' | 'medium' | 'high';
    issues?: string[];
    recommendations?: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check risk indicators
    const riskStatus = await this.checkRiskIndicators(session);
    if (!riskStatus.isSafe) {
      issues.push(...(riskStatus.issues || []));
      recommendations.push(...(riskStatus.recommendations || []));
    }

    // Check safety plan
    const safetyPlanStatus = await this.checkSafetyPlan(session);
    if (!safetyPlanStatus.isValid) {
      issues.push('Safety plan needs review');
      recommendations.push('Update and validate safety plan');
    }

    // Check crisis response
    const crisisStatus = await this.checkCrisisResponse(session);
    if (!crisisStatus.isValid) {
      issues.push('Crisis response protocol needs review');
      recommendations.push('Update crisis response protocol');
    }

    const severity = this.determineSeverity(issues);

    return {
      isSafe: issues.length === 0,
      severity,
      issues: issues.length > 0 ? issues : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkRiskIndicators(session: any): Promise<{
    isSafe: boolean;
    issues?: string[];
    recommendations?: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check self-harm risk
    const selfHarmStatus = await this.checkSelfHarmRisk(session);
    if (selfHarmStatus.riskLevel > 0.5) {
      issues.push('Elevated self-harm risk detected');
      recommendations.push('Implement immediate safety measures');
    }

    // Check suicide risk
    const suicideStatus = await this.checkSuicideRisk(session);
    if (suicideStatus.riskLevel > 0.5) {
      issues.push('Elevated suicide risk detected');
      recommendations.push('Implement crisis intervention protocol');
    }

    // Check harm to others risk
    const harmToOthersStatus = await this.checkHarmToOthersRisk(session);
    if (harmToOthersStatus.riskLevel > 0.5) {
      issues.push('Risk of harm to others detected');
      recommendations.push('Implement safety measures and notify appropriate authorities');
    }

    return {
      isSafe: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkSafetyPlan(session: any): Promise<{
    isValid: boolean;
  }> {
    try {
      // Get safety plan
      const safetyPlan = await this.getSafetyPlan(session);
      if (!safetyPlan) {
        return { isValid: false };
      }

      // Validate safety plan components
      const isValid = this.validateSafetyPlan(safetyPlan);

      return { isValid };
    } catch (error) {
      console.error('Error checking safety plan:', error);
      return { isValid: false };
    }
  }

  private async checkCrisisResponse(session: any): Promise<{
    isValid: boolean;
  }> {
    try {
      // Get crisis response protocol
      const protocol = await this.getCrisisProtocol(session);
      if (!protocol) {
        return { isValid: false };
      }

      // Validate crisis response protocol
      const isValid = this.validateCrisisProtocol(protocol);

      return { isValid };
    } catch (error) {
      console.error('Error checking crisis response:', error);
      return { isValid: false };
    }
  }

  private async checkSelfHarmRisk(session: any): Promise<{
    riskLevel: number;
    indicators: string[];
  }> {
    try {
      // Get session messages
      const messages = await this.getSessionMessages(session);
      
      // Analyze messages for self-harm risk
      const analysis = await this.nlpService.analyzeRiskIndicators(
        messages.map(m => m.content).join(' ')
      );

      return {
        riskLevel: analysis.riskLevel,
        indicators: analysis.riskTypes
      };
    } catch (error) {
      console.error('Error checking self-harm risk:', error);
      return {
        riskLevel: 1, // High risk on error for safety
        indicators: ['Error assessing risk']
      };
    }
  }

  private async checkSuicideRisk(session: any): Promise<{
    riskLevel: number;
    indicators: string[];
  }> {
    try {
      // Get session messages and assessments
      const messages = await this.getSessionMessages(session);
      const assessments = await this.getSuicideRiskAssessments(session);

      // Analyze messages for suicide risk
      const messageAnalysis = await this.nlpService.analyzeRiskIndicators(
        messages.map(m => m.content).join(' ')
      );

      // Combine with assessment scores
      const assessmentScore = this.calculateAssessmentScore(assessments);
      const combinedRisk = (messageAnalysis.riskLevel + assessmentScore) / 2;

      return {
        riskLevel: combinedRisk,
        indicators: [...messageAnalysis.riskTypes, ...this.getAssessmentIndicators(assessments)]
      };
    } catch (error) {
      console.error('Error checking suicide risk:', error);
      return {
        riskLevel: 1, // High risk on error for safety
        indicators: ['Error assessing risk']
      };
    }
  }

  private async checkHarmToOthersRisk(session: any): Promise<{
    riskLevel: number;
    indicators: string[];
  }> {
    try {
      // Get session messages and violence risk assessments
      const messages = await this.getSessionMessages(session);
      const assessments = await this.getViolenceRiskAssessments(session);

      // Analyze messages for risk of harm to others
      const messageAnalysis = await this.nlpService.analyzeRiskIndicators(
        messages.map(m => m.content).join(' ')
      );

      // Combine with assessment scores
      const assessmentScore = this.calculateViolenceRiskScore(assessments);
      const combinedRisk = (messageAnalysis.riskLevel + assessmentScore) / 2;

      return {
        riskLevel: combinedRisk,
        indicators: [...messageAnalysis.riskTypes, ...this.getViolenceRiskIndicators(assessments)]
      };
    } catch (error) {
      console.error('Error checking harm to others risk:', error);
      return {
        riskLevel: 1, // High risk on error for safety
        indicators: ['Error assessing risk']
      };
    }
  }

  private determineSeverity(issues: string[]): 'low' | 'medium' | 'high' {
    if (issues.length === 0) return 'low';
    if (issues.some(issue => 
      issue.includes('suicide') || 
      issue.includes('self-harm') || 
      issue.includes('harm to others')
    )) return 'high';
    if (issues.length > 2) return 'high';
    if (issues.length > 1) return 'medium';
    return 'low';
  }

  private async getSafetyPlan(session: any): Promise<any> {
    return await dataService.get('safety_plans', {
      where: {
        sessionId: session.id,
        status: 'active'
      }
    });
  }

  private validateSafetyPlan(plan: any): boolean {
    return (
      plan.warningSignals &&
      plan.copingStrategies &&
      plan.supportContacts &&
      plan.emergencyContacts &&
      plan.restrictionMethods &&
      plan.professionalResources &&
      this.validateSafetyPlanComponents(plan)
    );
  }

  private validateSafetyPlanComponents(plan: any): boolean {
    // Validate warning signals
    if (!Array.isArray(plan.warningSignals) || plan.warningSignals.length === 0) {
      return false;
    }

    // Validate coping strategies
    if (!Array.isArray(plan.copingStrategies) || plan.copingStrategies.length === 0) {
      return false;
    }

    // Validate support contacts
    if (!Array.isArray(plan.supportContacts) || plan.supportContacts.length === 0) {
      return false;
    }

    // Validate emergency contacts
    if (!Array.isArray(plan.emergencyContacts) || plan.emergencyContacts.length === 0) {
      return false;
    }

    // Validate restriction methods
    if (!Array.isArray(plan.restrictionMethods) || plan.restrictionMethods.length === 0) {
      return false;
    }

    // Validate professional resources
    if (!Array.isArray(plan.professionalResources) || plan.professionalResources.length === 0) {
      return false;
    }

    return true;
  }

  private async getCrisisProtocol(session: any): Promise<any> {
    return await dataService.get('crisis_protocols', {
      where: {
        sessionId: session.id,
        status: 'active'
      }
    });
  }

  private validateCrisisProtocol(protocol: any): boolean {
    return (
      protocol.escalationSteps &&
      protocol.emergencyContacts &&
      protocol.interventionProcedures &&
      protocol.followUpProcedures &&
      this.validateCrisisProtocolComponents(protocol)
    );
  }

  private validateCrisisProtocolComponents(protocol: any): boolean {
    // Validate escalation steps
    if (!Array.isArray(protocol.escalationSteps) || protocol.escalationSteps.length === 0) {
      return false;
    }

    // Validate emergency contacts
    if (!Array.isArray(protocol.emergencyContacts) || protocol.emergencyContacts.length === 0) {
      return false;
    }

    // Validate intervention procedures
    if (!Array.isArray(protocol.interventionProcedures) || protocol.interventionProcedures.length === 0) {
      return false;
    }

    // Validate follow-up procedures
    if (!Array.isArray(protocol.followUpProcedures) || protocol.followUpProcedures.length === 0) {
      return false;
    }

    return true;
  }

  private async getSessionMessages(session: any): Promise<any[]> {
    return await dataService.list('messages', {
      where: {
        sessionId: session.id
      },
      orderBy: {
        timestamp: 'asc'
      }
    });
  }

  private async getSuicideRiskAssessments(session: any): Promise<any[]> {
    return await dataService.list('suicide_risk_assessments', {
      where: {
        sessionId: session.id
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
  }

  private calculateAssessmentScore(assessments: any[]): number {
    if (!assessments.length) return 0;

    const latestAssessment = assessments[0];
    return (
      latestAssessment.ideationScore * 0.3 +
      latestAssessment.planScore * 0.3 +
      latestAssessment.intentScore * 0.4
    );
  }

  private getAssessmentIndicators(assessments: any[]): string[] {
    if (!assessments.length) return [];

    const latestAssessment = assessments[0];
    const indicators: string[] = [];

    if (latestAssessment.ideationScore > 0.7) {
      indicators.push('High suicidal ideation');
    }
    if (latestAssessment.planScore > 0.7) {
      indicators.push('Detailed suicide plan');
    }
    if (latestAssessment.intentScore > 0.7) {
      indicators.push('Strong suicidal intent');
    }

    return indicators;
  }

  private async getViolenceRiskAssessments(session: any): Promise<any[]> {
    return await dataService.list('violence_risk_assessments', {
      where: {
        sessionId: session.id
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
  }

  private calculateViolenceRiskScore(assessments: any[]): number {
    if (!assessments.length) return 0;

    const latestAssessment = assessments[0];
    return (
      latestAssessment.threatScore * 0.3 +
      latestAssessment.planScore * 0.3 +
      latestAssessment.historyScore * 0.4
    );
  }

  private getViolenceRiskIndicators(assessments: any[]): string[] {
    if (!assessments.length) return [];

    const latestAssessment = assessments[0];
    const indicators: string[] = [];

    if (latestAssessment.threatScore > 0.7) {
      indicators.push('Explicit threats of violence');
    }
    if (latestAssessment.planScore > 0.7) {
      indicators.push('Detailed plan for violence');
    }
    if (latestAssessment.historyScore > 0.7) {
      indicators.push('History of violent behavior');
    }

    return indicators;
  }
} 