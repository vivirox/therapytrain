interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  session_id: string;
}

interface ChatMessageProps {
  role: Message['role'];
  content: string;
  session_id: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  return (
    <div className={`p-4 rounded-lg ${
      role === 'assistant' 
        ? 'bg-gradient-radial from-gray-800 to-gray-900 ml-4' 
        : 'bg-gradient-conic from-blue-500 to-purple-500 mr-4'
    }`}>
      <p className="text-white">{content}</p>
    </div>
  );
};
import { useScrollToBottom } from '../hooks/useScrollToBottom';
import { useState, useEffect } from 'react';
import { updateSessionMetadata, analyzeSessionContent } from '../utils/sessionMetadata';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  session_id: string;
}

interface TherapyChatProps {
  session_id: string;
  messages: Array<Message>;
}

export const TherapyChat = ({ session_id, messages }: TherapyChatProps) => {
  useEffect(() => {
    const updateMetadata = async () => {
      const analyzedMetadata = analyzeSessionContent(messages);
      await updateSessionMetadata(session_id, analyzedMetadata);
    };
    
    updateMetadata();
  }, [messages, session_id]);

  return (
    <div className="bg-gradient-radial from-gray-800 to-gray-900">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          role={message.role}
          content={message.content}
          session_id={message.session_id}
        />
      ))}
    </div>
  );
};
export default TherapyChat;