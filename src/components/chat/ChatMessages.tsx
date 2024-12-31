import React from 'react';
import { Message } from '../../types/chat';

interface ChatMessagesProps {
  messages: Array<Message>;
  currentUserId: string;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, currentUserId }) => {
  return (
    <div className="chat-messages">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`message ${message.sender === currentUserId ? 'user' : 'assistant'}`}
        >
          {message.content}
        </div>
      ))}
    </div>
  );
};
