import { Database, SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { Database } from './database.types';

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

// Base types
export interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface Metadata {
  [key: string]: unknown;
}

export interface Auditable extends Timestamps {
  user_id: string;
}

export interface Statusable {
  status: string;
}

export interface BaseEntity extends Timestamps {
  id: string;
}

// API Response types
export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

export interface SuccessResponse<T = unknown> {
  data: T;
}

export type ApiResponse<T = unknown> = ErrorResponse | SuccessResponse<T>;

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

// Sorting types
export interface SortingParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Filtering types
export interface FilterParams {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like';
  value: unknown;
}

// WebSocket types
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

// Analytics types
export interface AnalyticsEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Notification types
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

// Export database types
export type { Database };
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Query types
export interface QueryParams extends PaginationParams, SortingParams, FilterParams {}

// WebSocket types
export interface WebSocketError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface WebSocketEvent<T = unknown> {
  type: 'message' | 'error' | 'connection' | 'disconnection';
  data: T;
  timestamp: string;
}

// Analytics types
export interface MetricValue {
  value: number;
  unit?: string;
  timestamp: string;
  metadata?: Metadata;
}

// Time related types
export interface TimeRange {
  start: string;
  end: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface Schedule {
  slots: TimeSlot[];
  timezone: string;
  metadata?: Metadata;
}

// Settings and notifications
export interface Settings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  [key: string]: unknown;
}

// Type guards
export const isDefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;
export const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
export const isArray = Array.isArray;

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

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  sender?: string;
  recipient?: string;
  metadata?: Metadata;
}

export interface WebSocketError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface WebSocketEvent<T = unknown> {
  type: 'message' | 'error' | 'connection' | 'disconnection';
  data: T;
  timestamp: string;
}

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

export interface MetricValue {
  value: number;
  unit?: string;
  timestamp: string;
  metadata?: Metadata;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface Schedule {
  slots: TimeSlot[];
  timezone: string;
  metadata?: Metadata;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: Metadata;
}

export interface Settings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  [key: string]: unknown;
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
 