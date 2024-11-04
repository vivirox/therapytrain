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
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !apiKey) {
      toast({
        title: "Error",
        description: "Please enter a message and API key",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const newMessages = [
        ...messages,
        { role: 'user', content } as const
      ];
      
      setMessages(newMessages);

      // Call edge function with API key
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: newMessages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const responseData = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: responseData.content[0].text
      };

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
    <div className="flex h-screen">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onApiKeyChange={setApiKey}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <ChatHeader isSidebarOpen={isSidebarOpen} />
        
        <div className={`flex h-full flex-col ${messages.length === 0 ? 'items-center justify-center' : 'justify-between'} pt-[60px] pb-4`}>
          {messages.length === 0 ? (
            <div className="w-full max-w-3xl px-4 space-y-4">
              <div>
                <h1 className="mb-8 text-4xl font-semibold text-center">What can I help with?</h1>
                <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
              </div>
              <ActionButtons />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <div className="w-full max-w-3xl mx-auto px-4">
                  {messages.map((message, index) => (
                    <div 
                      key={index}
                      className="py-6"
                    >
                      <div className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md">
                              <path d="M9.3 21H6.3C5.2 21 4.1 20.5 3.4 19.7C2.7 18.9 2.3 17.8 2.4 16.7L3.1 9.30005C3.2 8.40005 3.5 7.50005 4 6.70005L7.5 1.90005C8.2 0.900049 9.3 0.300049 10.5 0.300049H13.5C14.7 0.300049 15.8 0.900049 16.5 1.90005L20 6.70005C20.5 7.50005 20.8 8.40005 20.9 9.30005L21.6 16.7C21.7 17.9 21.3 19 20.5 19.7C19.7 20.4 18.7 21 17.7 21H14.7C14.2 21 13.7 20.8 13.3 20.4L12 19.2L10.7 20.4C10.3 20.8 9.8 21 9.3 21Z" fill="currentColor"/>
                            </svg>
                          </div>
                        )}
                        <div className={`flex-1 space-y-2 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                          <div className={`${message.role === 'user' ? 'bg-gray-700/50 rounded-[20px] px-4 py-2 inline-block' : ''}`}>
                            {message.content}
                          </div>
                          {message.role === 'assistant' && (
                            <MessageActions content={message.content} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full max-w-3xl mx-auto px-4 py-2">
                <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
              </div>
              <div className="text-xs text-center text-gray-500 py-2">
                ChatGPT can make mistakes. Check important info.
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;