import React from 'react'
import { Message } from '../../types/chat'

interface ChatMessagesProps {
  messages: Message[]
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  return (
    <div className="flex flex-col space-y-4 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[70%] rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-white'
            }`}
          >
            {message.content}
          </div>
        </div>
      ))}
    </div>
  )
}
