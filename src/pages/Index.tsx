import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import ChatHeader from '@/components/ChatHeader';
import ChatInput from '@/components/ChatInput';
import MessageActions from '@/components/MessageActions';
import ActionButtons from '@/components/ActionButtons';
import { useToast } from '@/hooks/use-toast';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

  const handleSendMessage = async (content: string) => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Please enter your API key in the sidebar",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const newMessages = [
        ...messages,
        { role: 'user', content } as const
      ];
      
      setMessages(newMessages);

      // Insert user message
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          content,
          role: 'user'
        });

      if (insertError) throw insertError;

      // Get AI response
      const response = await supabase.functions.invoke('chat', {
        body: { 
          messages: newMessages,
          apiKey: apiKey
        }
      });

      if (response.error) throw response.error;

      const assistantMessage = {
        role: 'assistant' as const,
        content: response.data.content
      };

      // Insert assistant message
      const { error: assistantInsertError } = await supabase
        .from('chat_messages')
        .insert({
          content: assistantMessage.content,
          role: 'assistant'
        });

      if (assistantInsertError) throw assistantInsertError;

      setMessages([...newMessages, assistantMessage]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} setApiKey={setApiKey} />
      <ChatHeader />
      <div>
        {messages.map((message, index) => (
          <MessageActions key={index} message={message} />
        ))}
      </div>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      <ActionButtons />
    </div>
  );
};

export default Index;
