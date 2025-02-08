/**
 * Common type definitions used throughout the application
 */

/**
 * Generic nullable type
 */
export type Nullable<T> = T | null;

/**
 * Generic optional type
 */
export type Optional<T> = T | undefined;

/**
 * Deep partial type for nested objects
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Type for API responses
 */
export interface ApiResponse<T = unknown> {
    data: T;
    meta?: {
        pagination?: {
            total: number;
            page: number;
            per_page: number;
            total_pages: number;
        };
        [key: string]: unknown;
    };
}

/**
 * Type for paginated responses
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

/**
 * Type for API error responses
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

/**
 * Type for async function return types
 */
export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
    T extends (...args: any) => Promise<infer R> ? R : any;

/**
 * Type for promise return types
 */
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

/**
 * Type for validation results
 */
export interface ValidationResult {
    valid: boolean;
    errors?: string[];
}

/**
 * Type for application configuration
 */
export interface AppConfig {
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
    version: string;
    api: {
        baseUrl: string;
        timeout: number;
        retries: number;
    };
    features: {
        [key: string]: boolean;
    };
}

/**
 * Type for application metadata
 */
export interface Metadata {
    [key: string]: unknown;
}

/**
 * Type for timestamps
 */
export interface Timestamps {
    created_at: string;
    updated_at: string;
}

/**
 * Type for soft-deletable entities
 */
export interface SoftDeletable {
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
}

/**
 * Type for auditable entities
 */
export interface Auditable {
    created_by?: string;
    updated_by?: string;
}

/**
 * Type for versioned entities
 */
export interface Versioned {
    version: number;
    previousVersion?: number;
    lastModified: Date;
}

/**
 * Type for entities with status
 */
export interface Statusable {
    status: Status;
}

/**
 * Common status
 */
export enum Status {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending',
    ARCHIVED = 'archived'
}

/**
 * Common priority
 */
export enum Priority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent'
}

/**
 * Common visibility
 */
export enum Visibility {
    PUBLIC = 'public',
    PRIVATE = 'private',
    RESTRICTED = 'restricted'
}

/**
 * Base entity interface
 */
export interface BaseEntity {
    id: string;
    created_at: string;
    updated_at: string;
}

/**
 * Pagination params
 */
export interface PaginationParams {
    page?: number;
    per_page?: number;
    cursor?: string;
}

/**
 * Sort params
 */
export interface SortParams {
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

/**
 * Filter params
 */
export interface FilterParams {
    [key: string]: string | number | boolean | undefined;
}

/**
 * Query params
 */
export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

/**
 * Type guard for checking if value is defined
 */
export const isDefined = <T>(value: T | undefined | null): value is T => {
    return value !== undefined && value !== null;
};

/**
 * Type guard for checking if value is object
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

/**
 * Type guard for checking if value is array
 */
export const isArray = <T>(value: unknown): value is T[] => {
    return Array.isArray(value);
};

/**
 * Type guard for ApiError
 */
export function isApiError(obj: unknown): obj is ApiError {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'code' in obj &&
        'message' in obj
    );
}

/**
 * Type guard for BaseEntity
 */
export function isBaseEntity(obj: unknown): obj is BaseEntity {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'created_at' in obj &&
        'updated_at' in obj
    );
}

/**
 * Type guard for Metadata
 */
export function isMetadata(obj: unknown): obj is Metadata {
    return typeof obj === 'object' && obj !== null;
}

/**
 * Type guard for Timestamps
 */
export function isTimestamps(obj: unknown): obj is Timestamps {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'created_at' in obj &&
        'updated_at' in obj
    );
}

/**
 * Type guard for Auditable
 */
export function isAuditable(obj: unknown): obj is Auditable {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        ('created_by' in obj || 'updated_by' in obj)
    );
}

/**
 * Type guard for Statusable
 */
export function isStatusable(obj: unknown): obj is Statusable {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'status' in obj &&
        typeof obj.status === 'string'
    );
} 