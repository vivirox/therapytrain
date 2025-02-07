import { SessionState, SessionMode, SessionMetrics, SessionConfig } from "./session";
import { EmotionalMetrics, EngagementMetrics, TherapeuticMetrics, RiskMetrics } from "./metrics";
import { HIPAAAuditEvent, HIPAAComplianceReport, HIPAAQueryFilters } from "./hipaa";
import { SecurityIncident } from "./security";

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
  trackEvent(event: string, data: Record<string, unknown>): Promise<void>;
  getMetrics(timeframe: string): Promise<Record<string, number>>;
  generateReport(filters: Record<string, unknown>): Promise<unknown>;
}

// Session Analytics Types
export interface SessionMetrics {
  duration: number;
  engagement: number;
  progress: number;
  completedObjectives: string[];
}

export interface SessionAnalyticsService {
  analyzeSession(sessionId: string): Promise<SessionMetrics>;
  getSessionHistory(userId: string): Promise<SessionState[]>;
  generateSessionReport(sessionId: string): Promise<unknown>;
}

// API Service Types
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
}

export interface ApiService {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data: unknown): Promise<T>;
  put<T>(endpoint: string, data: unknown): Promise<T>;
  delete(endpoint: string): Promise<void>;
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
  logEvent(event: HIPAAAuditEvent): Promise<void>;
  getAuditLog(filters: HIPAAQueryFilters): Promise<HIPAAAuditEvent[]>;
  generateComplianceReport(): Promise<HIPAAComplianceReport>;
}

// Chat Service Types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

export interface ChatService {
  sendMessage(sessionId: string, message: string): Promise<void>;
  getHistory(sessionId: string): Promise<unknown[]>;
  analyzeChat(sessionId: string): Promise<unknown>;
}

// Crisis Prediction Types
export interface RiskIndicator {
  type: string;
  severity: number;
  confidence: number;
  timestamp: number;
}

export interface CrisisPredictionService {
  predictRisk(sessionId: string): Promise<RiskMetrics>;
  generateAlert(risk: RiskMetrics): Promise<void>;
  updateRiskModel(data: unknown): Promise<void>;
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
  trackIntervention(sessionId: string, intervention: unknown): Promise<void>;
  getEffectiveness(interventionId: string): Promise<number>;
  generateReport(timeframe: string): Promise<unknown>;
}

// Learning Path Types
export interface SkillProgress {
  skillId: string;
  level: number;
  progress: number;
  lastUpdated: number;
}

export interface LearningPathService {
  createPath(userId: string): Promise<void>;
  updateProgress(userId: string, progress: unknown): Promise<void>;
  getRecommendations(userId: string): Promise<unknown[]>;
}

// Contextual Learning Types
export interface LearningContext {
  userId: string;
  currentSkills: Record<string, number>;
  learningStyle: string;
  preferences: Record<string, unknown>;
}

export interface ContextualLearningService {
  analyzeContext(data: unknown): Promise<unknown>;
  generateRecommendations(userId: string): Promise<unknown>;
  updateLearningPath(userId: string, progress: unknown): Promise<void>;
}

// Real-time Analytics Types
export interface RealTimeMetrics {
  activeUsers: number;
  currentSessions: number;
  recentEvents: AnalyticsEvent[];
}

export interface RealTimeAnalyticsService {
  startTracking(sessionId: string): void;
  stopTracking(sessionId: string): void;
  getRealtimeMetrics(sessionId: string): Promise<Record<string, number>>;
}

// AI Analytics Types
export interface AIInsight {
  type: string;
  confidence: number;
  recommendation: string;
  data: Record<string, unknown>;
}

export interface AIAnalyticsService {
  generateAIInsights(data: unknown): Promise<unknown>;
  generatePersonalizedCurriculum(userId: string): Promise<unknown>;
  predictLearningChallenges(userId: string): Promise<unknown>;
}

// Security Service
export interface SecurityService {
  validateAccess(userId: string, resource: string): Promise<boolean>;
  logSecurityEvent(incident: SecurityIncident): Promise<void>;
  generateSecurityReport(): Promise<unknown>;
}

// Session Manager
export interface SessionManagerService {
  createSession(userId: string, config: SessionConfig): Promise<string>;
  endSession(sessionId: string): Promise<void>;
  getSessionState(sessionId: string): Promise<SessionState>;
  updateSessionMode(sessionId: string, mode: SessionMode): Promise<void>;
} 