import { ChatSession, Message } from '@/interfaces/types'
import { createContext, useContext, ReactNode } from 'react'

interface ChatContextType {
  messages: Array<Message>
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
  currentSession: ChatSession | null
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  // Implementation of chat context provider
  const value = {
    messages: [],
    isLoading: false,
    sendMessage: async (content: string) => {},
    currentSession: null
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}
