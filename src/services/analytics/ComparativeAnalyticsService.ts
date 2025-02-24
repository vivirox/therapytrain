import { EventEmitter } from 'events';
import { QualityMetricsService } from '../QualityMetricsService';
import { AnalyticsService } from '../analytics';
import { ComprehensiveQualityMetrics, TherapeuticMetrics, EmotionalMetrics } from '@/types/metrics';
import { SessionState } from '@/types';

interface ComparisonResult {
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  percentDifference: number;
  trend: 'improving' | 'stable' | 'declining';
  significance: number;
}

interface ComparisonCriteria {
  timeframe: 'session' | 'day' | 'week' | 'month';
  metrics: string[];
  therapyType?: string;
  clientGroup?: string;
}

@singleton()
export class ComparativeAnalyticsService extends EventEmitter {
  private static instance: ComparativeAnalyticsService;
  private readonly qualityMetrics: QualityMetricsService;
  private readonly analytics: AnalyticsService;
  private readonly benchmarkCache: Map<string, ComprehensiveQualityMetrics>;
  private readonly CACHE_DURATION = 3600000; // 1 hour

  private constructor() {
    super();
    this.qualityMetrics = QualityMetricsService.getInstance();
    this.analytics = AnalyticsService.getInstance();
    this.benchmarkCache = new Map();
  }

  public static getInstance(): ComparativeAnalyticsService {
    if (!ComparativeAnalyticsService.instance) {
      ComparativeAnalyticsService.instance = new ComparativeAnalyticsService();
    }
    return ComparativeAnalyticsService.instance;
  }

  async compareWithBenchmark(
    sessionId: string,
    criteria: ComparisonCriteria
  ): Promise<Array<ComparisonResult>> {
    const currentMetrics = await this.qualityMetrics.getComprehensiveMetrics(sessionId);
    const benchmark = await this.getBenchmarkMetrics(criteria);
    
    return this.generateComparison(currentMetrics, benchmark, criteria.metrics);
  }

  async compareSessions(
    sessionIds: string[],
    criteria: ComparisonCriteria
  ): Promise<Record<string, Array<ComparisonResult>>> {
    const metricsPromises = sessionIds.map(id => 
      this.qualityMetrics.getComprehensiveMetrics(id)
    );
    
    const sessionsMetrics = await Promise.all(metricsPromises);
    const results: Record<string, Array<ComparisonResult>> = {};
    
    for (let i = 0; i < sessionIds.length; i++) {
      const otherSessions = sessionsMetrics.filter((_, index) => index !== i);
      const averageMetrics = this.calculateAverageMetrics(otherSessions);
      results[sessionIds[i]] = this.generateComparison(
        sessionsMetrics[i],
        averageMetrics,
        criteria.metrics
      );
    }
    
    return results;
  }

  async getPerformanceTrends(
    sessionId: string,
    timeframe: string
  ): Promise<Record<string, Array<{ timestamp: Date; value: number }>>> {
    const metrics = await this.qualityMetrics.getComprehensiveMetrics(sessionId);
    const trends: Record<string, Array<{ timestamp: Date; value: number }>> = {};
    
    // Extract trends for each metric category
    Object.entries(metrics.metrics).forEach(([category, data]) => {
      if (typeof data.value === 'object') {
        Object.entries(data.value).forEach(([metric, value]) => {
          if (typeof value === 'number') {
            const key = `${category}_${metric}`;
            trends[key] = this.calculateTrendPoints(value, timeframe);
          }
        });
      }
    });
    
    return trends;
  }

  private async getBenchmarkMetrics(
    criteria: ComparisonCriteria
  ): Promise<ComprehensiveQualityMetrics> {
    const cacheKey = this.generateCacheKey(criteria);
    const cached = this.benchmarkCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const benchmark = await this.qualityMetrics.getBenchmarks(
      criteria.therapyType || 'general'
    );
    
    this.benchmarkCache.set(cacheKey, benchmark);
    setTimeout(() => this.benchmarkCache.delete(cacheKey), this.CACHE_DURATION);
    
    return benchmark;
  }

