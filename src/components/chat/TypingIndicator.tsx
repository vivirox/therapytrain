import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 p-2">
      <div className="flex space-x-1">
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
      </div>
      <span className="text-sm text-gray-500">Someone is typing...</span>
    </div>
  );
}; 