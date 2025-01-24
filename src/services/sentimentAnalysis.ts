import Sentiment from 'sentiment';

const sentiment = new Sentiment();

// Add therapy-specific terms
sentiment.registerLanguage('en', {
  labels: {
    // Positive therapy-specific terms
    'progress': 2,
    'breakthrough': 3,
    'healing': 2,
    'growth': 2,
    'resilient': 2,
    'cope': 1,
    'support': 1,
    'mindful': 2,
    
    // Negative therapy-specific terms
    'trauma': -2,
    'anxiety': -2,
    'depression': -2,
    'crisis': -3,
    'suicidal': -5,
    'self-harm': -5,
    'hopeless': -3,
    'overwhelmed': -2,
  }
});

export interface SentimentAnalysis {
  score: number;
  comparative: number;
  tokens: string[];
  words: string[];
  positive: string[];
  negative: string[];
  intensity: 'very-negative' | 'negative' | 'neutral' | 'positive' | 'very-positive';
  alert: boolean;
}

export interface SentimentTrend {
  timestamp: number;
  score: number;
  intensity: string;
}

const normalizeScore = (score: number): number => {
  const maxScore = 5;
  return Math.max(Math.min(score, maxScore), -maxScore);
};

const getIntensity = (score: number): SentimentAnalysis['intensity'] => {
  if (score <= -4) return 'very-negative';
  if (score <= -2) return 'negative';
  if (score >= 4) return 'very-positive';
  if (score >= 2) return 'positive';
  return 'neutral';
};

const shouldAlert = (analysis: Partial<SentimentAnalysis>): boolean => {
  // Alert on very negative sentiment or specific concerning words
  const alertWords = ['suicidal', 'self-harm', 'crisis'];
  return analysis.score! <= -4 || 
         analysis.words?.some(word => alertWords.includes(word.toLowerCase())) || 
         false;
};

export const analyzeSentiment = (text: string): SentimentAnalysis => {
  const result = sentiment.analyze(text);
  const normalizedScore = normalizeScore(result.score);
  const intensity = getIntensity(normalizedScore);
  
  return {
    ...result,
    score: normalizedScore,
    intensity,
    alert: shouldAlert({ ...result, score: normalizedScore })
  };
};

export const analyzeMessageHistory = (messages: { content: string; timestamp?: number }[]): number => {
  if (messages.length === 0) return 0;
  
  const scores = messages.map(msg => analyzeSentiment(msg.content).score);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  return normalizeScore(average);
};

export const getSentimentTrends = (messages: { content: string; timestamp?: number }[]): SentimentTrend[] => {
  return messages.map(msg => {
    const analysis = analyzeSentiment(msg.content);
    return {
      timestamp: msg.timestamp || Date.now(),
      score: analysis.score,
      intensity: analysis.intensity
    };
  });
};
