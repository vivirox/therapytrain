import type { Database } from './database'
import type { User, UserRole } from './user'

// Session status
export enum SessionStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
  PAUSED = 'paused',
  SCHEDULED = 'scheduled'
}

// Session type
export enum SessionType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
  WORKSHOP = 'workshop',
  ASSESSMENT = 'assessment'
}

// Base session interface
export interface Session {
  id: string
  type: SessionType
  status: SessionStatus
  therapist_id: string
  client_id: string
  start_time: string
  end_time?: string
  duration?: number
  notes?: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Session with participants
export interface SessionWithParticipants extends Session {
  therapist: User
  client: User
  participants?: User[]
}

// Session creation data
export interface SessionCreate {
  type: SessionType
  therapist_id: string
  client_id: string
  start_time: string
  end_time?: string
  notes?: string
  metadata?: Record<string, unknown>
}

// Session update data
export interface SessionUpdate {
  status?: SessionStatus
  end_time?: string
  duration?: number
  notes?: string
  metadata?: Record<string, unknown>
}

// Session participant
export interface SessionParticipant {
  id: string
  session_id: string
  user_id: string
  role: UserRole
  joined_at: string
  left_at?: string
  metadata?: Record<string, unknown>
}

// Session message
export interface SessionMessage {
  id: string
  session_id: string
  sender_id: string
  content: string
  type: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Type guard for Session
export function isSession(obj: unknown): obj is Session {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'status' in obj &&
    'therapist_id' in obj &&
    'client_id' in obj
  )
}

// Type guard for SessionMessage
export function isSessionMessage(obj: unknown): obj is SessionMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'session_id' in obj &&
    'sender_id' in obj &&
    'content' in obj
  )
}

// Database types
export type SessionRow = Database['public']['Tables']['sessions']['Row']
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']
export type SessionUpdate = Database['public']['Tables']['sessions']['Update']

export type SessionMessageRow = Database['public']['Tables']['session_messages']['Row']
export type SessionMessageInsert = Database['public']['Tables']['session_messages']['Insert']
export type SessionMessageUpdate = Database['public']['Tables']['session_messages']['Update']

export type SessionParticipantRow = Database['public']['Tables']['session_participants']['Row']
export type SessionParticipantInsert = Database['public']['Tables']['session_participants']['Insert']
export type SessionParticipantUpdate = Database['public']['Tables']['session_participants']['Update'] 