import { BaseEntity, Metadata } from './common';

export interface InterventionMetrics {
  interventionId: string;
  type: string;
  timestamp: number;
  metrics: {
    effectiveness: number;
    clientEngagement: number;
    emotionalImpact: number;
    longTermProgress: number;
  };
  sessionId: string;
}

export interface SessionMetrics {
  effectiveness: number;
  duration: number;
  averageSentiment: number;
  engagementScore: number;
  interventionCount: number;
  responseRate: number;
  topicsCovered: Array<string>;
  keyInsights: Array<string>;
  progressTowardsGoals: number;
}

export interface EmotionalMetrics {
  valence: number;
  arousal: number;
  dominance: number;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotions: {
    [emotion: string]: number;
  };
  metadata?: Metadata;
}

export interface EngagementMetrics {
  attention: number;
  participation: number;
  responsiveness: number;
  interaction_quality: number;
  session_continuity: number;
  metadata?: Metadata;
}

export interface TherapeuticMetrics {
  progress: number;
  engagement: number;
  rapport: number;
  understanding: number;
  goal_alignment: number;
  intervention_effectiveness: number;
  risk_level: 'low' | 'medium' | 'high';
  metadata?: Metadata;
}

export interface RiskMetrics {
  overall: number;
  categories: {
    self_harm: number;
    suicide: number;
    violence: number;
    substance_use: number;
    crisis: number;
  };
  flags: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    details: string;
    timestamp: string;
  }>;
  metadata?: Metadata;
}

export interface ComplianceMetrics {
  homeworkCompletion: number;
  sessionAttendance: number;
  exerciseAdherence: number;
  medicationAdherence?: number;
}

export interface OutcomeMetrics {
  symptomReduction: number;
  functionalImprovement: number;
  qualityOfLife: number;
  clientSatisfaction: number;
  treatmentProgress: number;
}

export interface AggregateMetrics {
  emotional: EmotionalMetrics;
  engagement: EngagementMetrics;
  therapeutic: TherapeuticMetrics;
  risk: RiskMetrics;
  compliance: ComplianceMetrics;
  outcome: OutcomeMetrics;
  timestamp: number;
  sessionId: string;
}

export interface Metric extends BaseEntity {
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
  metadata?: Metadata;
}

export interface MetricDefinition {
  name: string;
  description: string;
  unit?: string;
  type: 'number' | 'percentage' | 'duration' | 'count';
  range?: {
    min: number;
    max: number;
  };
  thresholds?: {
    warning: number;
    critical: number;
  };
  metadata?: Metadata;
}

export interface MetricValue {
  metricId: string;
  value: number | string | boolean;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface MetricRange {
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  therapeutic: TherapeuticMetrics;
  emotional: EmotionalMetrics;
  engagement: EngagementMetrics;
  risk: RiskMetrics;
  metadata?: Metadata;
}

export interface MetricsTimeSeries {
  metric_name: string;
  data_points: Array<{
    timestamp: string;
    value: number;
    metadata?: Metadata;
  }>;
  interval: 'minute' | 'hour' | 'day' | 'week' | 'month';
  metadata?: Metadata;
}

export interface MetricsAggregation {
  metric_name: string;
  period: {
    start: string;
    end: string;
  };
  stats: {
    min: number;
    max: number;
    avg: number;
    sum: number;
    count: number;
    std_dev?: number;
  };
  metadata?: Metadata;
}

export interface MetricsManager {
  recordMetric: (metric: Omit<Metric, 'id' | 'created_at'>) => Promise<Metric>;
  getMetric: (metric_id: string) => Promise<Metric>;
  getMetrics: (options: {
    names?: string[];
    start_time?: string;
    end_time?: string;
    limit?: number;
  }) => Promise<Metric[]>;
  getTimeSeries: (metric_name: string, interval: string) => Promise<MetricsTimeSeries>;
  getAggregation: (metric_name: string, period: { start: string; end: string }) => Promise<MetricsAggregation>;
  getSnapshot: () => Promise<MetricsSnapshot>;
}

export interface QualityBenchmark {
  therapyType: string;
  metrics: {
    minAcceptable: number;
    target: number;
    exceptional: number;
  };
  context: {
    sessionCount: number;
    clientDemographics?: Record<string, any>;
    condition?: string;
    severity?: 'mild' | 'moderate' | 'severe';
  };
  metadata?: Metadata;
}

export interface ComprehensiveQualityMetrics {
  sessionId: string;
  timestamp: number;
  
  // Core metrics with weights for holistic scoring
  metrics: {
    therapeutic: {
      value: TherapeuticMetrics;
      weight: number;
    };
    engagement: {
      value: EngagementMetrics;
      weight: number;
    };
    emotional: {
      value: EmotionalMetrics;
      weight: number;
    };
    outcome: {
      value: OutcomeMetrics;
      weight: number;
    };
    compliance: {
      value: ComplianceMetrics;
      weight: number;
    };
  };
  
  // Holistic scoring
  scores: {
    overall: number;
    categoryScores: {
      therapeuticProgress: number;
      clientEngagement: number;
      emotionalRegulation: number;
      treatmentAdherence: number;
      outcomeProgress: number;
    };
  };
  
  // Comparative analysis
  benchmarks: {
    therapyType: string;
    performance: {
      percentile: number;
      relativeToBenchmark: 'below' | 'meeting' | 'exceeding';
      areasForImprovement: string[];
      strengths: string[];
    };
  };
  
  // Quality standards compliance
  qualityStandards: {
    hipaaCompliance: boolean;
    ethicalGuidelines: boolean;
    bestPractices: boolean;
    documentationQuality: number;
    issuesIdentified: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendedAction: string;
    }>;
  };
  
  // Trend analysis
  trends: {
    shortTerm: {
      direction: 'improving' | 'stable' | 'declining';
      rate: number;
      significance: number;
    };
    longTerm: {
      direction: 'improving' | 'stable' | 'declining';
      rate: number;
      significance: number;
    };
  };
  
  // AI-assisted insights
  insights: {
    keyObservations: string[];
    recommendations: string[];
    riskFactors: string[];
    successFactors: string[];
  };
  
  metadata?: Metadata;
}

export interface QualityMetricsManager extends MetricsManager {
  // Comprehensive quality metrics methods
  getComprehensiveMetrics: (sessionId: string) => Promise<ComprehensiveQualityMetrics>;
  updateBenchmarks: (therapyType: string, metrics: QualityBenchmark) => Promise<void>;
  getBenchmarks: (therapyType: string) => Promise<QualityBenchmark>;
  
  // Analysis methods
  analyzeQualityTrends: (sessionIds: string[], period: { start: string; end: string }) => Promise<{
    trends: ComprehensiveQualityMetrics['trends'];
    insights: ComprehensiveQualityMetrics['insights'];
  }>;
  
  // Reporting methods
  generateQualityReport: (sessionId: string) => Promise<{
    metrics: ComprehensiveQualityMetrics;
    recommendations: string[];
    complianceStatus: Record<string, boolean>;
  }>;
  
  // Benchmark management
  calculatePerformancePercentile: (metrics: ComprehensiveQualityMetrics, therapyType: string) => Promise<number>;
  identifyAreasForImprovement: (metrics: ComprehensiveQualityMetrics) => Promise<string[]>;
}
