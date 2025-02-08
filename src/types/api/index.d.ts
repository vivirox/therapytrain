import { Message, ChatSession } from '../chat';
import { SessionState } from '../session';

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: (req: any, res: any) => Promise<any>;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers?: Record<string, string>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

export interface ApiClient {
  get: <T = any>(path: string, params?: Record<string, any>) => Promise<ApiResponse<T>>;
  post: <T = any>(path: string, data?: any) => Promise<ApiResponse<T>>;
  put: <T = any>(path: string, data?: any) => Promise<ApiResponse<T>>;
  delete: <T = any>(path: string) => Promise<ApiResponse<T>>;
  patch: <T = any>(path: string, data?: any) => Promise<ApiResponse<T>>;
} 