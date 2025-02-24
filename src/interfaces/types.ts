// src/interfaces/types.ts
// src/interfaces/types.ts
export interface ChatSession {
  id: string
  userId: string
  createdAt: string // Keep as string since this is what Supabase returns
}
export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  sessionId: string
  createdAt: string  // Also changed to string for consistency
}
// in ../interfaces/types.ts
export interface ChatInterface {
  // interface properties
}

// src/interfaces/index.ts
export type * from '@/types'