// Authentication Types
export type { User } from '@/auth'
export type { AuthProviderProps } from '@/componentprops'

// Client Types
export type { Client } from '@/client'
export type { ClientProfile } from '@/clientprofile'
export type { ClientSession } from '@/session'

// Analytics Types
export type { 
  LearningAnalytics, 
  SkillGrowth,
  AnalyticsData,
  MetricsData 
} from '@/analytics'

// Service Types
export type { 
  ApiService,
  AIAnalyticsService,
  DataService,
  ServiceConfig,
  ServiceStatus 
} from '@/services'

// Component Types
export type { 
  ComponentBaseProps,
  ButtonProps,
  InputProps,
  FormProps,
  SelectProps,
  TooltipProps 
} from '@/ui/types'

// Database Types
export type { Database, Json } from '@/database.types'

// Message Types
export type { Message, ChatSession } from '@/chat'

// Education Types
export type { 
  Resource, 
  Tutorial, 
  CaseStudy,
  LearningPath,
  SkillLevel,
  Reply,
  PeerDiscussion,
  Member,
  MeetingSchedule,
  UpcomingSession,
  StudyGroup,
  NewDiscussion,
  PeerLearningProps
} from '@/education'

// Session Types
export type { 
  SessionData, 
  SessionMetrics,
  SessionConfig,
  SessionStatus 
} from '@/session'

// Supabase Types
export type { SupabaseClient } from '@supabase/supabase-js'

// Usage Types
export type { 
  UsageMetrics,
  UsageData,
  UsageConfig,
  UsageStatus 
} from '@/usage'

// Common Types
export type {
  ErrorResponse,
  SuccessResponse,
  ApiResponse,
  ApiError,
  Nullable,
  Optional,
  DeepPartial,
  AsyncReturnType,
  PromiseType
} from '@/common'

// Intervention Types
export type { Intervention } from '@/clientprofile'

// Emotion Types
export type { EmotionState, EmotionTrigger } from '@/emotions'

// Hub Types
export type { HubConnection, HubMessage } from '@/hub'

// Metric Types
export type { 
  MetricDefinition,
  MetricValue,
  MetricRange 
} from '@/metrics'

// Export all types from consistently named files
export * from './services';
export * from './analytics';
export * from './api';
export * from './auth';
export * from './chat';
export * from './client';
export * from './common';
export * from './database';
export * from './education';
export * from './emotions';
export * from './hub';
export * from './metrics';
export * from './session';
export * from './ui';
export * from './usage';

// Export specific types
export type { ClientProfile } from './ClientProfile';
export type { Database } from './database.types';

// Re-export all component props
export * from './ComponentProps';

// Auth types
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: Error | null;
}

export interface AuthProviderProps {
  children: React.ReactNode;
} 