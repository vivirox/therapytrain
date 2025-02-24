import { pipeline, Pipeline } from '@xenova/transformers';
import { SecurityAuditService } from '../services/SecurityAuditService';

export interface EmotionResult {
  primary: string;
  secondary?: string;
  intensity: number;
}

export class EmotionModel {
  private model: Pipeline;
  private securityAudit: SecurityAuditService;
  private readonly emotions = [
    'joy', 'sadness', 'anger', 'fear', 'surprise',
    'disgust', 'trust', 'anticipation', 'neutral',
    'shame', 'guilt', 'envy', 'pride', 'relief'
  ];

  constructor(securityAudit: SecurityAuditService) {
    this.securityAudit = securityAudit;
  }

  async initialize(): Promise<void> {
    try {
      this.model = await pipeline('text-classification', 'SamLowe/roberta-base-go_emotions');
      await this.securityAudit.recordEvent('emotion_model_initialized', {
        timestamp: Date.now(),
        modelName: 'roberta-base-go_emotions'
      });
    } catch (error) {
      await this.securityAudit.recordEvent('emotion_model_init_error', {
        timestamp: Date.now(),
        error: error.message
      });
      throw error;
    }
  }

  async predict(text: string): Promise<EmotionResult> {
    try {
      const result = await this.model(text, {
        topk: 2,
      });

      const [primary, secondary] = result;
      const intensity = primary.score;

      await this.securityAudit.recordEvent('emotion_prediction', {
        timestamp: Date.now(),
        textLength: text.length,
        primaryEmotion: primary.label
      });

      return {
        primary: this.normalizeEmotion(primary.label),
        secondary: secondary ? this.normalizeEmotion(secondary.label) : undefined,
        intensity
      };
    } catch (error) {
      await this.securityAudit.recordEvent('emotion_prediction_error', {
        timestamp: Date.now(),
        error: error.message
      });
      throw error;
    }
  }

  private normalizeEmotion(emotion: string): string {
    // Map model-specific emotion labels to our standardized set
    const emotionMap: { [key: string]: string } = {
      'admiration': 'trust',
      'amusement': 'joy',
      'annoyance': 'anger',
      'approval': 'trust',
      'caring': 'trust',
      'confusion': 'surprise',
      'curiosity': 'anticipation',
      'desire': 'anticipation',
      'disappointment': 'sadness',
      'disapproval': 'disgust',
      'embarrassment': 'fear',
      'excitement': 'joy',
      'gratitude': 'joy',
      'grief': 'sadness',
      'nervousness': 'fear',
      'optimism': 'anticipation',
      'pride': 'joy',
      'realization': 'surprise',
      'relief': 'joy',
      'remorse': 'sadness',
      'neutral': 'neutral',
      'shame': 'sadness',
      'guilt': 'sadness',
      'envy': 'anger',
      'pride': 'joy',
      'relief': 'joy'
    };

    return emotionMap[emotion.toLowerCase()] || 'neutral';
  }
}
