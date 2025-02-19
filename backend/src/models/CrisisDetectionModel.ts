import { pipeline, Pipeline } from '@xenova/transformers';
import { SecurityAuditService } from '../services/SecurityAuditService';

export interface CrisisResult {
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  triggers: string[];
  immediateActionRequired: boolean;
}

export class CrisisDetectionModel {
  private model: Pipeline;
  private securityAudit: SecurityAuditService;
  private readonly crisisCategories = [
    'suicidal_ideation',
    'self_harm',
    'violence',
    'substance_abuse',
    'emotional_crisis',
    'panic_attack',
    'dissociation',
    'severe_anxiety',
    'depression',
    'psychosis'
  ];

  constructor(securityAudit: SecurityAuditService) {
    this.securityAudit = securityAudit;
  }

  async initialize(): Promise<void> {
    try {
      // Using a model fine-tuned for crisis detection
      this.model = await pipeline('text-classification', 'facebook/bart-large-mnli');
      await this.securityAudit.recordEvent('crisis_model_initialized', {
        timestamp: Date.now(),
        modelName: 'bart-large-mnli'
      });
    } catch (error) {
      await this.securityAudit.recordEvent('crisis_model_init_error', {
        timestamp: Date.now(),
        error: error.message
      });
      throw error;
    }
  }

  async predict(text: string): Promise<CrisisResult> {
    try {
      const result = await this.model(text, this.crisisCategories, {
        multi_label: true,
      });

      const detectedTriggers = result.labels
        .map((category: string, index: number) => ({
          category,
          score: result.scores[index]
        }))
        .filter(item => item.score > 0.3)
        .map(item => item.category);

      const severity = this.calculateSeverity(result.scores, detectedTriggers);
      const immediateActionRequired = severity === 'high' || severity === 'critical';

      await this.securityAudit.recordEvent('crisis_prediction', {
        timestamp: Date.now(),
        textLength: text.length,
        severity,
        triggersDetected: detectedTriggers.length,
        immediateActionRequired
      });

      return {
        severity,
        triggers: detectedTriggers,
        immediateActionRequired
      };
    } catch (error) {
      await this.securityAudit.recordEvent('crisis_prediction_error', {
        timestamp: Date.now(),
        error: error.message
      });
      throw error;
    }
  }

  private calculateSeverity(
    scores: number[],
    triggers: string[]
  ): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    const maxScore = Math.max(...scores);
    const hasCriticalTriggers = triggers.some(t => 
      ['suicidal_ideation', 'self_harm', 'violence'].includes(t)
    );

    if (hasCriticalTriggers && maxScore > 0.8) return 'critical';
    if (hasCriticalTriggers && maxScore > 0.6) return 'high';
    if (maxScore > 0.6 || triggers.length > 2) return 'medium';
    if (maxScore > 0.3 || triggers.length > 0) return 'low';
    return 'none';
  }
}
