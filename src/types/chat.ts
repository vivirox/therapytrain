import type { Database } from './database.types'
import type { Timestamps, Metadata, Auditable, Statusable } from './common'
import type { User } from './user'

// Message type
export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
  ACTION: 'action'
} as const

export type MessageType = typeof MessageType[keyof typeof MessageType]

// Message status
export const MessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
} as const

export type MessageStatus = typeof MessageStatus[keyof typeof MessageStatus]

// Base message interface
export interface Message extends Timestamps, Auditable {
  id: string
  threadId: string
  senderId: string
  type: MessageType
  content: string
  status: MessageStatus
  metadata: Metadata
}

// Thread status
export const ThreadStatus = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted'
} as const

export type ThreadStatus = typeof ThreadStatus[keyof typeof ThreadStatus]

// Base thread interface
export interface Thread extends Timestamps, Auditable, Statusable {
  id: string
  title: string
  lastMessageAt: Date
  participantIds: string[]
  metadata: Metadata
}

// Thread with messages and participants
export interface ThreadWithDetails extends Thread {
  messages: Message[]
  participants: User[]
}

// Chat context
export interface ChatContext {
  currentUser: User
  activeThread?: Thread
  unreadCount: number
  isOnline: boolean
}

// Chat service interface
export interface ChatService {
  sendMessage(message: Partial<Message>): Promise<Message>
  getMessages(threadId: string): Promise<Message[]>
  createThread(participants: string[]): Promise<Thread>
  getThread(threadId: string): Promise<Thread>
  markAsRead(messageId: string): Promise<void>
}

// Database types
export type MessageRow = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type ThreadRow = Database['public']['Tables']['threads']['Row']
export type ThreadInsert = Database['public']['Tables']['threads']['Insert']
export type ThreadUpdate = Database['public']['Tables']['threads']['Update']

// Type guards
export function isThread(obj: unknown): obj is Thread {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'participantIds' in obj
  )
}

export function isChatMessage(obj: unknown): obj is Message {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'threadId' in obj &&
    'senderId' in obj &&
    'content' in obj
  )
}
