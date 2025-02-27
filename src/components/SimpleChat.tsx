import React from 'react';
import { ChatInterface } from './chat/ChatInterface';

const SimpleChat = () => {
  return (
    <div className="h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Simple Chat</h1>
      <div className="h-[calc(100vh-8rem)] bg-white rounded-lg shadow-lg">
        <ChatInterface className="h-full" />
      </div>
    </div>
  );
};

export default SimpleChat; 