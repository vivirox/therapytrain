import type { Database as SupabaseDatabase } from '@supabase/supabase-js'

// Re-export the Database type from Supabase
export type { SupabaseDatabase }

// Define our own Database type that extends Supabase's
export interface Database extends SupabaseDatabase {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          role: string
          status: string
          metadata: Record<string, unknown>
        }
        Insert: {
          id?: string
          email: string
          role?: string
          status?: string
          metadata?: Record<string, unknown>
        }
        Update: {
          email?: string
          role?: string
          status?: string
          metadata?: Record<string, unknown>
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          expires_at: string
          status: string
          metadata: Record<string, unknown>
        }
        Insert: {
          id?: string
          user_id: string
          expires_at?: string
          status?: string
          metadata?: Record<string, unknown>
        }
        Update: {
          id?: string
          user_id?: string
          expires_at?: string
          status?: string
          metadata?: Record<string, unknown>
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
          type: string
          metadata: Record<string, unknown>
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          content: string
          type?: string
          metadata?: Record<string, unknown>
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          content?: string
          type?: string
          metadata?: Record<string, unknown>
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          created_at: string
          metadata: Record<string, unknown>
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          metadata?: Record<string, unknown>
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string
          metadata?: Record<string, unknown>
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          status: string
          metadata: Record<string, unknown>
        }
        Insert: {
          id?: string
          user_id: string
          status?: string
          metadata?: Record<string, unknown>
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          metadata?: Record<string, unknown>
        }
      }
      client_profiles: {
        Row: {
          id: string
          client_id: string
          created_at: string
          updated_at: string
          data: Record<string, unknown>
        }
        Insert: {
          id?: string
          client_id: string
          data?: Record<string, unknown>
        }
        Update: {
          id?: string
          client_id?: string
          data?: Record<string, unknown>
        }
      }
      interventions: {
        Row: {
          id: string
          session_id: string
          type: string
          created_at: string
          updated_at: string
          status: string
          metadata: Record<string, unknown>
        }
        Insert: {
          id?: string
          session_id: string
          type: string
          status?: string
          metadata?: Record<string, unknown>
        }
        Update: {
          id?: string
          session_id?: string
          type?: string
          status?: string
          metadata?: Record<string, unknown>
        }
      }
      assessments: {
        Row: {
          id: string
          client_id: string
          type: string
          created_at: string
          updated_at: string
          data: Record<string, unknown>
        }
        Insert: {
          id?: string
          client_id: string
          type: string
          data?: Record<string, unknown>
        }
        Update: {
          id?: string
          client_id?: string
          type?: string
          data?: Record<string, unknown>
        }
      }
      appointments: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          start_time: string
          end_time: string
          status: string
          metadata: Record<string, unknown>
        }
        Insert: {
          id?: string
          client_id: string
          therapist_id: string
          start_time: string
          end_time: string
          status?: string
          metadata?: Record<string, unknown>
        }
        Update: {
          id?: string
          client_id?: string
          therapist_id?: string
          start_time?: string
          end_time?: string
          status?: string
          metadata?: Record<string, unknown>
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          type: string
          created_at: string
          read_at: string | null
          metadata: Record<string, unknown>
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          read_at?: string | null
          metadata?: Record<string, unknown>
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          read_at?: string | null
          metadata?: Record<string, unknown>
        }
      }
      feedback: {
        Row: {
          id: string
          session_id: string
          user_id: string
          rating: number
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          rating: number
          comment?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          rating?: number
          comment?: string
        }
      }
      resources: {
        Row: {
          id: string
          type: string
          title: string
          content: string
          created_at: string
          updated_at: string
          metadata: Record<string, unknown>
        }
        Insert: {
          id?: string
          type: string
          title: string
          content: string
          metadata?: Record<string, unknown>
        }
        Update: {
          id?: string
          type?: string
          title?: string
          content?: string
          metadata?: Record<string, unknown>
        }
      }
      settings: {
        Row: {
          id: string
          user_id: string
          key: string
          value: unknown
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          key: string
          value: unknown
        }
        Update: {
          id?: string
          user_id?: string
          key?: string
          value?: unknown
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