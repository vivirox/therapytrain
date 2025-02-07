import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { config } from '@/config';

if (!config.supabaseUrl || !config.supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

export const supabase: SupabaseClient<Database> = createClient(config.supabaseUrl, config.supabaseKey);

export interface Database {
    public: { Tables: { [key: string]: any } };
}
