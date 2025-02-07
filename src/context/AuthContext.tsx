import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { AuthContextType, User } from '@/types/auth';
import { useToast } from '@/components/ui/use-toast';
const defaultContext: AuthContextType = {
    user: null,
    token: null,
    isAuthenticated: false,
    session: null,
    loading: true,
    error: null,
    login: async () => { throw new Error('AuthContext not initialized'); },
    logout: async () => { throw new Error('AuthContext not initialized'); },
    signup: async () => { throw new Error('AuthContext not initialized'); },
    setUser: () => { throw new Error('AuthContext not initialized'); },
    setToken: () => { throw new Error('AuthContext not initialized'); },
};
const AuthContext = createContext<AuthContextType>(defaultContext);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
export const AuthProvider: React.FC = ({ children }) => {
    const [state, setState] = useState<AuthContextType>(defaultContext);
    const { toast } = useToast();
    useEffect(() => {
        // Check active sessions and set the user
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setState(prev => ({
                    ...prev,
                    session,
                    user: session.user as User | null,
                    loading: false,
                    isAuthenticated: !!session.user
                }));
            }
        };
        initSession();
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((event, session) => {
            setState(prev => ({
                ...prev,
                session,
                user: session?.user as User | null,
                loading: false,
                isAuthenticated: !!session?.user
            }));
        });
        return () => {
            subscription.unsubscribe();
        };
    }, []);
    const login = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error)
                throw error;
            setState(prev => ({
                ...prev,
                user: data.user as User | null,
                session: data.session,
                isAuthenticated: !!data.user,
                error: null
            }));
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: error as Error
            }));
            throw error;
        }
    };
    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setState(prev => ({
                ...prev,
                user: null,
                token: null,
                session: null,
                isAuthenticated: false,
                error: null
            }));
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: error as Error
            }));
            throw error;
        }
    };
    const signup = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error)
                throw error;
            setState(prev => ({
                ...prev,
                user: data.user as User | null,
                session: data.session,
                isAuthenticated: !!data.user,
                error: null
            }));
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: error as Error
            }));
            throw error;
        }
    };
    const setUser = (user: User | null) => {
        setState(prev => ({
            ...prev,
            user,
            isAuthenticated: !!user
        }));
    };
    const setToken = (token: string | null) => {
        setState(prev => ({
            ...prev,
            token
        }));
    };
    return (<AuthContext.Provider value={{
            ...state,
            login,
            logout,
            signup,
            setUser,
            setToken
        }}>
            {children}
        </AuthContext.Provider>);
};
