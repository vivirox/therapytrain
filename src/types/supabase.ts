// types/supabase.ts

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Array<Json>

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    auth_id: string
                    email: string
                    name: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    auth_id: string
                    email: string
                    name?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    auth_id?: string
                    email?: string
                    name?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            // Add other tables here as needed
        }
    }
}