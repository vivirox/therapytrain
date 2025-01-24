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
      audit_logs: {
        Row: {
          id: number
          eventType: string
          userId?: string
          sessionId?: string
          resourceType: string
          resourceId: string
          action: string
          status: 'success' | 'failure'
          details: Json
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
      client_profiles: {
        Row: {
          age: number
          background: string
          category: string
          complexity: string
          description: string
          id: number
          key_traits: string[]
          name: string
          primary_issue: string
        }
        Insert: Omit<Database['public']['Tables']['client_profiles']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['client_profiles']['Insert']>
      }
      kv_data: {
        Row: any
        Insert: any
        Update: any
      }
      profiles: {
        Row: any
        Insert: any
        Update: any
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
