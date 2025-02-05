import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse, ErrorResponse } from '@/types/api';

class ApiService {
  private client: AxiosInstance;
  private static instance: ApiService;

  private constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('sb-auth-token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError<ErrorResponse>) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('sb-auth-token');
          window.location.href = '/auth';
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError<ErrorResponse>): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error.message);
    }
    return error;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }
}

export const api = ApiService.getInstance();