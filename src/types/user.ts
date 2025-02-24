import type { Database } from './database.types'
import type { Timestamps, Metadata, Auditable, Statusable } from './common'

// User roles
export const UserRoles = {
  ADMIN: 'admin',
  THERAPIST: 'therapist',
  CLIENT: 'client',
  GUEST: 'guest'
} as const

export type UserRole = typeof UserRoles[keyof typeof UserRoles]

// User status
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
} as const

export type UserStatus = typeof UserStatus[keyof typeof UserStatus]

// Base user interface
export interface User extends Timestamps, Auditable, Statusable {
  id: string
  email: string
  role: UserRole
  metadata: Metadata
}

// User profile interface
export interface UserProfile extends User {
  firstName?: string
  lastName?: string
  avatar?: string
  phoneNumber?: string
  timezone?: string
  language?: string
  preferences: UserPreferences
}

// User credentials
export interface UserCredentials {
  email: string
  password: string
}

// User session
export interface UserSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  metadata: Metadata
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
  emailNotifications: boolean
  language: string
  timezone: string
}

// User stats
export interface UserStats {
  totalSessions: number
  completedSessions: number
  averageRating: number
  lastActive: Date
}

// Database types
export type UserRow = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

// Type guards
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'role' in obj
  )
}

export function isUserProfile(obj: unknown): obj is UserProfile {
  return isUser(obj) && 'preferences' in obj
}

// Re-export common types
export type { Timestamps, Metadata, Auditable, Statusable }