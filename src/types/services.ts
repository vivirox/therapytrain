import { SessionState, SessionMode, SessionMetrics, SessionConfig } from './session';
import { EmotionalMetrics, EngagementMetrics, TherapeuticMetrics, RiskMetrics } from './metrics';
import { HIPAAAuditEvent, HIPAAComplianceReport, HIPAAQueryFilters } from '@/backend/src/types/hipaa';
import { SecurityIncident } from '@/backend/src/types/security';

// Common types used across services
export interface BaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends BaseResponse {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Analytics Service Types
export interface AnalyticsEvent {
  type: string;
  timestamp: number;
  userId: string;
  data: Record<string, unknown>;
}

export interface AnalyticsMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  userEngagement: number;
  learningProgress: number;
}

export interface AnalyticsService {
  trackEvent(event: AnalyticsEvent): Promise<void>;
  getMetrics(userId: string): Promise<AnalyticsMetrics>;
  generateReport(startDate: Date, endDate: Date): Promise<unknown>;
}

// Session Analytics Types
export interface SessionMetrics {
  duration: number;
  engagement: number;
  progress: number;
  completedObjectives: string[];
}

export interface SessionAnalyticsService {
  trackSession(sessionId: string, metrics: SessionMetrics): Promise<void>;
  getSessionStats(sessionId: string): Promise<SessionMetrics>;
  analyzeProgress(userId: string): Promise<unknown>;
}

// API Service Types
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
}

export interface ApiService {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: unknown): Promise<T>;
  put<T>(url: string, data: unknown): Promise<T>;
  delete<T>(url: string): Promise<T>;
  setAuthToken(token: string): void;
  clearAuthToken(): void;
}

// Audit Logger Types
export interface AuditEvent {
  type: string;
  userId: string;
  action: string;
  timestamp: number;
  details: Record<string, unknown>;
}

export interface AuditLoggerService {
  logEvent(event: AuditEvent): Promise<void>;
  getEvents(filters: Record<string, unknown>): Promise<AuditEvent[]>;
  generateComplianceReport(startDate: Date, endDate: Date): Promise<unknown>;
}

// Chat Service Types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

export interface ChatService {
  sendMessage(sessionId: string, message: string): Promise<Message>;
  getHistory(sessionId: string): Promise<Message[]>;
  startSession(userId: string): Promise<string>;
  endSession(sessionId: string): Promise<void>;
}

// Crisis Prediction Types
export interface RiskIndicator {
  type: string;
  severity: number;
  confidence: number;
  timestamp: number;
}

export interface CrisisPredictionService {
  assessRisk(userId: string, sessionData: unknown): Promise<RiskIndicator>;
  getAlertConfig(clientId: string): Promise<unknown>;
  updateAlertConfig(clientId: string, config: unknown): Promise<void>;
  monitorSession(sessionId: string): Promise<void>;
}

// Intervention Metrics Types
export interface Intervention {
  id: string;
  type: string;
  timestamp: number;
  effectiveness: number;
  clientResponse: string;
}

export interface InterventionMetricsService {
  trackIntervention(intervention: Intervention): Promise<string>;
  getEffectiveness(interventionId: string): Promise<number>;
  analyzePatterns(userId: string): Promise<unknown>;
}

// Learning Path Types
export interface SkillProgress {
  skillId: string;
  level: number;
  progress: number;
  lastUpdated: number;
}

export interface LearningPathService {
  updateProgress(userId: string, progress: SkillProgress): Promise<void>;
  getRecommendations(userId: string): Promise<unknown>;
  generatePath(userId: string, goals: string[]): Promise<unknown>;
}

// Contextual Learning Types
export interface LearningContext {
  userId: string;
  currentSkills: Record<string, number>;
  learningStyle: string;
  preferences: Record<string, unknown>;
}

export interface ContextualLearningService {
  analyzeContext(userId: string): Promise<LearningContext>;
  updateContext(userId: string, context: Partial<LearningContext>): Promise<void>;
  getPersonalizedContent(userId: string): Promise<unknown>;
}

// Real-time Analytics Types
export interface RealTimeMetrics {
  activeUsers: number;
  currentSessions: number;
  recentEvents: AnalyticsEvent[];
}

