import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseclient';
import { PocketBaseAuthAdapter } from '@/auth/pocketbase-adapter';
import { AuthProviderProps } from '@/types/componentprops';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string, provider?: 'supabase' | 'pocketbase') => Promise<void>;
    signOut: () => Promise<void>;
    signUp: (email: string, password: string, provider?: 'supabase' | 'pocketbase') => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentProvider, setCurrentProvider] = useState<'supabase' | 'pocketbase'>('supabase');

    useEffect(() => {
        // Check active sessions and sets the user
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    setCurrentProvider('supabase');
                } else {
                    // Try to restore PocketBase session
                    const pbToken = localStorage.getItem('pb_token');
                    if (pbToken) {
                        const pbUser = await PocketBaseAuthAdapter.verifyToken(pbToken);
                        if (pbUser) {
                            setUser(pbUser);
                            setCurrentProvider('pocketbase');
                        }
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Listen for Supabase auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user);
                setCurrentProvider('supabase');
            } else if (currentProvider === 'supabase') {
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [currentProvider]);

    const signIn = async (email: string, password: string, provider: 'supabase' | 'pocketbase' = 'supabase') => {
        try {
            if (provider === 'supabase') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { user, session } = await PocketBaseAuthAdapter.authenticate(email, password);
                setUser(user);
                setCurrentProvider('pocketbase');
                localStorage.setItem('pb_token', session.access_token);
                localStorage.setItem('pb_refresh_token', session.refresh_token);
            }
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            if (currentProvider === 'supabase') {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
            } else {
                localStorage.removeItem('pb_token');
                localStorage.removeItem('pb_refresh_token');
                setUser(null);
                setCurrentProvider('supabase');
            }
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    const signUp = async (email: string, password: string, provider: 'supabase' | 'pocketbase' = 'supabase') => {
        try {
            if (provider === 'supabase') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
            } else {
                // TODO: Implement PocketBase signup
                throw new Error('PocketBase signup not implemented');
            }
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    };

    const refreshSession = async () => {
        try {
            if (currentProvider === 'supabase') {
                const { error } = await supabase.auth.refreshSession();
                if (error) throw error;
            } else {
                const refreshToken = localStorage.getItem('pb_refresh_token');
                if (!refreshToken) throw new Error('No refresh token available');
                
                const session = await PocketBaseAuthAdapter.refreshToken(refreshToken);
                localStorage.setItem('pb_token', session.access_token);
                localStorage.setItem('pb_refresh_token', session.refresh_token);
            }
        } catch (error) {
            console.error('Session refresh error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, signUp, refreshSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export interface Database {
    public: { Tables: { [key: string]: any } };
}
