export type EmotionType = 'joy' | 'sadness' | 'anger' | 'fear' | 'neutral';

export interface EmotionProbabilities {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  neutral: number;
}

export interface EmotionalResponse {
  primary: EmotionType;
  probabilities: EmotionProbabilities;
  intensity: number;
  confidence: number;
  timestamp: Date;
}

export interface EmotionalTrend {
  emotion: EmotionType;
  startTime: Date;
  endTime: Date;
  averageIntensity: number;
  duration: number;
  confidence: number;
}

export interface EmotionalStateChange {
  from: EmotionType;
  to: EmotionType;
  timestamp: Date;
  confidence: number;
  trigger?: string;
}

export interface EmotionalAnalysisMetrics {
  dominantEmotion: EmotionType;
  emotionalStability: number;
  emotionalVariability: number;
  averageIntensity: number;
  confidenceScore: number;
  trends: EmotionalTrend[];
  stateChanges: EmotionalStateChange[];
}

export interface EmotionalContext {
  baselineEmotion: EmotionType;
  significantChanges: EmotionalStateChange[];
  currentState: EmotionalResponse;
  historicalContext: EmotionalAnalysisMetrics;
}

export interface EmotionState {
  currentEmotion: string;
  intensity: number;
  valence: number;
  arousal: number;
  timestamp: Date;
}

export interface EmotionTrigger {
  trigger: string;
  emotion: string;
  context: string;
  timestamp: Date;
}
