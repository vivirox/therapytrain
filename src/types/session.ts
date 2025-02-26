import type { Database } from './database.types'
import type { Timestamps, Metadata, Auditable, Statusable } from './common'
import type { User } from './user'
import type { Message } from './chat'

// Session status
export const SessionStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

export type SessionStatus = typeof SessionStatus[keyof typeof SessionStatus]

// Session mode
export const SessionMode = {
  INDIVIDUAL: 'individual',
  GROUP: 'group',
  WORKSHOP: 'workshop'
} as const

export type SessionMode = typeof SessionMode[keyof typeof SessionMode]

// Base session interface
export interface Session extends Timestamps, Auditable, Statusable {
  id: string
  title: string
  description?: string
  mode: SessionMode
  startTime: Date
  endTime: Date
  metadata: Metadata
}

// Session with participants
export interface SessionWithParticipants extends Session {
  participants: User[]
  messages: Message[]
}

// Session metrics
export interface SessionMetrics {
  duration: number
  messageCount: number
  participantCount: number
  engagementScore: number
  sentimentScore: number
}

// Session configuration
export interface SessionConfig {
  maxParticipants: number
  allowGuests: boolean
  isPrivate: boolean
  requiresApproval: boolean
  autoRecordEnabled: boolean
  transcriptionEnabled: boolean
  analyticsEnabled: boolean
}

// Database types
export type SessionRow = Database['public']['Tables']['sessions']['Row']
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']
export type SessionUpdate = Database['public']['Tables']['sessions']['Update']

// Type guards
export function isSession(obj: unknown): obj is Session {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'mode' in obj &&
    'startTime' in obj &&
    'endTime' in obj
  )
}

export function isMessage(obj: unknown): obj is Message {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'content' in obj &&
    'senderId' in obj
  )
}
