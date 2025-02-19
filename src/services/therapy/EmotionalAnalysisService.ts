import { EventEmitter } from 'events';
import {
  EmotionalResponse,
  EmotionalContext,
  EmotionalTrend,
  EmotionalStateChange,
  EmotionalAnalysisMetrics,
  EmotionType
} from '@/types/emotions';

@singleton()
export class EmotionalAnalysisService extends EventEmitter {
  private static instance: EmotionalAnalysisService;
  private emotionalContexts: Map<string, EmotionalContext> = new Map();
  private subscribers: Map<string, Set<(context: EmotionalContext) => void>> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): EmotionalAnalysisService {
    if (!EmotionalAnalysisService.instance) {
      EmotionalAnalysisService.instance = new EmotionalAnalysisService();
    }
    return EmotionalAnalysisService.instance;
  }

  async getEmotionalContext(sessionId: string): Promise<EmotionalContext> {
    const context = this.emotionalContexts.get(sessionId);
    if (!context) {
      // Initialize new context if none exists
      const newContext: EmotionalContext = {
        baselineEmotion: 'neutral',
        significantChanges: [],
        currentState: {
          primary: 'neutral',
          probabilities: {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            neutral: 1
          },
          intensity: 0,
          confidence: 1,
          timestamp: new Date()
        },
        historicalContext: {
          dominantEmotion: 'neutral',
          emotionalStability: 1,
          emotionalVariability: 0,
          averageIntensity: 0,
          confidenceScore: 1,
          trends: [],
          stateChanges: []
        }
      };
      this.emotionalContexts.set(sessionId, newContext);
      return newContext;
    }
    return context;
  }

  async updateEmotionalState(
    sessionId: string,
    emotionalResponse: EmotionalResponse
  ): Promise<EmotionalContext> {
    const context = await this.getEmotionalContext(sessionId);
    const previousState = context.currentState;

    // Update current state
    context.currentState = emotionalResponse;

    // Check for significant state change
    if (this.isSignificantChange(previousState, emotionalResponse)) {
      const stateChange: EmotionalStateChange = {
        from: previousState.primary,
        to: emotionalResponse.primary,
        timestamp: emotionalResponse.timestamp,
        confidence: emotionalResponse.confidence
      };
      context.significantChanges.push(stateChange);
      context.historicalContext.stateChanges.push(stateChange);
    }

    // Update historical context
    this.updateHistoricalContext(context);

    // Update baseline emotion if needed
    this.updateBaselineEmotion(context);

    // Store updated context
    this.emotionalContexts.set(sessionId, context);

    // Notify subscribers
    this.notifySubscribers(sessionId, context);

    return context;
  }

  private isSignificantChange(
    previous: EmotionalResponse,
    current: EmotionalResponse
  ): boolean {
    // Consider it significant if:
    // 1. Primary emotion changed
    // 2. Intensity changed significantly (>20%)
    // 3. High confidence in the change (>0.7)
    return (
      previous.primary !== current.primary &&
      Math.abs(current.intensity - previous.intensity) > 0.2 &&
      current.confidence > 0.7
    );
  }

  private updateHistoricalContext(context: EmotionalContext): void {
    const { historicalContext, significantChanges } = context;
    const recentChanges = significantChanges.slice(-10); // Consider last 10 changes

    // Update emotional stability (inverse of change frequency)
    const timeSpan = this.getTimeSpanMinutes(recentChanges);
    const changeRate = recentChanges.length / Math.max(1, timeSpan);
    historicalContext.emotionalStability = Math.max(0, 1 - changeRate);

    // Update emotional variability (unique emotions / total changes)
    const uniqueEmotions = new Set(recentChanges.map(change => change.to));
    historicalContext.emotionalVariability = uniqueEmotions.size / Math.max(1, recentChanges.length);

    // Update average intensity
    const recentIntensities = recentChanges.map(change => {
      const state = this.findEmotionalResponse(context, change.timestamp);
      return state ? state.intensity : 0;
    });
    historicalContext.averageIntensity = this.calculateAverage(recentIntensities);

    // Update confidence score
    const recentConfidence = recentChanges.map(change => change.confidence);
    historicalContext.confidenceScore = this.calculateAverage(recentConfidence);

    // Update dominant emotion
    historicalContext.dominantEmotion = this.calculateDominantEmotion(context);

    // Update emotional trends
    historicalContext.trends = this.identifyEmotionalTrends(context);
  }

  private getTimeSpanMinutes(changes: EmotionalStateChange[]): number {
    if (changes.length < 2) return 1;
    const start = changes[0].timestamp;
    const end = changes[changes.length - 1].timestamp;
    return (end.getTime() - start.getTime()) / (1000 * 60);
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0
      ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length
      : 0;
  }

  private findEmotionalResponse(
    context: EmotionalContext,
    timestamp: Date
  ): EmotionalResponse | null {
    // In a real implementation, this would search through historical emotional responses
    // For now, we'll just return the current state
    return context.currentState;
  }

  private calculateDominantEmotion(context: EmotionalContext): EmotionType {
    const emotionCounts = new Map<EmotionType, number>();
    
    context.significantChanges.forEach(change => {
      emotionCounts.set(change.to, (emotionCounts.get(change.to) || 0) + 1);
    });

    let dominantEmotion: EmotionType = 'neutral';
    let maxCount = 0;

    emotionCounts.forEach((count, emotion) => {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    });

    return dominantEmotion;
  }

  private identifyEmotionalTrends(context: EmotionalContext): EmotionalTrend[] {
    const trends: EmotionalTrend[] = [];
    const changes = context.significantChanges;

    if (changes.length < 2) return trends;

    let currentTrend: {
      emotion: EmotionType;
      startTime: Date;
      intensities: number[];
      confidences: number[];
    } | null = null;

    changes.forEach((change, index) => {
      if (!currentTrend) {
        currentTrend = {
          emotion: change.to,
          startTime: change.timestamp,
          intensities: [],
          confidences: []
        };
      } else if (change.to !== currentTrend.emotion || index === changes.length - 1) {
        // End current trend
        const endTime = change.timestamp;
        const duration = (endTime.getTime() - currentTrend.startTime.getTime()) / 1000;

        if (duration >= 60) { // Only include trends lasting at least 1 minute
          trends.push({
            emotion: currentTrend.emotion,
            startTime: currentTrend.startTime,
            endTime,
            duration,
            averageIntensity: this.calculateAverage(currentTrend.intensities),
            confidence: this.calculateAverage(currentTrend.confidences)
          });
        }

        // Start new trend
        currentTrend = {
          emotion: change.to,
          startTime: change.timestamp,
          intensities: [],
          confidences: []
        };
      }

      // Add intensity and confidence to current trend
      const state = this.findEmotionalResponse(context, change.timestamp);
      if (state && currentTrend) {
        currentTrend.intensities.push(state.intensity);
        currentTrend.confidences.push(state.confidence);
      }
    });

    return trends;
  }

  private updateBaselineEmotion(context: EmotionalContext): void {
    // Update baseline emotion based on:
    // 1. Most frequent emotion in stable periods
    // 2. Emotion with lowest intensity variance
    // 3. Emotion with highest average confidence

    const emotionStats = new Map<EmotionType, {
      count: number;
      intensities: number[];
      confidences: number[];
    }>();

    context.significantChanges.forEach(change => {
      const stats = emotionStats.get(change.to) || {
        count: 0,
        intensities: [],
        confidences: []
      };

      const state = this.findEmotionalResponse(context, change.timestamp);
      if (state) {
        stats.count++;
        stats.intensities.push(state.intensity);
        stats.confidences.push(state.confidence);
      }

      emotionStats.set(change.to, stats);
    });

    let bestEmotion: EmotionType = 'neutral';
    let bestScore = -1;

    emotionStats.forEach((stats, emotion) => {
      const frequencyScore = stats.count / context.significantChanges.length;
      const stabilityScore = 1 - this.calculateVariance(stats.intensities);
      const confidenceScore = this.calculateAverage(stats.confidences);

      const totalScore = (frequencyScore + stabilityScore + confidenceScore) / 3;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestEmotion = emotion;
      }
    });

    context.baselineEmotion = bestEmotion;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = this.calculateAverage(numbers);
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return this.calculateAverage(squaredDiffs);
  }

  subscribeToEmotionalContext(
    sessionId: string,
    callback: (context: EmotionalContext) => void
  ): () => void {
    let subscribers = this.subscribers.get(sessionId);
    if (!subscribers) {
      subscribers = new Set();
      this.subscribers.set(sessionId, subscribers);
    }
    subscribers.add(callback);

    return () => {
      const subs = this.subscribers.get(sessionId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(sessionId);
        }
      }
    };
  }

  private notifySubscribers(sessionId: string, context: EmotionalContext): void {
    const subscribers = this.subscribers.get(sessionId);
    if (subscribers) {
      subscribers.forEach(callback => callback(context));
    }
  }

  async generateSessionSummary(
    sessionId: string,
    context: EmotionalContext
  ): Promise<EmotionalAnalysisMetrics> {
    return context.historicalContext;
  }
} 