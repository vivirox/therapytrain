// utils/auth.ts

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabase: SupabaseClient<Database> = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const auth = {
    // Sign up
    async signUp(email: string, password: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        })
        if (error) throw error
        return data
    },

    // Sign in
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) throw error
        return data
    },

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    },

    // Get current session
    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        return session
    },

    // Get current user
    async getUser() {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        return user
    }
}

export interface Database {
    public: { Tables: { [key: string]: any } };
}
