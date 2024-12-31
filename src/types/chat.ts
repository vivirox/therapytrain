export interface Message {
  sender: string
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  session_id: string
}

export interface ChatSession {
  id: string
  userId: string
  createdAt: string
  lastMessageAt: string
}
