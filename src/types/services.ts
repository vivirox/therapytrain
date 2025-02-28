import type { SessionStatus, SessionMetrics, SessionConfig, SessionMode } from './session';
import type { AnalyticsEvent, AnalyticsConfig } from './analytics';
import type { HIPAAEvent, HIPAAComplianceReport, HIPAAQueryFilters } from './hipaa';
import type { SecurityIncident, SecurityConfig } from './security';
import type { WebSocketMessage, WebSocketError } from './common';
import type { Session, SessionParticipant, SessionMessage } from './core/session';
import type { User, UserProfile } from './core/user';

// Service status
export type ServiceStatus = 'active' | 'inactive' | 'error' | 'initializing';

// Service event
export interface ServiceEvent<T = unknown> {
    type: string;
    data: T;
    timestamp: string;
    service: string;
}

// Base service configuration
export interface ServiceConfig {
    enabled: boolean;
    settings: Record<string, unknown>;
}

// Service interfaces
export interface AnalyticsService {
    trackEvent(event: AnalyticsEvent): Promise<void>;
    getConfig(): Promise<AnalyticsConfig>;
    generateReport(startDate: string, endDate: string): Promise<unknown>;
}

export interface SecurityService {
    reportIncident(incident: SecurityIncident): Promise<void>;
    getConfig(): Promise<SecurityConfig>;
    audit(startDate: string, endDate: string): Promise<unknown>;
}

export interface HIPAAService {
    logEvent(event: HIPAAEvent): Promise<void>;
    generateReport(): Promise<HIPAAComplianceReport>;
    query(filters: HIPAAQueryFilters): Promise<unknown>;
}

export interface SessionService {
    getStatus(sessionId: string): Promise<SessionStatus>;
    getMode(sessionId: string): Promise<SessionMode>;
    getMetrics(sessionId: string): Promise<SessionMetrics>;
    getConfig(sessionId: string): Promise<SessionConfig>;
    createSession(session: Session): Promise<Session>;
    getSession(sessionId: string): Promise<Session>;
    updateSession(sessionId: string, update: Partial<Session>): Promise<Session>;
    deleteSession(sessionId: string): Promise<void>;
    listSessions(userId: string): Promise<Array<Session>>;
    getSessionHistory(userId: string): Promise<Array<SessionState>>;
    getSessionState(sessionId: string): Promise<SessionState>;
}

export interface WebSocketService {
    send<T>(message: WebSocketMessage<T>): Promise<void>;
    onError(handler: (error: WebSocketError) => void): void;
    onMessage<T>(handler: (message: WebSocketMessage<T>) => void): void;
    connect(): Promise<void>;
    disconnect(): void;
}

// Common types used across services
export interface BaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends BaseResponse {
  data: Array<T>;
  total: number;
  page: number;
  limit: number;
}

// Analytics Service Types
export interface AnalyticsMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  userEngagement: number;
  learningProgress: number;
}

export interface SessionAnalyticsService {
  analyzeSession(sessionId: string): Promise<SessionMetrics>;
  getSessionHistory(userId: string): Promise<Array<SessionState>>;
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
  getAuditLog(filters: HIPAAQueryFilters): Promise<Array<HIPAAAuditEvent>>;
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
  getHistory(sessionId: string): Promise<Array<unknown>>;
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
  getRecommendations(userId: string): Promise<Array<unknown>>;
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
  recentEvents: Array<AnalyticsEvent>;
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

export interface aiAnalyticsService {
  generateAIInsights(data: unknown): Promise<unknown>;
  generatePersonalizedCurriculum(userId: string): Promise<unknown>;
  predictLearningChallenges(userId: string): Promise<unknown>;
}

// Session Manager
export interface SessionManagerService {
  createSession(userId: string, config: SessionConfig): Promise<string>;
  endSession(sessionId: string): Promise<void>;
  getSessionState(sessionId: string): Promise<SessionState>;
  updateSessionMode(sessionId: string, mode: SessionMode): Promise<void>;
}

export interface SessionState {
    id: string;
    status: string;
    participants: Array<SessionParticipant>;
    messages: Array<SessionMessage>;
    metadata: Record<string, unknown>;
}

export interface HIPAAAuditEvent {
    id: string;
    timestamp: string;
    eventType: string;
    actionType: string;
    userId: string;
    resourceId: string;
    resourceType: string;
    details: Record<string, unknown>;
}

export interface RiskMetrics {
    sessionId: string;
    timestamp: string;
    riskLevel: 'low' | 'medium' | 'high';
    factors: Array<string>;
    score: number;
    confidence: number;
    metadata: Record<string, unknown>;
}

export interface AuditService {
    logEvent(event: HIPAAAuditEvent): Promise<void>;
    getAuditLog(filters: HIPAAQueryFilters): Promise<Array<HIPAAAuditEvent>>;
}

export interface RiskService {
    predictRisk(sessionId: string): Promise<RiskMetrics>;
    generateAlert(risk: RiskMetrics): Promise<void>;
} 