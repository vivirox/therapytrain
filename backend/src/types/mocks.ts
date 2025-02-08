import { WebSocket } from 'ws';
import { SecurityAuditServiceInterface, AuditEvent } from './audit';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { UserProfile } from './user';
import { Message, ChatSession } from '@/config/supabase';
import { ProofGenerationInput, ProofOutput } from '@/zk/types';

export interface MockedWebSocket extends WebSocket {
    send: jest.Mock;
    on: jest.Mock;
    close: jest.Mock;
    readyState: number;
}

export interface MockedSupabaseClient extends SupabaseClient {
    from: jest.Mock;
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    eq: jest.Mock;
    gte: jest.Mock;
    lte: jest.Mock;
    order: jest.Mock;
}

export interface MockedSecurityAuditService extends SecurityAuditServiceInterface {
    recordEvent: jest.Mock;
    recordAlert: jest.Mock;
    recordAuthAttempt: jest.Mock;
    logAccessPattern: jest.Mock;
    logSessionEvent: jest.Mock;
    logDataAccess: jest.Mock;
    getAuditLogs: jest.Mock;
}

export interface MockedWorker extends Worker {
    postMessage: jest.Mock;
    terminate: jest.Mock;
    onmessage: jest.Mock;
    onerror: jest.Mock;
}

export interface MockedVerificationKeyService {
    initialize: jest.Mock<Promise<void>>;
    getCurrentKey: jest.Mock<Promise<string>>;
}

export interface MockedRateLimiterService {
    checkRateLimit: jest.Mock<Promise<boolean>>;
    resetLimit: jest.Mock<Promise<void>>;
}

export interface MockFunction<T extends (...args: any[]) => any> extends jest.Mock<ReturnType<T>, Parameters<T>> {
    mockClear(): this;
    mockReset(): this;
    mockImplementation(fn: T): this;
    mockImplementationOnce(fn: T): this;
    mockResolvedValue(value: Awaited<ReturnType<T>>): this;
    mockResolvedValueOnce(value: Awaited<ReturnType<T>>): this;
    mockRejectedValue(value: unknown): this;
    mockRejectedValueOnce(value: unknown): this;
}

export type DeepMocked<T> = {
    [P in keyof T]: T[P] extends (...args: any[]) => any
        ? MockFunction<T[P]>
        : T[P] extends object
        ? DeepMocked<T[P]>
        : T[P];
};

import { WebSocket } from 'ws';
import { SecurityAuditServiceInterface, AuditEvent } from './audit';
import { SupabaseClient } from '@supabase/supabase-js';

export interface MockedWebSocket extends WebSocket {
    send: jest.Mock;
    on: jest.Mock;
    close: jest.Mock;
    readyState: number;
}

export interface MockedSupabaseClient extends SupabaseClient {
    from: jest.Mock;
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    eq: jest.Mock;
    gte: jest.Mock;
    lte: jest.Mock;
    order: jest.Mock;
}

export interface MockedSecurityAuditService extends SecurityAuditServiceInterface {
    recordEvent: jest.Mock;
    recordAlert: jest.Mock;
    recordAuthAttempt: jest.Mock;
    logAccessPattern: jest.Mock;
    logSessionEvent: jest.Mock;
    logDataAccess: jest.Mock;
    getAuditLogs: jest.Mock;
}

export interface MockedWorker extends Worker {
    postMessage: jest.Mock;
    terminate: jest.Mock;
    onmessage: jest.Mock;
    onerror: jest.Mock;
}

export interface MockedVerificationKeyService {
    initialize: jest.Mock<Promise<void>>;
    getCurrentKey: jest.Mock<Promise<string>>;
}

export interface MockedRateLimiterService {
    checkRateLimit: jest.Mock<Promise<boolean>>;
    resetLimit: jest.Mock<Promise<void>>;
}

export interface MockFunction<T extends (...args: any[]) => any> extends jest.Mock<ReturnType<T>, Parameters<T>> {
    mockClear(): this;
    mockReset(): this;
    mockImplementation(fn: T): this;
    mockImplementationOnce(fn: T): this;
    mockResolvedValue(value: Awaited<ReturnType<T>>): this;
    mockResolvedValueOnce(value: Awaited<ReturnType<T>>): this;
    mockRejectedValue(value: unknown): this;
    mockRejectedValueOnce(value: unknown): this;
}

export type DeepMocked<T> = {
    [P in keyof T]: T[P] extends (...args: any[]) => any
        ? MockFunction<T[P]>
        : T[P] extends object
        ? DeepMocked<T[P]>
        : T[P];
}; 