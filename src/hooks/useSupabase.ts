"use client";

import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

export interface SupabaseContextType {
  supabase: SupabaseClient;
  session: Session | null;
  loading: boolean;
}

export function useSupabase(): SupabaseContextType {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { supabase, session, loading };
} 