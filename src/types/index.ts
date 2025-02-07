// Authentication Types
export type { User } from './auth'
export type { AuthProviderProps } from './ComponentProps'

// Client Types
export type { Client } from './Client'
export type { ClientProfile } from './ClientProfile'
export type { ClientSession } from './session'

// Analytics Types
export type { 
  LearningAnalytics, 
  SkillGrowth,
  AnalyticsData,
  MetricsData 
} from './analytics'

// Service Types
export type { 
  ApiService,
  AIAnalyticsService,
  DataService,
  ServiceConfig,
  ServiceStatus 
} from './Services'

// Component Types
export type { 
  ComponentBaseProps,
  ButtonProps,
  InputProps,
  FormProps,
  SelectProps,
  TooltipProps 
} from './ui/types'

// Database Types
export type { Database, Json } from './database.types'

// Message Types
export type { Message, ChatSession } from './chat'

// Education Types
export type { 
  Resource, 
  Tutorial, 
  CaseStudy,
  LearningPath,
  SkillLevel 
} from './education'

// Session Types
export type { 
  SessionData, 
  SessionMetrics,
  SessionConfig,
  SessionStatus 
} from './session'

// Supabase Types
export type { SupabaseClient } from '@supabase/supabase-js'

// Usage Types
export type { 
  UsageMetrics,
  UsageData,
  UsageConfig,
  UsageStatus 
} from './usage'

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
} from './common'

// Intervention Types
export type { Intervention } from './ClientProfile'

// Emotion Types
export type { EmotionState, EmotionTrigger } from './emotions'

// Hub Types
export type { HubConnection, HubMessage } from './hub'

// Metric Types
export type { 
  MetricDefinition,
  MetricValue,
  MetricRange 
} from './metrics'

// Re-export all service types
export * from './services';

// Re-export all UI types
export * from './ui';

// Re-export common types
export * from './common';

// Re-export analytics types
export * from './analytics';

// Export specific types that might be used across the application
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin' | 'therapist';
  preferences?: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;
  type: 'chat' | 'video' | 'assessment';
  status: 'active' | 'completed' | 'cancelled';
}

export interface ClientProfile {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  primaryIssue?: string;
  background?: string;
  goals?: string[];
  preferences?: Record<string, unknown>;
}

export interface TherapySession extends Session {
  clientId: string;
  notes?: string;
  metrics?: {
    engagement: number;
    progress: number;
    effectiveness: number;
  };
}

export interface LearningProgress {
  userId: string;
  skills: Record<string, {
    level: number;
    progress: number;
    lastUpdated: number;
  }>;
  completedTutorials: string[];
  certificates: string[];
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  types: {
    sessionReminders: boolean;
    progressUpdates: boolean;
    systemAlerts: boolean;
  };
}

// Auth types
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
} 