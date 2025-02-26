import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const session = createClient.auth.getSession();
    setUser(session.data?.user ?? null);
    setLoading(false);

    // Listen for changes on auth state (signed in, signed out, etc.)
    const { data: { subscription } } = createClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    signIn: async (email: string, password: string) => {
      const { error } = await createClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await createClient.auth.signOut();
      if (error) throw error;
    },
    signUp: async (email: string, password: string) => {
      const { error } = await createClient.auth.signUp({ email, password });
      if (error) throw error;
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 