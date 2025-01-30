// services/userService.ts

import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

// Types
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

// Initialize Supabase client
const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const userService = {
    // Create a new user
    async createUser(userData: UserInsert) {
        const { data, error } = await supabase
            .from('users')
            .insert(userData)
            .select()
            .single()

        if (error) {
          throw error
        }
        return data
    },

    // Get user by auth_id
    async getUserByAuthId(authId: string) {
        const { data, error } = await supabase
            .from('users')
            .select()
            .eq('auth_id', authId)
            .single()

        if (error) {
          throw error
        }
        return data
    },

    // Update user
    async updateUser(authId: string, updates: UserUpdate) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('auth_id', authId)
            .select()
            .single()

        if (error) {
          throw error
        }
        return data
    },

    // Delete user
    async deleteUser(authId: string) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('auth_id', authId)

        if (error) {
          throw error
        }
        return true
    }
}