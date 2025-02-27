import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Session, type User } from '@supabase/supabase-js';
import { type SupabaseContextType } from '@/types/auth';
import { createClient } from '@/lib/supabase';

interface AuthStore extends SupabaseContextType {
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

const supabase = createClient();

const initialState: Omit<SupabaseContextType, 'supabase'> = {
  session: null,
  loading: true,
};

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,
      supabase,
      setSession: (session) => set((state) => ({
        ...state,
        session,
      })),
      setLoading: (loading) => set((state) => ({
        ...state,
        loading
      })),
      logout: async () => {
        await supabase.auth.signOut();
        set(initialState);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        session: state.session,
      }),
    }
  )
);
