// src/utils/dateTransform.ts
import { ChatSession } from '@/interfaces/types'

export const transformSession = (session: ChatSession) => {
  return {
    id: session.id,
    userId: session.userId,
    createdAt: session.createdAt // Keep as string
  }
}