export interface RealTimeAnalyticsService {
  subscribeToMetrics(callback: (metrics: RealTimeMetrics) => void): () => void;
  getSnapshot(): Promise<RealTimeMetrics>;
  trackRealTimeEvent(event: AnalyticsEvent): Promise<void>;
}

// AI Analytics Types
export interface AIInsight {
  type: string;
  confidence: number;
  recommendation: string;
  data: Record<string, unknown>;
}

export interface AIAnalyticsService {
  generateInsights(userId: string): Promise<AIInsight[]>;
  predictBehavior(userId: string, context: unknown): Promise<unknown>;
  optimizeLearningPath(userId: string): Promise<unknown>;
}

export interface RealTimeAnalyticsService {
  startTracking(sessionId: string): void;
  stopTracking(sessionId: string): void;
  updateMetrics(sessionId: string, metrics: {
    emotional?: EmotionalMetrics;
    engagement?: EngagementMetrics;
    therapeutic?: TherapeuticMetrics;
    risk?: RiskMetrics;
  }): Promise<void>;
  getRealtimeMetrics(sessionId: string): Promise<{
    emotional: EmotionalMetrics;
    engagement: EngagementMetrics;
    therapeutic: TherapeuticMetrics;
    risk: RiskMetrics;
  }>;
}

export interface ApiService {
  get<T>(url: string, config?: Record<string, any>): Promise<T>;
  post<T>(url: string, data?: any, config?: Record<string, any>): Promise<T>;
  put<T>(url: string, data?: any, config?: Record<string, any>): Promise<T>;
  delete<T>(url: string, config?: Record<string, any>): Promise<T>;
  sessions: {
    start(clientId: string, mode: SessionMode): Promise<SessionState>;
    end(sessionId: string): Promise<void>;
    switchMode(sessionId: string, newMode: SessionMode): Promise<void>;
  };
}

export interface AuditLoggerService {
  logEvent(event: HIPAAAuditEvent): Promise<string>;
  queryEvents(filters: HIPAAQueryFilters): Promise<HIPAAAuditEvent[]>;
  generateComplianceReport(startDate: Date, endDate: Date): Promise<HIPAAComplianceReport>;
  handleSecurityIncident(incident: SecurityIncident): Promise<void>;
}

export interface ChatService {
  sendMessage(sessionId: string, message: string): Promise<void>;
  getMessageHistory(sessionId: string): Promise<Array<{
    content: string;
    sender: string;
    timestamp: Date;
  }>>;
  startSession(config: SessionConfig): Promise<string>;
  endSession(sessionId: string): Promise<void>;
}

export interface ContextualLearningService {
  analyzeContext(sessionId: string): Promise<Record<string, any>>;
  generateRecommendations(context: Record<string, any>): Promise<Array<string>>;
  trackLearningProgress(userId: string, data: Record<string, any>): Promise<void>;
  updateLearningPath(userId: string, updates: Record<string, any>): Promise<void>;
}

export interface CrisisPredictionService {
  assessRisk(sessionId: string): Promise<{
    riskLevel: number;
    factors: string[];
    recommendations: string[];
  }>;
  monitorSession(sessionId: string): Promise<void>;
  getAlerts(clientId: string): Promise<Array<{
    type: string;
    severity: string;
    timestamp: Date;
    details: Record<string, any>;
  }>>;
  updateAlertConfig(config: Record<string, any>): Promise<void>;
}

export interface InterventionMetricsService {
  trackIntervention(intervention: {
    type: string;
    sessionId: string;
    timestamp: Date;
    details: Record<string, any>;
  }): Promise<string>;
  getInterventionEffectiveness(interventionId: string): Promise<number>;
  analyzeInterventionPatterns(clientId: string): Promise<Record<string, any>>;
  generateInterventionReport(timeRange: { start: Date; end: Date }): Promise<any>;
}

export interface LearningPathService {
  createPath(userId: string, preferences: Record<string, any>): Promise<void>;
  updateProgress(userId: string, progress: Record<string, any>): Promise<void>;
  getRecommendations(userId: string): Promise<Array<{
    type: string;
    content: string;
    priority: number;
  }>>;
  adjustPath(userId: string, adjustments: Record<string, any>): Promise<void>;
} 