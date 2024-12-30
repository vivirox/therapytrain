import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (content: string) => void
  isLoading?: boolean
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, isLoading }) => {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSend(message)
      setMessage('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className={cn(
          "flex-1 bg-gray-800 rounded-lg px-4 py-2",
          "focus:outline-none focus:ring-2 focus:ring-blue-500"
        )}
        placeholder="Type your message..."
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "bg-blue-600 px-4 py-2 rounded-lg",
          "hover:bg-blue-700 transition-colors",
          "disabled:opacity-50"
        )}
      >
        Send
      </button>
    </form>
  )
}
