/**
 * Core type definitions
 * @module core
 */

// Export common types
export type {
  Nullable,
  Optional,
  DeepPartial,
  ApiResponse,
  ErrorResponse,
  SuccessResponse,
  Timestamps,
  Metadata,
  Auditable,
  Statusable,
  BaseEntity,
} from '../common'

// Export query types
export type {
  PaginationParams,
  SortingParams,
  FilterParams,
  QueryParams,
} from '../query'

// Export WebSocket types
export type {
  WebSocketMessage,
  WebSocketError,
  WebSocketEvent,
} from '../websocket'

// Export analytics types
export type {
  AnalyticsEvent,
  MetricValue,
} from '../analytics'

// Export time types
export type {
  TimeRange,
  DateRange,
  TimeSlot,
  Schedule,
} from '../time'

// Export notification types
export type {
  Notification,
  Settings,
} from '../notifications'

// Export user types
export type {
  User,
  UserProfile,
  UserCredentials,
  UserSession,
  UserPreferences,
  UserRole,
  UserStats,
  UserRow,
  UserInsert,
  UserUpdate,
  UserStatus,
  isUserProfile,
} from '../user'

// Export auth types
export type {
  AuthState,
  AuthContextType,
  AuthCredentials,
  AuthConfig,
  AuthProvider,
  AuthMethod,
  AuthResult,
  isAuthResult,
} from '../auth'

// Export session types
export type {
  Session,
  SessionStatus,
  SessionMode,
  SessionMetrics,
  SessionConfig,
  SessionRow,
  SessionInsert,
  SessionUpdate,
  SessionWithParticipants,
  SessionParticipant,
  SessionMessage,
} from '../session'

// Export chat types
export type {
  Message,
  Thread,
  ChatMessage,
  ChatSession,
  ChatContext,
  ChatService,
  MessageType,
  MessageStatus,
  ThreadStatus,
  ThreadWithDetails,
  MessageRow,
  MessageInsert,
  MessageUpdate,
  ThreadRow,
  ThreadInsert,
  ThreadUpdate,
  ChatAnalytics,
} from '../chat'

// Export metrics types
export type {
  Metric,
  MetricType,
  MetricConfig,
  MetricRow,
} from '../metrics'

// Export security types
export type {
  SecurityConfig,
  SecurityContext,
  SecurityProvider,
  SecurityService,
} from '../security'

// Export analytics types
export type {
  AnalyticsConfig,
  AnalyticsContext,
  AnalyticsProvider,
} from '../analytics'

// Export service types
export type {
  Service,
  ServiceConfig,
  ServiceContext,
  ServiceProvider,
} from '../services'

// Export UI types
export type {
  Theme,
  ThemeConfig,
  ThemeContext,
  ThemeProvider,
} from '../ui'

// Export type guards
export {
  isDefined,
  isObject,
  isArray,
} from '../common'

export {
  isUser,
  isUserProfile,
} from '../user'

export {
  isSession,
  isMessage,
} from '../session'

export {
  isThread,
  isChatMessage,
} from '../chat'

// Re-export database types
export * from '../database.types'

// Re-export supabase types
export * from '../supabase'

// Re-export session types
export * from '../session'

// Re-export chat types
export * from '../chat'

// Re-export metrics types
export * from '../metrics'

// Re-export security types
export * from '../security'

// Re-export analytics types
export * from '../analytics'

// Re-export services types
export * from '../services'

// Re-export UI types
export * from '../ui'

// Type guards
export {
  isUser,
  isUserProfile,
  isSession,
  isMessage,
  isClient,
  isClientProfile,
  isIntervention,
  isAssessment,
  isAppointment,
  isAlert,
  isFeedback,
  isResource,
  isSetting,
} from '../type-guards'

// Re-export base types from common
export type {
    Nullable,
    Optional,
    DeepPartial,
    ApiResponse,
    ErrorResponse,
    SuccessResponse,
    Timestamps,
    Metadata,
    Auditable,
    Statusable,
    BaseEntity,
    PaginationParams,
    SortingParams,
    FilterParams,
    QueryParams,
    WebSocketMessage,
    WebSocketError,
    WebSocketEvent,
    AnalyticsEvent,
    MetricValue,
    TimeRange,
    DateRange,
    TimeSlot,
    Schedule,
    Notification,
    Settings
} from '@/common';

// Re-export user type guards
export {
    isUserProfile
} from '@/user';

// Re-export auth type guards
export {
    isAuthResult
} from '@/auth'; 