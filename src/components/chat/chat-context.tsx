import { createContext, useContext, useEffect, useState } from 'react'
import { customModel } from 'ai'
import { DEFAULT_MODEL_NAME } from 'ai'

export const ChatContext = createContext({})

export function ChatProvider({ children, sessionId }) {
  const [messages, setMessages] = useState([])
  const aiModel = customModel(DEFAULT_MODEL_NAME)

  useEffect(() => {
    // Subscribe to real-time message updates
    const subscription = supabase
      .from('chat_messages')
      .on('INSERT', payload => {
        setMessages(current => [...current, payload.new])
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [sessionId])

  const value = {
    messages,
    aiModel,
    sessionId
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}
