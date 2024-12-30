import React from 'react'
import { cn } from '@/lib/utils'
import { ChatSession } from '@/types/chat'

interface ChatHistoryProps {
  sessions: Array<ChatSession>
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
}) => {
  return (
    <div className="w-64 bg-gray-900 p-4 border-r border-gray-700">
      <h2 className="text-xl font-bold mb-4">Chat History</h2>
      <div className="space-y-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={cn(
              "w-full p-3 rounded-lg text-left",
              "hover:bg-gray-800 transition-colors",
              currentSessionId === session.id && "bg-blue-600"
            )}
          >
            {new Date(session.createdAt).toLocaleDateString()}
          </button>
        ))}
      </div>
    </div>
  )
}
