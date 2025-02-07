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
  sentiment: number;
  intensity: number;
  valence: number;
  arousal: number;
  dominance: number;
}

export interface EngagementMetrics {
  responseTime: number;
  messageLength: number;
  interactionFrequency: number;
  topicContinuity: number;
  questionResponseRate: number;
}

export interface TherapeuticMetrics {
  insightLevel: number;
  resistanceLevel: number;
  allianceStrength: number;
  goalProgress: number;
  symptomChange: number;
}

export interface RiskMetrics {
  suicidalityRisk: number;
  crisisRisk: number;
  deteriorationRisk: number;
  dropoutRisk: number;
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

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  unit: string;
  type: 'numeric' | 'percentage' | 'categorical' | 'boolean';
  range?: MetricRange;
  thresholds?: {
    warning: number;
    critical: number;
  };
  tags: string[];
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
