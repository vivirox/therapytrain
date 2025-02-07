import { Database, SupabaseClient, User, Session } from '@supabase/supabase-js';

export interface ClientProfile {
  id: string;
  name: string;
  primary_issue: string;
  key_traits: string[];
  // Add other properties as needed
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

export interface ChatMessage {
  content: string;
  timestamp?: number;
}

export interface LearningAnalytics {
  metrics: {
    skillGrowth: SkillGrowth[];
    completionRate: number;
  };
}

export interface SkillGrowth {
  skillId: string;
  growthRate: number;
  milestones: string[];
}

export interface AIAnalyticsService {
  generateAIInsights: (userId: string) => Promise<any>;
  generatePersonalizedCurriculum: (userId: string, skills: string[]) => Promise<Module[]>;
  predictLearningChallenges: (userId: string, resources: Resource[]) => Promise<any>;
  generateAdaptiveFeedback: (userId: string, data: any) => Promise<any>;
}

export interface Module {
  id: string;
  module: string;
  resources: Resource[];
  prerequisites: string[];
  estimatedDuration: number;
}

export interface Resource {
  id: string;
  type: string;
  rationale: string;
  priority: number;
}

export interface DataService {
  upsertAlertConfig: (config: any) => Promise<void>;
  getAlertConfig: (clientId: string) => Promise<any>;
  getSessionData: (sessionId: string) => Promise<any>;
  getClientHistory: (clientId: string) => Promise<any>;
  getRecentMessages: (clientId: string) => Promise<any>;
  getBehavioralPatterns: (clientId: string) => Promise<any>;
  sendInAppAlert: (alert: any) => Promise<void>;
  logAlert: (alert: any) => Promise<void>;
}

export interface Intervention {
  id: string;
  effectiveness: number;
  immediate_response: number;
  contextual_relevance: number;
  client_engagement: number;
  follow_through_rate: number;
  adaptation_score: number;
  timestamp: string;
  context: any;
  sessions: {
    client_id: string;
    metrics: any;
  };
}

export interface Pattern {
  id: string;
  risk_level: number;
  confidence: number;
  description: string;
  timestamp: string;
  indicators: string[];
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
    status: number;
}

export interface SuccessResponse<T = any> {
    data: T;
    status: number;
    metadata?: Record<string, any>;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

export interface ApiError {
    code: string;
    message: string;
    status: number;
    details?: Record<string, any>;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}

export interface SortOptions {
    field: string;
    direction: 'asc' | 'desc';
}

export interface FilterOptions {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like';
    value: any;
}

export interface QueryOptions {
    pagination?: Pagination;
    sort?: SortOptions[];
    filters?: FilterOptions[];
    includes?: string[];
}

export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}

export interface AuditableEntity extends BaseEntity {
    createdBy: string;
    updatedBy: string;
    deletedBy?: string;
}

export interface VersionedEntity extends AuditableEntity {
    version: number;
    previousVersionId?: string;
}

export interface Timestamped {
    timestamp: Date;
}

export interface Identifiable {
    id: string;
}

export interface Named {
    name: string;
}

export interface Described {
    description?: string;
}

export interface Metadata {
    [key: string]: any;
}

export interface Status {
    status: 'active' | 'inactive' | 'pending' | 'archived' | 'deleted';
}

export interface Config {
    enabled: boolean;
    settings: Record<string, any>;
}

export interface ValidationResult {
    valid: boolean;
    errors?: string[];
}

export interface SearchResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

export type ValidationFunction<T> = (value: T) => ValidationResult;
export type TransformFunction<T, U> = (value: T) => U;
export type AsyncValidationFunction<T> = (value: T) => Promise<ValidationResult>;
export type AsyncTransformFunction<T, U> = (value: T) => Promise<U>;

export interface Database {
    public: { Tables: { [key: string]: any } };
}
 