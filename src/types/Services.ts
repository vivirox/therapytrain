import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ClientProfile, ClientSession, Message, Intervention } from './ClientProfile';

export interface ServiceConfig {
    enabled: boolean;
    settings: Record<string, any>;
    version: string;
    environment: string;
}

export interface ServiceStatus {
    status: 'active' | 'inactive' | 'error' | 'maintenance';
    lastCheck: Date;
    uptime: number;
    metrics: {
        requestCount: number;
        errorCount: number;
        latency: number;
    };
}

export interface ApiService {
    sessions: {
        start: (clientId: string, mode: string) => Promise<any>;
        end: (sessionId: string) => Promise<void>;
        switchMode: (sessionId: string, newMode: string) => Promise<void>;
    };
}

export interface AIAnalyticsService {
    generateAIInsights: (data: any) => Promise<any>;
    generatePersonalizedCurriculum: (userId: string) => Promise<any>;
    predictLearningChallenges: (userId: string) => Promise<any>;
    generateAdaptiveFeedback: (userId: string, data: any) => Promise<any>;
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

export interface ServiceMetrics {
    requestCount: number;
    errorCount: number;
    latency: number;
    activeUsers: number;
    cpuUsage: number;
    memoryUsage: number;
}

export interface ServiceHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
        name: string;
        status: 'pass' | 'fail';
        message?: string;
    }>;
    timestamp: Date;
}

export interface ServiceDependency {
    name: string;
    type: 'required' | 'optional';
    status: 'up' | 'down' | 'degraded';
    lastCheck: Date;
}

export interface ServiceEvent {
    id: string;
    type: string;
    timestamp: Date;
    data: Record<string, any>;
    metadata?: Record<string, any>;
}

export interface ServiceError {
    code: string;
    message: string;
    stack?: string;
    timestamp: Date;
    context?: Record<string, any>;
}

export interface ServiceLog {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: Date;
    context?: Record<string, any>;
}

export interface ServiceStats {
    startTime: Date;
    uptime: number;
    requestStats: {
        total: number;
        success: number;
        failed: number;
        avgResponseTime: number;
    };
    resourceStats: {
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
    };
}

export interface ServiceAction<T = any, U = any> {
    type: string;
    payload: T;
    metadata?: Record<string, any>;
    execute: () => Promise<U>;
    rollback?: () => Promise<void>;
}

export interface ServiceHook<T = any> {
    name: string;
    event: string;
    handler: (data: T) => Promise<void>;
    priority?: number;
    condition?: (data: T) => boolean;
}

export interface ServiceCache {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T, ttl?: number) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
}

export interface ServiceQueue {
    push: <T>(job: T) => Promise<string>;
    process: <T, U>(handler: (job: T) => Promise<U>) => void;
    getStatus: (jobId: string) => Promise<'pending' | 'processing' | 'completed' | 'failed'>;
}

export interface ServiceScheduler {
    schedule: (cronExpression: string, job: () => Promise<void>) => string;
    cancel: (jobId: string) => void;
    getNextRunTime: (jobId: string) => Date | null;
}

export interface ServiceTransaction {
    begin: () => Promise<void>;
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
    isActive: () => boolean;
}

export interface ServiceLock {
    acquire: (resource: string, ttl?: number) => Promise<boolean>;
    release: (resource: string) => Promise<void>;
    isLocked: (resource: string) => Promise<boolean>;
}

export interface ServiceRateLimiter {
    isLimited: (key: string) => Promise<boolean>;
    increment: (key: string) => Promise<void>;
    getRemainingTokens: (key: string) => Promise<number>;
}

export interface ServiceCircuitBreaker {
    isOpen: () => boolean;
    onSuccess: () => void;
    onError: (error: Error) => void;
    reset: () => void;
}

export interface ServiceMetricsCollector {
    increment: (metric: string, value?: number) => void;
    gauge: (metric: string, value: number) => void;
    histogram: (metric: string, value: number) => void;
    flush: () => Promise<void>;
}

export interface ServiceTracer {
    startSpan: (name: string) => any;
    finishSpan: (span: any) => void;
    setTag: (span: any, key: string, value: string) => void;
    log: (span: any, message: string) => void;
}

export interface ServiceValidator {
    validate: <T>(schema: any, data: T) => Promise<boolean>;
    getErrors: () => string[];
    addSchema: (name: string, schema: any) => void;
}

export interface ServicePublisher {
    publish: <T>(topic: string, message: T) => Promise<void>;
    subscribe: <T>(topic: string, handler: (message: T) => Promise<void>) => void;
    unsubscribe: (topic: string) => void;
}

export interface ServiceConsumer {
    consume: <T>(queue: string, handler: (message: T) => Promise<void>) => void;
    pause: () => void;
    resume: () => void;
    getStatus: () => 'running' | 'paused' | 'stopped';
}

export interface LearningAnalytics {
  userId: string;
  timestamp: string;
  metrics: {
    skillGrowth: Array<{
      skill: string;
      growth: number;
      timestamp: string;
    }>;
    completionRate: number;
    averageScore: number;
    timeInvested: number;
    learningVelocity: number;
  };
  recommendations: string[];
} 