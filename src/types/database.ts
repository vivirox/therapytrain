import { SupabaseClient } from '@supabase/supabase-js'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string
          username: string
          full_name: string
          avatar_url: string
          website: string
        }
        Insert: {
          id: string
          updated_at?: string
          username?: string
          full_name?: string
          avatar_url?: string
          website?: string
        }
        Update: {
          id?: string
          updated_at?: string
          username?: string
          full_name?: string
          avatar_url?: string
          website?: string
        }
      }
      sessions: {
        Row: {
          id: string
          created_at: string
          client_id: string
          therapist_id: string
          mode: string
          status: string
          metrics: {
            engagement_score: number
            sentiment_score: number
            progress_indicators: string[]
          }
        }
        Insert: {
          id?: string
          created_at?: string
          client_id: string
          therapist_id: string
          mode: string
          status?: string
          metrics?: {
            engagement_score?: number
            sentiment_score?: number
            progress_indicators?: string[]
          }
        }
        Update: {
          id?: string
          created_at?: string
          client_id?: string
          therapist_id?: string
          mode?: string
          status?: string
          metrics?: {
            engagement_score?: number
            sentiment_score?: number
            progress_indicators?: string[]
          }
        }
      }
      messages: {
        Row: {
          id: string
          created_at: string
          session_id: string
          sender_id: string
          content: string
          type: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          created_at?: string
          session_id: string
          sender_id: string
          content: string
          type: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string
          sender_id?: string
          content?: string
          type?: string
          metadata?: Record<string, any>
        }
      }
      interventions: {
        Row: {
          id: string
          created_at: string
          session_id: string
          type: string
          content: string
          effectiveness_score: number
          client_engagement: number
          follow_through_rate: number
          adaptation_score: number
        }
        Insert: {
          id?: string
          created_at?: string
          session_id: string
          type: string
          content: string
          effectiveness_score?: number
          client_engagement?: number
          follow_through_rate?: number
          adaptation_score?: number
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string
          type?: string
          content?: string
          effectiveness_score?: number
          client_engagement?: number
          follow_through_rate?: number
          adaptation_score?: number
        }
      }
      audit_logs: {
        Row: {
          id: string
          created_at: string
          user_id: string
          action: string
          resource: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          action: string
          resource: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          action?: string
          resource?: string
          metadata?: Record<string, any>
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

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export type DbClient = SupabaseClient<Database> 