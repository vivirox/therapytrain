import React, { useState, useEffect } from 'react';
import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';
import { supabase } from '/home/vivi/therapytrain/lib/supabaseClient.ts';

interface Message {
  role: string
  session_id: string
  id: string
  content: string
  sender: string
  timestamp: string
}

export type { Message };

interface ChatContainerProps {
  therapistId: string;
  clientId: string;
}

import './ChatContainer.css'; // We'll create this file next
export function ChatContainer({ therapistId, clientId }: ChatContainerProps): JSX.Element {
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [, setGeneratingError] = useState<unknown>();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', clientId);

        if (error) throw error;

        const transformedMessages: Array<Message> = data.map((msg: any) => ({
          ...msg,
          role: msg.sender === clientId ? 'user' : 'assistant',
          session_id: clientId,
        }));
        setMessages(transformedMessages);
      } catch (err) {
        setGeneratingError(err);
      }
    };
    fetchMessages();
  }, [clientId]);

  const handleSendMessage = async (content: string) => {
    // Implement the logic to send a message
    setIsGenerating(true);
    // Add your message sending logic here
    setIsGenerating(false);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Therapy Session</h2>
        {isGenerating && <div className="loading-indicator">AI is typing...</div>}
      </div>

      <ChatMessages 
        messages={messages as Array<import("/home/vivi/therapytrain/src/types/chat").Message>}
        currentUserId={clientId}
      />

      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={isGenerating} 
      />
    </div>
  );
}