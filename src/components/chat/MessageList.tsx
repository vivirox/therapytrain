import React from 'react'
import { Message } from '@/types/chat'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: Array<Message>
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "p-4 rounded-lg",
            message.role === 'user' 
              ? "bg-blue-600 ml-auto max-w-[80%]" 
              : "bg-gray-700 mr-auto max-w-[80%]"
          )}
        >
          {message.content}
        </div>
      ))}
    </div>
  )
}
