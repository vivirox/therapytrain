import { supabase } from '@/integrations/supabase/client'
import { Message, ChatSession } from '@/types/chat'

export const chatService = {
  async createSession(userId: string): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        userId,
        lastMessageAt: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...message,
        createdAt: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getSessions(userId: string): Promise<Array<ChatSession>> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('userId', userId)
      .order('lastMessageAt', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getSessionMessages(sessionId: string): Promise<Array<Message>> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('sessionId', sessionId)
      .order('createdAt', { ascending: true })
    
    if (error) throw error
    return data
  }
}