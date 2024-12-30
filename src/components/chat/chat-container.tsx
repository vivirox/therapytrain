import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/badge';
import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';
import { Toast } from '../components/ui/toast';
import { supabase } from '../utils/supabaseClient';
import { customModel, DEFAULT_MODEL_NAME } from '../utils/ai-model';

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
}

export type { ChatMessage };

interface ChatContainerProps {
  therapistId: string;
  clientId: string;
}

export function ChatContainer({ therapistId, clientId }: ChatContainerProps): JSX.Element {
  const [messages, setMessages] = useState<Array<ChatMessage>>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingError, setGeneratingError] = useState<unknown>();

  // Fetch initial messages from Supabase API.
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', clientId);

        if (error) throw error;

        setMessages(data);
      } catch (err) {
        setGeneratingError(err);
      }
    };

    fetchMessages();
  }, [clientId]);

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <Badge>Active Chat</Badge>
        {isGenerating && <Badge variant="secondary">AI is typing...</Badge>}
      </div>
      
      <ChatMessages 
        messages={messages}
        currentUserId={clientId}
      />

      <MessageInput 
        onSendMessage={/* define and pass the handleSendMessage function */}
        disabled={isGenerating} 
      />
    </div>
  );
}