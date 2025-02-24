import { SWRConfig } from 'swr';
import { swrConfig } from './config';
import { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
  fallback?: { [key: string]: any };
}

export function SWRProvider({ children, fallback }: SWRProviderProps) {
  return (
    <SWRConfig 
      value={{
        ...swrConfig,
        fallback,
        onError: (error, key) => {
          // Log errors to your error tracking service
          console.error('SWR Error:', { error, key });
        },
        onSuccess: (data, key) => {
          // Log successful requests if needed
          if (process.env.NODE_ENV === 'development') {
            console.debug('SWR Success:', { key, data });
          }
        },
        onLoadingSlow: (key) => {
          // Log slow requests
          console.warn('Slow Request:', key);
        },
        shouldRetryOnError: (error) => {
          // Only retry on network errors
          return error.name === 'NetworkError';
        },
      }}
    >
      {children}
    </SWRConfig>
  );
} 