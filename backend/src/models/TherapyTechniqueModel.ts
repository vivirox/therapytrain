import { pipeline, Pipeline } from '@xenova/transformers';
import { SecurityAuditService } from '../services/SecurityAuditService';

export interface TechniqueResult {
  identified: string[];
  confidence: number;
}

export class TherapyTechniqueModel {
  private model: Pipeline;
  private securityAudit: SecurityAuditService;
  private readonly techniques = [
    'cognitive_behavioral_therapy',
    'dialectical_behavioral_therapy',
    'psychodynamic_therapy',
    'mindfulness_based_therapy',
    'solution_focused_therapy',
    'motivational_interviewing',
    'exposure_therapy',
    'active_listening',
    'validation',
    'reframing',
    'narrative_therapy',
    'acceptance_commitment_therapy',
    'emotionally_focused_therapy',
    'interpersonal_therapy',
    'play_therapy'
  ];

  constructor(securityAudit: SecurityAuditService) {
    this.securityAudit = securityAudit;
  }

  async initialize(): Promise<void> {
    try {
      // Using a zero-shot classification model for flexibility
      this.model = await pipeline('zero-shot-classification', 'facebook/bart-large-mnli');
      await this.securityAudit.recordEvent('technique_model_initialized', {
        timestamp: Date.now(),
        modelName: 'bart-large-mnli'
      });
    } catch (error) {
      await this.securityAudit.recordEvent('technique_model_init_error', {
        timestamp: Date.now(),
        error: error.message
      });
      throw error;
    }
  }

  async predict(text: string): Promise<TechniqueResult[]> {
    try {
      const result = await this.model(text, this.techniques, {
        multi_label: true,
      });

      // Filter techniques with confidence above threshold
      const threshold = 0.3;
      const identifiedTechniques = result.labels
        .map((technique: string, index: number) => ({
          technique,
          confidence: result.scores[index]
        }))
        .filter(item => item.confidence >= threshold);

      await this.securityAudit.recordEvent('technique_prediction', {
        timestamp: Date.now(),
        textLength: text.length,
        techniquesIdentified: identifiedTechniques.length
      });

      return identifiedTechniques.map(item => ({
        identified: [item.technique],
        confidence: item.confidence
      }));
    } catch (error) {
      await this.securityAudit.recordEvent('technique_prediction_error', {
        timestamp: Date.now(),
        error: error.message
      });
      throw error;
    }
  }
}
