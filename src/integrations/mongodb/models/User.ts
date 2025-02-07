import { Database } from '@/../types/supabase';
export type User = Database['public']['Tables']['users']['Row'];

// Type for creating a new user
export type UserInsert = Database['public']['Tables']['users']['Insert'];

// Type for updating an existing user
export type UserUpdate = Database['public']['Tables']['users']['Update'];