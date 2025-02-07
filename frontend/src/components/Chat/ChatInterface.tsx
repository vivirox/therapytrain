import React, { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  type: 'message' | 'status' | 'error' | 'ai_response';
  userId: string;
  content: string;
  timestamp: number;
  metadata?: {
    sentiment?: number;
    topics?: string[];
    followUpQuestions?: string[];
  };
}

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:5000'}/chat`;
  
  const { 
    sendMessage, 
    lastMessage,
    connectionStatus
  } = useWebSocket(wsUrl);

  // Handle incoming messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage.data) as Message;
        setMessages(prev => [...prev, message]);
        scrollToBottom();

        // Update participants if it's a status message
        if (message.type === 'status') {
          if (message.content === 'online') {
            setParticipants(prev => [...new Set([...prev, message.userId])]);
          } else if (message.content === 'offline') {
            setParticipants(prev => prev.filter(id => id !== message.userId));
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  }, [lastMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !user) return;

    const message = {
      type: 'message',
      content: inputValue,
      timestamp: Date.now(),
      userId: user.id
    };

    try {
      sendMessage(JSON.stringify(message));
      setInputValue('');
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="bg-primary p-4 text-white">
        <h2 className="text-xl font-semibold">Therapy Chat</h2>
        <div className="text-sm">
          {connectionStatus === 'Connected' ? (
            <span className="text-green-400">●</span>
          ) : (
            <span className="text-red-400">●</span>
          )} {connectionStatus}
        </div>
      </div>

      {/* Participants */}
      <div className="bg-secondary p-2 text-sm">
        <span className="font-semibold">Active: </span>
        {participants.map(id => (
          <span key={id} className="mx-1 px-2 py-1 bg-primary-light rounded">
            {id}
          </span>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={`flex flex-col ${
              message.userId === user?.id ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                message.type === 'ai_response'
                  ? 'bg-blue-100'
                  : message.userId === user?.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100'
              }`}
            >
              {message.type !== 'status' && (
                <div className="text-sm opacity-70 mb-1">
                  {message.userId === user?.id ? 'You' : message.userId}
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Follow-up questions */}
              {message.type === 'ai_response' && message.metadata?.followUpQuestions && (
                <div className="mt-2 space-y-1">
                  {message.metadata.followUpQuestions.map((question, qIndex) => (
                    <button
                      key={qIndex}
                      onClick={() => setInputValue(question)}
                      className="text-sm text-primary-dark hover:underline block text-left"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Topics */}
            {message.metadata?.topics && (
              <div className="flex gap-1 mt-1">
                {message.metadata.topics.map((topic, tIndex) => (
                  <span
                    key={tIndex}
                    className="text-xs bg-gray-200 rounded px-2 py-1"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e: unknown) => {
              setInputValue(e.target.value);
              setIsTyping(e.target.value.length > 0);
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg resize-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || !user}
            className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {isTyping && (
          <div className="text-xs text-gray-500 mt-1">
            Press Enter to send, Shift + Enter for new line
          </div>
        )}
      </div>
    </div>
  );
};
