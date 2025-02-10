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
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          encrypted_content: string
          iv: string
          timestamp: string
          created_at: string
          updated_at: string
          is_edited: boolean
          last_edited_at: string | null
          thread_id: string | null
          parent_message_id: string | null
          reply_count: number
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          encrypted_content: string
          iv: string
          timestamp?: string
          created_at?: string
          updated_at?: string
          is_edited?: boolean
          last_edited_at?: string | null
          thread_id?: string | null
          parent_message_id?: string | null
          reply_count?: number
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          encrypted_content?: string
          iv?: string
          timestamp?: string
          created_at?: string
          updated_at?: string
          is_edited?: boolean
          last_edited_at?: string | null
          thread_id?: string | null
          parent_message_id?: string | null
          reply_count?: number
        }
      }
      threads: {
        Row: {
          id: string
          creator_id: string
          title: string | null
          created_at: string
          updated_at: string
          last_message_at: string
          participant_count: number
          message_count: number
        }
        Insert: {
          id?: string
          creator_id: string
          title?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string
          participant_count?: number
          message_count?: number
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string
          participant_count?: number
          message_count?: number
        }
      }
      thread_participants: {
        Row: {
          thread_id: string
          user_id: string
          joined_at: string
          last_read_at: string
          is_muted: boolean
        }
        Insert: {
          thread_id: string
          user_id: string
          joined_at?: string
          last_read_at?: string
          is_muted?: boolean
        }
        Update: {
          thread_id?: string
          user_id?: string
          joined_at?: string
          last_read_at?: string
          is_muted?: boolean
        }
      }
      thread_summaries: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          encrypted_summary: string
          iv: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          encrypted_summary: string
          iv: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          encrypted_summary?: string
          iv?: string
          created_at?: string
          updated_at?: string
        }
      }
      message_edits: {
        Row: {
          id: string
          message_id: string
          editor_id: string
          previous_content: string
          previous_iv: string
          new_content: string
          new_iv: string
          edited_at: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          editor_id: string
          previous_content: string
          previous_iv: string
          new_content: string
          new_iv: string
          edited_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          editor_id?: string
          previous_content?: string
          previous_iv?: string
          new_content?: string
          new_iv?: string
          edited_at?: string
          created_at?: string
        }
      }
      user_keys: {
        Row: {
          user_id: string
          public_key: string
          created_at: string
          updated_at: string
          last_rotation: string
        }
        Insert: {
          user_id: string
          public_key: string
          created_at?: string
          updated_at?: string
          last_rotation?: string
        }
        Update: {
          user_id?: string
          public_key?: string
          created_at?: string
          updated_at?: string
          last_rotation?: string
        }
      }
      message_status: {
        Row: {
          message_id: string
          user_id: string
          status: 'sent' | 'delivered' | 'read'
          timestamp: string
        }
        Insert: {
          message_id: string
          user_id: string
          status: 'sent' | 'delivered' | 'read'
          timestamp?: string
        }
        Update: {
          message_id?: string
          user_id?: string
          status?: 'sent' | 'delivered' | 'read'
          timestamp?: string
        }
      }
      typing_status: {
        Row: {
          user_id: string
          chat_with: string
          is_typing: boolean
          last_updated: string
        }
        Insert: {
          user_id: string
          chat_with: string
          is_typing?: boolean
          last_updated?: string
        }
        Update: {
          user_id?: string
          chat_with?: string
          is_typing?: boolean
          last_updated?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_typing_status: {
        Args: {
          user_id: string
          chat_with: string
          is_typing: boolean
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 