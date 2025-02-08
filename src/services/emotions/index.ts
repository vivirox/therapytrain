export type EmotionState = 
  | 'happy'
  | 'sad'
  | 'angry'
  | 'anxious'
  | 'neutral'
  | 'frustrated'
  | 'confused'
  | 'hopeful'
  | 'overwhelmed';

export type EmotionTrigger = {
  id: string;
  emotion: EmotionState;
  trigger: string;
  intensity: number;
  timestamp: Date;
  context?: string;
  copingStrategy?: string;
};

export interface EmotionAnalytics {
  userId: string;
  currentState: EmotionState;
  stateHistory: Array<{
    state: EmotionState;
    timestamp: Date;
    duration: number;
  }>;
  triggers: EmotionTrigger[];
  timestamp: Date;
}

export interface EmotionService {
  getCurrentState(userId: string): Promise<EmotionState>;
  trackEmotion(userId: string, state: EmotionState, trigger?: string): Promise<void>;
  getStateHistory(userId: string, startDate: Date, endDate: Date): Promise<EmotionAnalytics>;
  suggestCopingStrategies(state: EmotionState): Promise<string[]>;
  analyzeTriggerPatterns(userId: string): Promise<EmotionTrigger[]>;
}

export * from '@/services/chat/emotionalstate'; 