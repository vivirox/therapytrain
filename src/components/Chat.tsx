import React from 'react'
import { useChatAnalytics } from '../hooks/useChatAnalytics'
import { useScrollToBottom } from '../hooks/useScrollToBottom'

export const Chat = () => {
  const { messages, input, handleInputChange, handleSubmit } = useChatAnalytics()
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>()

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-8">
      <div ref={containerRef} className="max-w-2xl mx-auto space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`p-4 rounded-lg ${
            message.role === 'user' ? 'bg-gray-800' : 'bg-gray-700'
          }`}>
            {message.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mt-4">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="w-full p-4 bg-gray-800 rounded-lg text-white"
        />
      </form>
    </div>
  )
}