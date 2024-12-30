// src/components/chat/ChatInterface.tsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import type { Message, ChatSession } from '@/interfaces/types'  // Add 'type' keyword
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { chatService } from '@/services/chat'
import { useAuth } from '@/hooks/useAuth'

export const ChatInterface: React.FC = () => {
  const { session } = useAuth()
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Array<Message>>([])
  const [isLoading, setIsLoading] = useState(false)

  // src/components/chat/ChatInterface.tsx
  useEffect(() => {
    if (session?.user) {
      setIsLoading(true)
      chatService.createSession(session.user.id)
        .then((newSession) => {
          // Direct assignment since we're keeping createdAt as string
          setCurrentSession(newSession)
        })
        .catch(error => {
          console.error('Failed to create session:', error)
          setError('Failed to create chat session')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [session])
  const [error, setError] = useState<string | null>(null)

  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentSession || !content.trim()) return

useEffect(() => {
  if (currentSession?.id) {
    chatService.getSessionMessages(currentSession.id)
      .then(setMessages)
      .catch(error => {
        console.error('Failed to load messages:', error)
        setError('Failed to load messages')
      })
  }
}, [currentSession])

    setIsLoading(true)
    try {
      await chatService.sendMessage({
        content,
        role: 'user',
        sessionId: currentSession.id
      })
    } catch (error) {
      console.error(`Failed to send message for session ${currentSession.id}:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [currentSession])

  const subscription = useMemo(() => {
    return supabase
      .channel('messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()
  }, [])

  useEffect(() => {
    return () => {
      subscription.unsubscribe()
    }
  }, [subscription])

return (
  <div className="flex flex-col h-screen bg-[#0A0A0B]">
    {error && (
      <div className="p-4 text-red-500 bg-red-100/10">
        {error}
      </div>
    )}
    <div className="flex-1 overflow-auto p-4">
      <MessageList messages={messages} />
    </div>
    <div className="border-t border-gray-700 p-4">
      <MessageInput onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  </div>
)
}