  private generateComparison(
    current: ComprehensiveQualityMetrics,
    benchmark: ComprehensiveQualityMetrics,
    metrics: string[]
  ): Array<ComparisonResult> {
    const results: Array<ComparisonResult> = [];
    
    metrics.forEach(metric => {
      const [category, subMetric] = metric.split('.');
      const currentValue = this.extractMetricValue(current, category, subMetric);
      const benchmarkValue = this.extractMetricValue(benchmark, category, subMetric);
      
      if (currentValue !== null && benchmarkValue !== null) {
        const percentDifference = ((currentValue - benchmarkValue) / benchmarkValue) * 100;
        results.push({
          metric,
          currentValue,
          benchmarkValue,
          percentDifference,
          trend: this.determineTrend(percentDifference),
          significance: this.calculateSignificance(percentDifference)
        });
      }
    });
    
    return results;
  }

  private extractMetricValue(
    metrics: ComprehensiveQualityMetrics,
    category: string,
    subMetric: string
  ): number | null {
    try {
      if (category in metrics.metrics) {
        const categoryData = metrics.metrics[category as keyof typeof metrics.metrics];
        if (subMetric in categoryData.value) {
          return categoryData.value[subMetric as keyof typeof categoryData.value] as number;
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting metric value:', error);
      return null;
    }
  }

  private calculateAverageMetrics(
    metricsArray: ComprehensiveQualityMetrics[]
  ): ComprehensiveQualityMetrics {
    const template = metricsArray[0];
    const result = JSON.parse(JSON.stringify(template));
    
    Object.keys(template.metrics).forEach(category => {
      Object.keys(template.metrics[category as keyof typeof template.metrics].value).forEach(metric => {
        const values = metricsArray.map(m => 
          m.metrics[category as keyof typeof m.metrics].value[metric as keyof typeof m.metrics[typeof category]['value']]
        );
        const average = values.reduce((a, b) => (a as number) + (b as number), 0) as number / values.length;
        result.metrics[category as keyof typeof result.metrics].value[metric as keyof typeof result.metrics[typeof category]['value']] = average;
      });
    });
    
    return result;
  }

  private calculateTrendPoints(
    currentValue: number,
    timeframe: string
  ): Array<{ timestamp: Date; value: number }> {
    const points: Array<{ timestamp: Date; value: number }> = [];
    const now = new Date();
    const intervals = this.getTimeframeIntervals(timeframe);
    
    for (let i = 0; i < intervals; i++) {
      points.push({
        timestamp: new Date(now.getTime() - (i * this.getIntervalDuration(timeframe))),
        value: currentValue * (1 + (Math.random() * 0.2 - 0.1)) // Simulate historical values
      });
    }
    
    return points.reverse();
  }

  private getTimeframeIntervals(timeframe: string): number {
    switch (timeframe) {
      case 'hour': return 12;
      case 'day': return 24;
      case 'week': return 7;
      case 'month': return 30;
      default: return 10;
    }
  }

  private getIntervalDuration(timeframe: string): number {
    switch (timeframe) {
      case 'hour': return 300000; // 5 minutes
      case 'day': return 3600000; // 1 hour
      case 'week': return 86400000; // 1 day
      case 'month': return 86400000; // 1 day
      default: return 3600000;
    }
  }

  private determineTrend(percentDifference: number): 'improving' | 'stable' | 'declining' {
    if (percentDifference > 5) return 'improving';
    if (percentDifference < -5) return 'declining';
    return 'stable';
  }

  private calculateSignificance(percentDifference: number): number {
    return Math.min(Math.abs(percentDifference) / 10, 1);
  }

  private generateCacheKey(criteria: ComparisonCriteria): string {
    return `${criteria.timeframe}_${criteria.therapyType || 'general'}_${criteria.clientGroup || 'all'}`;
  }
} 