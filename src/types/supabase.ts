// types/supabase.ts

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    updated_at: string | null
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    website: string | null
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                }
            }
            sessions: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    client_id: string
                    mode: string
                    status: string
                    metrics: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    client_id: string
                    mode: string
                    status?: string
                    metrics?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    client_id?: string
                    mode?: string
                    status?: string
                    metrics?: Json | null
                }
            }
            clients: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    profile: Json
                    status: string
                    metrics: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    profile: Json
                    status?: string
                    metrics?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    profile?: Json
                    status?: string
                    metrics?: Json | null
                }
            }
            messages: {
                Row: {
                    id: string
                    created_at: string
                    session_id: string
                    role: string
                    content: string
                    metadata: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    session_id: string
                    role: string
                    content: string
                    metadata?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    session_id?: string
                    role?: string
                    content?: string
                    metadata?: Json | null
                }
            }
            interventions: {
                Row: {
                    id: string
                    created_at: string
                    session_id: string
                    type: string
                    content: string
                    metrics: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    session_id: string
                    type: string
                    content: string
                    metrics?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    session_id?: string
                    type?: string
                    content?: string
                    metrics?: Json | null
                }
            }
            audit_logs: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    action: string
                    resource: string
                    metadata: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    action: string
                    resource: string
                    metadata?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    action?: string
                    resource?: string
                    metadata?: Json | null
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}