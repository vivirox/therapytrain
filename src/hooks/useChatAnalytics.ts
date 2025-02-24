// src/hooks/useChatAnalytics.ts
import { useState, useEffect, useCallback } from 'react'
import type { Message, ChatSession } from '@/types'
import { supabase } from '@/lib/supabaseClient'

interface ChatAnalytics {
  messageCount: number
  averageResponseTime: number
  sentimentScore: number
  engagementScore: number
  interventionCount: number
}

interface AnalyticsFilter {
  startDate?: Date
  endDate?: Date
  userId?: string
  sessionId?: string
}

export function useChatAnalytics(sessionId: string) {
  const [analytics, setAnalytics] = useState<ChatAnalytics>({
    messageCount: 0,
    averageResponseTime: 0,
    sentimentScore: 0,
    engagementScore: 0,
    interventionCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAnalytics = useCallback(async (filter?: AnalyticsFilter) => {
    try {
      setLoading(true)
      setError(null)

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('sessionId', sessionId)
        .order('timestamp', { ascending: true })

      if (messagesError) throw messagesError

      // Calculate analytics
      const analytics = calculateAnalytics(messages)
      setAnalytics(analytics)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'))
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void fetchAnalytics()
  }, [fetchAnalytics])

  const trackMessage = useCallback(async (message: Message) => {
    try {
      const { error } = await supabase
        .from('analytics')
        .insert([{
          sessionId,
          messageId: message.id,
          type: 'message',
          metadata: {
            content: message.content,
            timestamp: message.timestamp,
            senderId: message.senderId
          }
        }])

      if (error) throw error
    } catch (err) {
      console.error('Failed to track message:', err)
    }
  }, [sessionId])

  const trackEvent = useCallback(async (eventType: string, metadata: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('analytics')
        .insert([{
          sessionId,
          type: eventType,
          metadata
        }])

      if (error) throw error
    } catch (err) {
      console.error('Failed to track event:', err)
    }
  }, [sessionId])

  return {
    analytics,
    loading,
    error,
    trackMessage,
    trackEvent,
    refresh: fetchAnalytics
  }
}

function calculateAnalytics(messages: Message[]): ChatAnalytics {
  const analytics: ChatAnalytics = {
    messageCount: messages.length,
    averageResponseTime: 0,
    sentimentScore: 0,
    engagementScore: 0,
    interventionCount: 0
  }

  if (messages.length === 0) return analytics

  // Calculate average response time
  let totalResponseTime = 0
  let responseCount = 0

  for (let i = 1; i < messages.length; i++) {
    const currentMessage = messages[i]
    const previousMessage = messages[i - 1]

    if (currentMessage.senderId !== previousMessage.senderId) {
      const responseTime = new Date(currentMessage.timestamp).getTime() - 
                          new Date(previousMessage.timestamp).getTime()
      totalResponseTime += responseTime
      responseCount++
    }
  }

  analytics.averageResponseTime = responseCount > 0 ? 
    totalResponseTime / responseCount : 0

  // Count interventions
  analytics.interventionCount = messages.filter(
    (msg: any) => msg.type === 'intervention'
  ).length

  // Calculate engagement score (simplified)
  const uniqueSenders = new Set(messages.map((msg: any) => msg.senderId)).size
  const messageFrequency = messages.length / 
    (new Date(messages[messages.length - 1].timestamp).getTime() - 
     new Date(messages[0].timestamp).getTime())
  
  analytics.engagementScore = (uniqueSenders * messageFrequency * 1000)

  return analytics
}
