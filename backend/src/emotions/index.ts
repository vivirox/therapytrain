export interface EmotionState {
    primary: PrimaryEmotion;
    secondary?: SecondaryEmotion;
    intensity: number; // 0-1
    confidence: number; // 0-1
    timestamp: Date;
    metadata?: {
        context?: string;
        triggers?: EmotionTrigger[];
        duration?: number;
        previousState?: EmotionState;
    };
}

export type PrimaryEmotion = 
    | 'JOY'
    | 'SADNESS'
    | 'ANGER'
    | 'FEAR'
    | 'DISGUST'
    | 'SURPRISE'
    | 'NEUTRAL';

export type SecondaryEmotion =
    | 'EXCITEMENT'
    | 'CONTENTMENT'
    | 'DISAPPOINTMENT'
    | 'FRUSTRATION'
    | 'ANXIETY'
    | 'RELIEF'
    | 'CONFUSION'
    | 'INTEREST';

export interface EmotionTrigger {
    type: 'MESSAGE' | 'EVENT' | 'INTERACTION' | 'ENVIRONMENT';
    source: string;
    description: string;
    timestamp: Date;
    impact: number; // -1 to 1
    metadata?: Record<string, any>;
}

export interface EmotionTransition {
    from: EmotionState;
    to: EmotionState;
    duration: number;
    trigger?: EmotionTrigger;
    metadata?: {
        interventions?: string[];
        effectiveness?: number;
        notes?: string;
    };
}

export interface EmotionProfile {
    userId: string;
    dominantEmotions: PrimaryEmotion[];
    emotionalRange: {
        min: number;
        max: number;
        average: number;
    };
    triggers: {
        positive: EmotionTrigger[];
        negative: EmotionTrigger[];
    };
    patterns: {
        timeOfDay: Record<string, PrimaryEmotion>;
        dayOfWeek: Record<string, PrimaryEmotion>;
        seasonal: Record<string, PrimaryEmotion>;
    };
}

export interface EmotionMetrics {
    period: {
        start: Date;
        end: Date;
    };
    summary: {
        dominantEmotion: PrimaryEmotion;
        averageIntensity: number;
        emotionalStability: number;
        triggerFrequency: number;
    };
    distribution: Record<PrimaryEmotion, number>;
    transitions: {
        total: number;
        mostCommon: EmotionTransition[];
    };
    interventions: {
        total: number;
        successful: number;
        types: Record<string, number>;
    };
}

// Re-export emotion-related implementations
export * from './emotionDetector';
export * from './emotionTracker';
export * from './interventionManager';
export * from './patternAnalyzer'; 