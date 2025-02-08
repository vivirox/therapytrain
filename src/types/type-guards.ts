import type {
  User,
  Session,
  Message,
  AuditLog,
  Client,
  ClientProfile,
  Intervention,
  Assessment,
  Appointment,
  Alert,
  Feedback,
  Resource,
  Setting,
} from './supabase'

export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'role' in obj
  )
}

export function isSession(obj: unknown): obj is Session {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'client_id' in obj &&
    'status' in obj
  )
}

export function isMessage(obj: unknown): obj is Message {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'session_id' in obj &&
    'sender_id' in obj &&
    'content' in obj &&
    'type' in obj
  )
}

export function isAuditLog(obj: unknown): obj is AuditLog {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'action' in obj &&
    'resource_type' in obj &&
    'resource_id' in obj
  )
}

export function isClient(obj: unknown): obj is Client {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'name' in obj &&
    'status' in obj
  )
}

export function isClientProfile(obj: unknown): obj is ClientProfile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'client_id' in obj &&
    'therapist_id' in obj &&
    'status' in obj
  )
}

export function isIntervention(obj: unknown): obj is Intervention {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'session_id' in obj &&
    'type' in obj &&
    'content' in obj &&
    'status' in obj
  )
}

export function isAssessment(obj: unknown): obj is Assessment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'client_id' in obj &&
    'type' in obj &&
    'status' in obj &&
    'data' in obj
  )
}

export function isAppointment(obj: unknown): obj is Appointment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'client_id' in obj &&
    'therapist_id' in obj &&
    'start_time' in obj &&
    'end_time' in obj &&
    'status' in obj
  )
}

export function isAlert(obj: unknown): obj is Alert {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'type' in obj &&
    'message' in obj &&
    'status' in obj
  )
}

export function isFeedback(obj: unknown): obj is Feedback {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'session_id' in obj &&
    'rating' in obj
  )
}

export function isResource(obj: unknown): obj is Resource {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'description' in obj &&
    'type' in obj
  )
}

export function isSetting(obj: unknown): obj is Setting {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'key' in obj &&
    'value' in obj
  )
} 