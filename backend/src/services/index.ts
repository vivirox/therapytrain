import { AnalyticsEvent, AnalyticsData } from '@/analytics';
import { Message, ChatSession } from '@/config/supabase';
import { ProofGenerationInput, ProofOutput } from '@/zk/types';

export interface ApiService {
    initialize(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getVersion(): string;
    getStatus(): Promise<ServiceStatus>;
}

export interface AIAnalyticsService {
    analyzeMessage(message: Message): Promise<{
        sentiment: number;
        topics: string[];
        intent: string;
        entities: string[];
    }>;
    analyzeSession(session: ChatSession): Promise<{
        summary: string;
        recommendations: string[];
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
        interventions: string[];
    }>;
    generateReport(sessionId: string): Promise<AnalyticsData>;
}

export interface DataService {
    storeData(key: string, data: any): Promise<void>;
    getData(key: string): Promise<any>;
    deleteData(key: string): Promise<void>;
    listKeys(prefix?: string): Promise<string[]>;
    backup(destination: string): Promise<void>;
    restore(source: string): Promise<void>;
}

export interface ServiceConfig {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    maxRetries: number;
    timeout: number;
    features: {
        analytics: boolean;
        encryption: boolean;
        caching: boolean;
        monitoring: boolean;
    };
}

export interface ServiceStatus {
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    uptime: number;
    lastChecked: Date;
    components: {
        database: boolean;
        cache: boolean;
        queue: boolean;
        storage: boolean;
    };
    metrics: {
        requestCount: number;
        errorCount: number;
        averageResponseTime: number;
    };
}

export interface ServiceEvent {
    type: string;
    timestamp: Date;
    service: string;
    status: 'SUCCESS' | 'FAILURE';
    details: Record<string, any>;
    metadata?: Record<string, any>;
}

// Re-export service implementations
export * from './websocket/SessionManager';
export * from './websocket/WebSocketServer';
export * from './interventionMetrics';
export * from './learningPath';
export * from './realTimeAnalytics';
export * from './sessionAnalytics'; 