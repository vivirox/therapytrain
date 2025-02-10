import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseclient';
import { PocketBaseAuthAdapter } from '@/auth/pocketbase-adapter';
import { AuthProviderProps } from '@/types/componentprops';
import {
  AuthContextType,
  AuthCredentials,
  AuthError,
  AuthResponse,
  AuthState,
  ZKAuthConfig,
  RateLimitConfig
} from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  zkConfig?: Partial<ZKAuthConfig>;
  rateLimit?: Partial<RateLimitConfig>;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  zkConfig,
  rateLimit
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  });

  const authAdapter = new PocketBaseAuthAdapter(zkConfig, rateLimit);

  useEffect(() => {
    // Initialize authentication state
    const initializeAuth = async () => {
      try {
        // Try to restore session
        const token = localStorage.getItem('pb_token');
        if (token) {
          const user = await authAdapter.verifyToken(token);
          if (user) {
            const session = {
              access_token: token,
              refresh_token: localStorage.getItem('pb_refresh_token') || '',
              expires_in: 3600,
              token_type: 'bearer',
              user
            } as Session;

            setState(prev => ({
              ...prev,
              user,
              session,
              loading: false
            }));
          } else {
            // Token is invalid, clean up
            localStorage.removeItem('pb_token');
            localStorage.removeItem('pb_refresh_token');
            setState(prev => ({
              ...prev,
              loading: false
            }));
          }
        } else {
          setState(prev => ({
            ...prev,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState(prev => ({
          ...prev,
          error: {
            code: 'init_error',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          loading: false
        }));
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (credentials: AuthCredentials): Promise<AuthResponse> => {
    try {
      const response = await authAdapter.authenticate(credentials);
      
      // Store tokens
      localStorage.setItem('pb_token', response.session.access_token);
      localStorage.setItem('pb_refresh_token', response.session.refresh_token);

      setState(prev => ({
        ...prev,
        user: response.user,
        session: response.session,
        error: null
      }));

      return response;
    } catch (error) {
      const authError: AuthError = {
        code: 'sign_in_error',
        message: error instanceof Error ? error.message : 'Sign in failed'
      };
      setState(prev => ({ ...prev, error: authError }));
      throw authError;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Clean up local storage
      localStorage.removeItem('pb_token');
      localStorage.removeItem('pb_refresh_token');

      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        error: null
      }));
    } catch (error) {
      const authError: AuthError = {
        code: 'sign_out_error',
        message: error instanceof Error ? error.message : 'Sign out failed'
      };
      setState(prev => ({ ...prev, error: authError }));
      throw authError;
    }
  };

  const signUp = async (credentials: AuthCredentials): Promise<AuthResponse> => {
    try {
      // For now, just use the same flow as signIn
      // TODO: Implement proper signup flow with email verification
      return await signIn(credentials);
    } catch (error) {
      const authError: AuthError = {
        code: 'sign_up_error',
        message: error instanceof Error ? error.message : 'Sign up failed'
      };
      setState(prev => ({ ...prev, error: authError }));
      throw authError;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      // TODO: Implement password reset
      throw new Error('Password reset not implemented');
    } catch (error) {
      const authError: AuthError = {
        code: 'reset_password_error',
        message: error instanceof Error ? error.message : 'Password reset failed'
      };
      setState(prev => ({ ...prev, error: authError }));
      throw authError;
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    try {
      // TODO: Implement password update
      throw new Error('Password update not implemented');
    } catch (error) {
      const authError: AuthError = {
        code: 'update_password_error',
        message: error instanceof Error ? error.message : 'Password update failed'
      };
      setState(prev => ({ ...prev, error: authError }));
      throw authError;
    }
  };

  const refreshSession = async (): Promise<Session> => {
    try {
      const refreshToken = localStorage.getItem('pb_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const session = await authAdapter.refreshToken(refreshToken);
      
      // Update tokens
      localStorage.setItem('pb_token', session.access_token);
      localStorage.setItem('pb_refresh_token', session.refresh_token);

      setState(prev => ({
        ...prev,
        session,
        error: null
      }));

      return session;
    } catch (error) {
      const authError: AuthError = {
        code: 'refresh_session_error',
        message: error instanceof Error ? error.message : 'Session refresh failed'
      };
      setState(prev => ({ ...prev, error: authError }));
      throw authError;
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    signIn,
    signOut,
    signUp,
    resetPassword,
    updatePassword,
    refreshSession
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export interface Database {
  public: { Tables: { [key: string]: any } };
}
