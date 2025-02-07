export interface EmotionalResponse {
  emotion: string;
  intensity: number;
  timestamp: Date;
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
