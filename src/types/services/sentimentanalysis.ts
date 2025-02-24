export interface Sentiment {
  score: number;  // -1 to 1, where -1 is very negative, 1 is very positive
  magnitude: number;  // 0 to infinity, indicating strength of emotion
  label: 'positive' | 'negative' | 'neutral';
}

export interface EmotionScores {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  trust: number;
  anticipation: number;
}

export interface SentimentAnalysisResult {
  text: string;
  sentiment: Sentiment;
  emotions: EmotionScores;
  entities: Array<{
    text: string;
    type: string;
    sentiment: Sentiment;
  }>;
  language: string;
  confidence: number;
}

export interface SentimentAnalysisService {
  analyzeSentiment(text: string): Promise<SentimentAnalysisResult>;
  analyzeEmotions(text: string): Promise<EmotionScores>;
  batchAnalyze(texts: string[]): Promise<SentimentAnalysisResult[]>;
  getEmotionalTrend(userId: string, startDate: Date, endDate: Date): Promise<Array<{
    timestamp: Date;
    sentiment: Sentiment;
    emotions: EmotionScores;
  }>>;
}

export interface SentimentAnalysisConfig {
  model: 'basic' | 'advanced';
  language: string | 'auto';
  minConfidence: number;
  enableEmotionDetection: boolean;
  enableEntityAnalysis: boolean;
} 