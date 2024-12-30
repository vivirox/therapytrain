// src/hooks/useChatAnalytics.ts
import { useChat } from 'ai/react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function useChatAnalytics() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()
  const [analyticsData, setAnalyticsData] = useState({
    sessions: [{
      id: 'chat-sessions',
      value: 0,
      label: 'Active Sessions'
    }]
  })

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
      
      if (error) {
        console.error('Error fetching analytics:', error)
        return
      }

      if (data) {
        setAnalyticsData({
          sessions: [{
            id: 'chat-sessions',
            value: data.length,
            label: 'Active Sessions'
          }]
        })
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    analyticsData
  }
}