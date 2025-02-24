/**
 * Core type definitions
 * @module core
 */

// Re-export common types
export * from '../common'

// Re-export database types
export * from '../database.types'

// Re-export supabase types
export * from '../supabase'

// Re-export auth types
export * from '../auth'

// Re-export user types
export * from '../user'

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

// Re-export user types
export type {
    UserProfile,
    UserCredentials,
    UserSession,
    UserPreferences,
    UserRole,
    UserStats
} from '@/user';

// Re-export auth types
export type {
    AuthState,
    AuthContextType,
    AuthCredentials,
    AuthConfig,
    AuthProvider,
    AuthMethod
} from '@/auth';

// Re-export session types
export type {
    SessionStatus,
    SessionMode,
    SessionMetrics,
    SessionConfig
} from '@/session';

// Re-export type guards
export {
    isDefined,
    isObject,
    isArray
} from '@/common';

// Re-export user type guards
export {
    isUserProfile
} from '@/user';

// Re-export auth type guards
export {
    isAuthResult
} from '@/auth'; 