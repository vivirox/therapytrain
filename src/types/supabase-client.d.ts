import { SupabaseClient as BaseSupabaseClient, User, Session } from '@supabase/supabase-js'
import { Database } from '@/database.types'

declare module '../lib/supabaseClient' {
  export const supabase: BaseSupabaseClient<Database>
}

declare module '../../lib/supabaseClient' {
  export const supabase: BaseSupabaseClient<Database>
}

declare module '../integrations/supabase/client' {
  export const supabase: BaseSupabaseClient<Database>
}

declare module '@supabase/ssr' {
  export function createSupabaseClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: {
      auth?: {
        storage?: Storage
        autoRefreshToken?: boolean
        persistSession?: boolean
        detectSessionInUrl?: boolean
      }
      global?: {
        headers?: { [key: string]: string }
        fetch?: typeof fetch
      }
      realtime?: {
        channels?: { [key: string]: any }
        endpoint?: string
        timeout?: number
      }
    }
  ): BaseSupabaseClient<Database>
}

declare module '@supabase/ssr' {
  export function createRouteHandlerClient<Database = any>(
    options: {
      cookies: () => Promise<{ get: (name: string) => string | undefined }>
    }
  ): BaseSupabaseClient<Database>
}

export interface Database {
    public: { Tables: { [key: string]: any } };
}
 